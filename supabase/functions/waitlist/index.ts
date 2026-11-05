const defaultCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const allowedOrigins = new Set([
  "https://elliot5x.github.io",
  ...((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((origin) =>
    origin.trim()
  ).filter(Boolean)),
]);

let currentOrigin: string | null = null;

function corsHeaders(origin: string | null = currentOrigin) {
  if (!origin || !allowedOrigins.has(origin)) return defaultCorsHeaders;
  return { ...defaultCorsHeaders, "Access-Control-Allow-Origin": origin };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const adminPassword = Deno.env.get("ADMIN_PASSWORD") ?? "";
const adminSessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET") ?? "";
const emailFrom = Deno.env.get("WAITLIST_EMAIL_FROM") ??
  "PoorGuy <lista@poorguy.com.br>";
const publicSiteUrl =
  (Deno.env.get("PUBLIC_SITE_URL") ?? "https://elliot5x.github.io/PoorGuy")
    .replace(/\/$/, "");

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function shortHash(value: string) {
  return (await sha256(value)).slice(0, 12);
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(
    /\//g,
    "_",
  ).replace(/=+$/, "");
}

async function hmacSha256(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(value),
    ),
  );
}

function constantTimeEqual(a: string, b: string) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let different = aBytes.length ^ bBytes.length;
  for (let i = 0; i < Math.max(aBytes.length, bBytes.length); i++) {
    different |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return different === 0;
}

async function createAdminSession() {
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: Date.now() + 30 * 60_000 })),
  );
  const signature = toBase64Url(await hmacSha256(adminSessionSecret, payload));
  return `${payload}.${signature}`;
}

async function validAdminSession(token: string) {
  if (!token || !adminSessionSecret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")),
          (character) => character.charCodeAt(0),
        ),
      ),
    );
    const expected = toBase64Url(
      await hmacSha256(adminSessionSecret, parts[0]),
    );
    return constantTimeEqual(parts[1], expected) &&
      Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

async function createUnsubscribeToken(id: string) {
  const signature = toBase64Url(await hmacSha256(unsubscribeSecret, id));
  return `${encodeURIComponent(id)}.${signature}`;
}

function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim().slice(0, 64) : "unknown";
}

