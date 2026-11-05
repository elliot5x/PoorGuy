const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const adminPassword = Deno.env.get("ADMIN_PASSWORD") ?? "";
const adminToken = Deno.env.get("ADMIN_TOKEN") ?? "";
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

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: emailFrom, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error("email_send_failed");
}

async function sendConfirmation(
  email: string,
  token: string,
  unsubscribeToken: string,
) {
  const confirmUrl = `${publicSiteUrl}/pages/waitlist-confirmacao.html?token=${
    encodeURIComponent(token)
  }`;
  const unsubscribeLink = unsubscribeUrl(unsubscribeToken);
  await sendEmail(
    email,
    "Confirme seu cadastro na lista de espera do PoorGuy",
    `
    <div style="font-family:Arial,sans-serif;color:#252A2D;max-width:560px;margin:auto">
      <h1 style="color:#183B56">Confirme seu cadastro</h1>
      <p>Recebemos seu interesse em participar da lista de espera do PoorGuy.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#D8A84E;color:#252A2D;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p>
      <p style="font-size:13px;color:#667085">Se não foi você, ignore este e-mail.</p>
      <p style="font-size:12px;color:#667085"><a href="${unsubscribeLink}">Descadastrar meu e-mail</a></p>
    </div>
  `,
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

async function subscribe(payload: any) {
  if (payload.website) return json({ error: "invalid_request" }, 400);
  if (payload.consent !== true || payload.consentVersion !== "2026-11-04") {
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
  const existing = await db(
    `waitlist_subscribers?email_normalized=eq.${
      encodeURIComponent(email)
    }&select=id,confirmed_at,unsubscribed_at,deleted_at`,
  );
  if (existing.length && existing[0].deleted_at) {
    return json({ error: "inactive_subscription" }, 400);
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
      }),
    });
  }
  await sendConfirmation(email, token, unsubscribeToken);
  return json({ ok: true, subscriberId: subscriber[0]?.id ?? existing[0]?.id });
}

async function verify(token: string) {
  if (!token || token.length !== 64) {
    return json({ ok: false, error: "invalid_token" }, 400);
  }
  const tokenHash = await sha256(token);
  const rows = await db(
    `waitlist_subscribers?confirmation_token_hash=eq.${tokenHash}&select=id,deleted_at,unsubscribed_at`,
  );
  if (!rows.length || rows[0].deleted_at || rows[0].unsubscribed_at) {
    return json({ ok: false, error: "invalid_token" }, 400);
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
  const tokenHash = await sha256(token);
  const rows = await db(
    `waitlist_subscribers?unsubscribe_token_hash=eq.${tokenHash}&select=id`,
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

function isAdmin(req: Request) {
  return req.headers.get("x-admin-token") === adminToken &&
    adminToken.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const url = new URL(req.url);
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }
  const action = url.searchParams.get("action");
  try {
    if (req.method === "POST" && action === "subscribe") {
      return subscribe(await req.json());
    }
    if (req.method === "GET" && action === "verify") {
      return verify(url.searchParams.get("token") ?? "");
    }
    if (req.method === "GET" && action === "unsubscribe") {
      return unsubscribe(url.searchParams.get("token") ?? "");
    }
    if (req.method === "POST" && action === "admin-login") {
      const password = String((await req.json()).password ?? "");
      if (!adminPassword || password !== adminPassword) {
        return json({ error: "unauthorized" }, 401);
      }
      return json({ token: adminToken });
    }
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    if (action === "admin-list") {
      const rows = await db(
        "waitlist_subscribers?deleted_at=is.null&order=created_at.desc&select=id,email,interest,consent_at,confirmed_at,unsubscribed_at,created_at",
      );
      return json({ subscribers: rows });
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
      for (const subscriber of subscribers) {
        const token = randomToken();
        const tokenHash = await sha256(token);
        await db(`waitlist_subscribers?id=eq.${subscriber.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            unsubscribe_token_hash: tokenHash,
            updated_at: new Date().toISOString(),
          }),
        });
        await sendEmail(
          subscriber.email,
          subject,
          `${
            escapeHtml(body).replace(/\n/g, "<br>")
          }<p style="font-size:12px"><a href="${
            unsubscribeUrl(token)
          }">Descadastrar meu e-mail</a></p>`,
        );
        sentCount++;
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
      return json({ sentCount });
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
      return json({ ok: true });
    }
    return json({ error: "not_found" }, 404);
  } catch {
    return json({ error: "internal_error" }, 500);
  }
});