async function consumeRateLimit(scope: string, value: string, req: Request) {
  if (!value) return true;
  const scopeHash = await shortHash(`${scope}:${value}`);
  const now = Date.now();
  const hour = new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString();
  const rows = await db(
    `waitlist_rate_limits?scope=eq.${scope}&scope_hash=eq.${scopeHash}&select=window_started_at,attempts`,
  );
  const current = rows[0];
  if (!current || current.window_started_at !== hour) {
    const method = current ? "PATCH" : "POST";
    const path = current
      ? `waitlist_rate_limits?scope=eq.${scope}&scope_hash=eq.${scopeHash}`
      : "waitlist_rate_limits";
    await db(path, {
      method,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        scope,
        scope_hash: scopeHash,
        window_started_at: hour,
        attempts: 1,
        updated_at: new Date(now).toISOString(),
      }),
    });
    console.log(
      JSON.stringify({ event: "rate_limit_recorded", scope, id: scopeHash }),
    );
    return true;
  }
  const maximum = scope === "ip" ? 20 : 5;
  if (current.attempts >= maximum) return false;
  await db(
    `waitlist_rate_limits?scope=eq.${scope}&scope_hash=eq.${scopeHash}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        attempts: current.attempts + 1,
        updated_at: new Date(now).toISOString(),
      }),
    },
  );
  return true;
}

function normalEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function db(path: string, options: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: "Bearer " + serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "return=representation" : "",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [to],
      subject,
      html,
      text,
      headers: extraHeaders,
    }),
  });
  if (!response.ok) throw new Error("email_send_failed");
}

async function sendConfirmation(
  email: string,
  token: string,
  unsubscribeToken: string,
  subscriberId: string,
) {
  const confirmUrl = `${publicSiteUrl}/pages/waitlist-confirmacao.html?token=${
    encodeURIComponent(token)
  }`;
  const hmacUnsubscribeToken = await createUnsubscribeToken(subscriberId);
  const unsubscribeLink = unsubscribeUrl(hmacUnsubscribeToken);
  const safeConfirmUrl = escapeHtml(confirmUrl);
  const safeUnsubscribeLink = escapeHtml(unsubscribeLink);
  const text = [
    "Olá!",
    "",
    "Recebemos seu interesse em participar da lista de espera do PoorGuy.",
    `Confirme seu e-mail: ${confirmUrl}`,
    "",
    "O PoorGuy está em pré-lançamento. Nenhum apoio ou pagamento é garantido.",
    "Se não foi você, ignore esta mensagem.",
    `Descadastrar meu e-mail: ${unsubscribeLink}`,
    `Contato: ${publicSiteUrl}/pages/legal/contato.html`,
  ].join("\n");
  await sendEmail(
    email,
    "Confirme seu cadastro na lista de espera do PoorGuy",
    `
    <div style="font-family:Arial,sans-serif;color:#252A2D;max-width:560px;margin:auto">
      <h1 style="color:#183B56">Confirme seu cadastro</h1>
      <p>Recebemos seu interesse em participar da lista de espera do PoorGuy.</p>
      <p>Obrigado por acompanhar o PoorGuy enquanto preparamos o pré-lançamento.</p>
      <p><a href="${safeConfirmUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#D8A84E;color:#252A2D;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p>
      <p style="font-size:13px;color:#667085">Se não foi você, ignore este e-mail.</p>
      <p style="font-size:13px;color:#667085">O PoorGuy está em pré-lançamento. Nenhum apoio ou pagamento é garantido.</p>
      <p style="font-size:12px;color:#667085"><a href="${safeUnsubscribeLink}">Descadastrar meu e-mail</a> · <a href="${
      escapeHtml(`${publicSiteUrl}/pages/legal/contato.html`)
    }">Contato</a></p>
    </div>
  `,
    text,
  );
}

function unsubscribeUrl(token: string) {
  return `${publicSiteUrl}/pages/waitlist-descadastro.html?token=${
    encodeURIComponent(token)
  }`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

const neutralSubscriptionResponse = {
  ok: true,
  message:
    "Enviamos um e-mail de confirmação quando este cadastro puder receber confirmações.",
};

async function subscribe(payload: any, req: Request) {
  if (
    !payload || typeof payload !== "object" ||
    JSON.stringify(payload).length > 16_384
  ) {
    return json({ error: "invalid_request" }, 400);
  }
  if (typeof payload.hp === "string" && payload.hp.length > 200) {
    return json({ error: "invalid_request" }, 400);
  }
  if (payload.hp) return json({ error: "invalid_request" }, 400);
  if (payload.consent !== true) {
    return json({ error: "consent_required" }, 400);
  }
  const email = normalEmail(payload.email);
  const interest = payload.interest;
  if (
    !validEmail(email) ||
    !["request_support", "support_others"].includes(interest)
  ) {
    return json({ error: "invalid_request" }, 400);
  }
  const ip = requestIp(req);
  if (
    !await consumeRateLimit("ip", ip, req) ||
    !await consumeRateLimit("email", email, req)
  ) {
    return json(neutralSubscriptionResponse);
  }
  const existing = await db(
    `waitlist_subscribers?email_normalized=eq.${
      encodeURIComponent(email)
    }&select=id,confirmed_at,unsubscribed_at,deleted_at,confirmation_requested_at,confirmation_sent_at`,
  );
  if (existing.length && existing[0].deleted_at) {
    return json(neutralSubscriptionResponse);
  }
  if (existing.length && existing[0].confirmed_at) {
    console.log(
      JSON.stringify({
        event: "subscribe_confirmed",
        id: await shortHash(email),
      }),
    );
    return json(neutralSubscriptionResponse);
  }
  if (existing.length && existing[0].confirmation_sent_at) {
    const sentAt = Date.parse(existing[0].confirmation_sent_at);
    if (Date.now() - sentAt < 15 * 60_000) {
      return json(neutralSubscriptionResponse);
    }
  }
  const token = randomToken();
  const tokenHash = await sha256(token);
  const unsubscribeToken = randomToken();
  const unsubscribeTokenHash = await sha256(unsubscribeToken);
  const now = new Date().toISOString();
  let subscriber;
  if (existing.length) {
    subscriber = await db(`waitlist_subscribers?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        interest,
        confirmation_token_hash: tokenHash,
        unsubscribe_token_hash: unsubscribeTokenHash,
        confirmation_requested_at: now,
        confirmation_sent_at: now,
        confirmation_expires_at: new Date(Date.now() + 24 * 60 * 60_000)
          .toISOString(),
        confirmed_at: null,
        unsubscribed_at: null,
        updated_at: now,
      }),
    });
  } else {
    subscriber = await db("waitlist_subscribers", {
      method: "POST",
      body: JSON.stringify({
        email,
        email_normalized: email,
        interest,
        consent_at: now,
        consent_version: "2026-11-04",
        confirmation_token_hash: tokenHash,
        unsubscribe_token_hash: unsubscribeTokenHash,
        confirmation_requested_at: now,
        confirmation_sent_at: now,
        confirmation_expires_at: new Date(Date.now() + 24 * 60 * 60_000)
          .toISOString(),
      }),
    });
  }
  await sendConfirmation(
    email,
    token,
    unsubscribeToken,
    subscriber[0]?.id ?? existing[0]?.id,
  );
  console.log(
    JSON.stringify({
      event: existing.length ? "confirmation_resent" : "subscription_created",
      id: await shortHash(email),
    }),
  );
  return json(neutralSubscriptionResponse);
}

async function verify(token: string) {
  if (!token || token.length !== 64) {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  const tokenHash = await sha256(token);
  const rows = await db(
    `waitlist_subscribers?confirmation_token_hash=eq.${tokenHash}&select=id,deleted_at,unsubscribed_at,confirmation_expires_at`,
  );
  if (!rows.length || rows[0].deleted_at || rows[0].unsubscribed_at) {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  if (
    !rows[0].confirmation_expires_at ||
    Date.parse(rows[0].confirmation_expires_at) <= Date.now()
  ) {
    return json({ ok: false, error: "expired_token" }, 400);
  }
  await db(`waitlist_subscribers?id=eq.${rows[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({
      confirmed_at: new Date().toISOString(),
      confirmation_token_hash: null,
      updated_at: new Date().toISOString(),
    }),
  });
  return json({ ok: true });
}

async function unsubscribe(token: string) {
  if (!token) return json({ ok: false, error: "invalid_token" }, 400);
  const parts = token.split(".");
  if (parts.length !== 2 || !unsubscribeSecret) {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  let id: string;
  try {
    id = decodeURIComponent(parts[0]);
  } catch {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  const expected = toBase64Url(await hmacSha256(unsubscribeSecret, id));
  if (!constantTimeEqual(parts[1], expected)) {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  const rows = await db(
    `waitlist_subscribers?id=eq.${encodeURIComponent(id)}&select=id`,
  );
  if (!rows.length) return json({ ok: false, error: "invalid_token" }, 400);
  await db(`waitlist_subscribers?id=eq.${rows[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return json({ ok: true });
}

async function isAdmin(req: Request) {
  return await validAdminSession(req.headers.get("x-admin-token") ?? "");
}

async function adminLogin(req: Request) {
  const ipHash = await shortHash(requestIp(req));
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const ipFailures = await db(
    `waitlist_admin_attempts?ip_hash=eq.${ipHash}&attempted_at=gte.${
      encodeURIComponent(since)
    }&select=id`,
  );
  const globalFailures = await db(
    `waitlist_admin_attempts?global_key=eq.global&attempted_at=gte.${
      encodeURIComponent(since)
    }&select=id`,
  );
  if (ipFailures.length >= 10 || globalFailures.length >= 30) {
    return json({ error: "temporarily_unavailable" }, 429);
  }
  const payload = await req.json();
  const supplied = String(payload.password ?? "");
  const suppliedHash = toBase64Url(
    await hmacSha256("admin-password-check", supplied),
  );
  const expectedHash = toBase64Url(
    await hmacSha256("admin-password-check", adminPassword),
  );
  if (!adminPassword || !constantTimeEqual(suppliedHash, expectedHash)) {
    await db("waitlist_admin_attempts", {
      method: "POST",
      body: JSON.stringify({ ip_hash: ipHash, global_key: "global" }),
    });
    return json({ error: "unauthorized" }, 401);
  }
  return json({ token: await createAdminSession() });
}

Deno.serve(async (req) => {
  currentOrigin = req.headers.get("origin");
  if (
    currentOrigin && currentOrigin !== "null" &&
    !allowedOrigins.has(currentOrigin)
  ) {
    return json({ error: "origin_not_allowed" }, 403);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  const url = new URL(req.url);
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }
  const action = url.searchParams.get("action");
  try {
    if (req.method === "POST" && action === "subscribe") {
      const contentLength = Number(req.headers.get("content-length") ?? 0);
      if (
        contentLength > 16_384 ||
        req.headers.get("content-type")?.split(";")[0] !== "application/json"
      ) {
        return json({ error: "invalid_request" }, 400);
      }
      const rawBody = await req.text();
      if (new TextEncoder().encode(rawBody).length > 16_384) {
        return json({ error: "invalid_request" }, 400);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return json({ error: "invalid_request" }, 400);
      }
      return subscribe(payload, req);
    }
    if (req.method === "POST" && action === "verify") {
      const payload = await req.json();
      return verify(String(payload.token ?? ""));
    }
    if (req.method === "POST" && action === "unsubscribe") {
      const payload = await req.json();
      return unsubscribe(String(payload.token ?? ""));
    }
    if (req.method === "POST" && action === "admin-login") {
      return adminLogin(req);
    }
    if (!await isAdmin(req)) return json({ error: "unauthorized" }, 401);
    if (action === "admin-list") {
      const search = url.searchParams.get("search") ?? "";
      const status = url.searchParams.get("status") ?? "";
      const interest = url.searchParams.get("interest") ?? "";
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
      const limit = 25;
      let query =
        "waitlist_subscribers?deleted_at=is.null&order=created_at.desc";
      query += `&limit=${limit}&offset=${(page - 1) * limit}`;
      if (search) query += `&email=ilike.*${encodeURIComponent(search)}*`;
      if (interest) query += `&interest=eq.${encodeURIComponent(interest)}`;
      if (status === "confirmed") {
        query += "&confirmed_at=not.is.null&unsubscribed_at=is.null";
      }
      if (status === "pending") {
        query += "&confirmed_at=is.null&unsubscribed_at=is.null";
      }
      if (status === "unsubscribed") query += "&unsubscribed_at=not.is.null";
      const rows = await db(
        query +
          "&select=id,email,interest,confirmed_at,unsubscribed_at,created_at",
      );
      const all = await db(
        "waitlist_subscribers?deleted_at=is.null&select=id,email,interest,confirmed_at,unsubscribed_at",
      );
      const counts = {
        total: all.length,
        confirmed: all.filter((row: any) =>
          row.confirmed_at && !row.unsubscribed_at
        ).length,
        pending: all.filter((row: any) =>
          !row.confirmed_at && !row.unsubscribed_at
        ).length,
        unsubscribed: all.filter((row: any) => row.unsubscribed_at).length,
        support: all.filter((row: any) =>
          row.interest === "request_support"
        ).length,
        supporter: all.filter((row: any) =>
          row.interest === "support_others"
        ).length,
      };
      return json({ subscribers: rows, counts, page, pageSize: limit });
    }
    if (action === "admin-send") {
      const payload = await req.json();
      const subject = String(payload.subject ?? "").trim();
      const body = String(payload.body ?? "").trim();
      if (!subject || !body || subject.length > 200 || body.length > 10000) {
        return json({ error: "invalid_content" }, 400);
      }
      const subscribers = await db(
        "waitlist_subscribers?confirmed_at=not.is.null&unsubscribed_at=is.null&deleted_at=is.null&select=id,email",
      );
      let sentCount = 0;
      let failedCount = 0;
      for (const subscriber of subscribers) {
        const token = await createUnsubscribeToken(subscriber.id);
        const unsubscribeLink = unsubscribeUrl(token);
        try {
          await sendEmail(
            subscriber.email,
            subject,
            `${
              escapeHtml(body).replace(/\n/g, "<br>")
            }<p style="font-size:12px"><a href="${unsubscribeLink}">Descadastrar meu e-mail</a></p>`,
            `${body}\n\nDescadastrar meu e-mail: ${unsubscribeLink}`,
            {
              "List-Unsubscribe": `<${unsubscribeLink}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          );
          sentCount++;
        } catch {
          failedCount++;
          console.log(
            JSON.stringify({
              event: "campaign_send_failed",
              id: await shortHash(subscriber.id),
            }),
          );
        }
        if ((sentCount + failedCount) % 40 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      await db("waitlist_campaigns", {
        method: "POST",
        body: JSON.stringify({
          subject,
          body,
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
        }),
      });
      await db("waitlist_sends", {
        method: "POST",
        body: JSON.stringify({
          template_id: null,
          completed_at: new Date().toISOString(),
          total_count: subscribers.length,
          success_count: sentCount,
          failure_count: failedCount,
        }),
      });
      return json({ total: subscribers.length, sentCount, failedCount });
    }
    if (action === "admin-send-test") {
      const payload = await req.json();
      const to = String(payload.to ?? "").trim().toLowerCase();
      const subject = String(payload.subject ?? "").slice(0, 200);
      const body = String(payload.body ?? "").slice(0, 10000);
      if (!validEmail(to) || !subject || !body) {
        return json({ error: "invalid_content" }, 400);
      }
      await sendEmail(
        to,
        `[TESTE] ${subject}`,
        `${
          escapeHtml(body).replace(/\n/g, "<br>")
        }<p><a href="${publicSiteUrl}/pages/waitlist-descadastro.html">Descadastrar meu e-mail</a></p>`,
        `${body}\n\nO link de descadastro será personalizado no envio real.`,
      );
      return json({ ok: true });
    }
    if (action === "admin-export") {
      const status = url.searchParams.get("status") ?? "confirmed";
      const interest = url.searchParams.get("interest") ?? "";
      let query =
        "waitlist_subscribers?deleted_at=is.null&select=email,interest,confirmed_at,unsubscribed_at,created_at";
      query += status === "confirmed"
        ? "&confirmed_at=not.is.null&unsubscribed_at=is.null"
        : "";
      if (interest) query += `&interest=eq.${encodeURIComponent(interest)}`;
      const rows = await db(query);
      const safeCell = (value: unknown) => {
        let text = String(value ?? "");
        if (/^[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const csv = [
        "E-mail,Interesse,Confirmado,Descadastrado,Cadastro",
        ...rows.map((row: any) =>
          [
            safeCell(row.email),
            safeCell(row.interest),
            safeCell(row.confirmed_at),
            safeCell(row.unsubscribed_at),
            safeCell(row.created_at),
          ].join(",")
        ),
      ].join("\n");
      return new Response(csv, {
        headers: {
          ...corsHeaders(),
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }
    if (action?.startsWith("admin-template")) {
      if (req.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405);
      }
      const payload = await req.json();
      const sanitizable = String(payload.html_body ?? "")
        .replace(
          /<\s*(script|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
          "",
        )
        .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      if (action === "admin-template-list") {
        return json({
          templates: await db(
            "waitlist_templates?order=created_at.asc&select=id,name,subject,html_body,text_body,created_at",
          ),
        });
      }
      if (action === "admin-template-save") {
        if (
          !String(payload.name ?? "").trim() ||
          !String(payload.subject ?? "").trim()
        ) {
          return json({ error: "invalid_content" }, 400);
        }
        const body = {
          name: String(payload.name).slice(0, 100),
          subject: String(payload.subject).slice(0, 200),
          html_body: sanitizable.slice(0, 30000),
          text_body: String(payload.text_body ?? "").slice(0, 30000),
          updated_at: new Date().toISOString(),
        };
        const path = payload.id
          ? `waitlist_templates?id=eq.${encodeURIComponent(payload.id)}`
          : "waitlist_templates";
        const templates = await db(path, {
          method: payload.id ? "PATCH" : "POST",
          body: JSON.stringify(body),
        });
        return json({ template: templates?.[0] ?? { ...body } });
      }
      if (action === "admin-template-delete" && payload.id) {
        await db(`waitlist_templates?id=eq.${encodeURIComponent(payload.id)}`, {
          method: "DELETE",
        });
        return json({ ok: true });
      }
    }
    if (action === "admin-delete") {
      const id = String((await req.json()).id ?? "");
      if (!id) return json({ error: "invalid_request" }, 400);
      const anonymizedEmail = `excluido-${randomToken()}@invalid.local`;
      await db(`waitlist_subscribers?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          email: anonymizedEmail,
          email_normalized: anonymizedEmail,
          deleted_at: new Date().toISOString(),
          unsubscribed_at: new Date().toISOString(),
          confirmation_token_hash: null,
          unsubscribe_token_hash: null,
          updated_at: new Date().toISOString(),
        }),
      });
      await db("waitlist_admin_events", {
        method: "POST",
        body: JSON.stringify({
          event_type: "subscriber_deleted",
          subscriber_id: id,
        }),
      });
      return json({ ok: true });
    }
    return json({ error: "not_found" }, 404);
  } catch {
    return json({ error: "internal_error" }, 500);
  }
});
