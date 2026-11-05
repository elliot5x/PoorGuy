const ENDPOINT = window.PoorGuyWaitlistConfig?.endpoint ?? "";
let adminToken = sessionStorage.getItem("poorguy_admin_session") ?? "";
let currentPage = 1;

const loginForm = document.querySelector(".admin-login");
const loginStatus = document.querySelector(".admin-login-status");
const dashboard = document.querySelector(".admin-dashboard");
const tableBody = document.querySelector(".admin-table-wrap tbody");
const stats = document.querySelector(".admin-stats");
const pagination = document.querySelector(".admin-pagination span");
let broadcastEnabled = false;

function applyBroadcastStatus(enabled) {
    broadcastEnabled = enabled;
    const warning = document.querySelector(".admin-broadcast-status");
    const sendButtons = campaignForm?.querySelectorAll('[data-broadcast-action="send"]') ?? [];
    sendButtons.forEach(button => {
        button.disabled = !enabled;
        button.hidden = !enabled;
    });
    if (warning) warning.hidden = enabled;
}

async function adminRequest(action, options = {}) {
    const separator = ENDPOINT.includes("?") ? "&" : "?";
    const response = await fetch(`${ENDPOINT}${separator}action=${encodeURIComponent(action)}`, {
        method: options.method ?? "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "x-admin-token": adminToken, ...(options.headers ?? {}) },
        body: options.body
    });
    if (!response.ok) throw new Error("unauthorized_or_unavailable");
    return action === "admin-export" ? response.text() : response.json();
}

function formatDate(value) {
    return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";
}

function subscriberStatus(row) {
    if (row.unsubscribed_at) return "Descadastrado";
    return row.confirmed_at ? "Confirmado" : "Pendente";
}

async function loadSubscribers() {
    const search = document.querySelector('[name="search"]')?.value ?? "";
    const status = document.querySelector('[name="status"]')?.value ?? "";
    const interest = document.querySelector('[name="interest"]')?.value ?? "";
    const data = await adminRequest(`admin-list&search=${encodeURIComponent(search)}&status=${status}&interest=${interest}&page=${currentPage}`);
    tableBody.replaceChildren();
    data.subscribers.forEach(row => {
        const tr = document.createElement("tr");
        [
            row.email,
            row.interest === "request_support" ? "Pedir apoio" : "Ajudar alguém",
            subscriberStatus(row),
            formatDate(row.created_at),
            formatDate(row.confirmed_at)
        ].forEach(value => {
            const td = document.createElement("td");
            td.textContent = value;
            tr.append(td);
        });
        document.querySelector(".admin-table-empty").hidden = data.subscribers.length !== 0;
        const actions = document.createElement("td");
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.deleteId = row.id;
        remove.textContent = "Excluir definitivamente";
        actions.append(remove);
        tr.append(actions);
        tableBody.append(tr);
    });
    stats.textContent = `Total: ${data.counts.total} | Confirmados: ${data.counts.confirmed} | Pendentes: ${data.counts.pending} | Descadastrados: ${data.counts.unsubscribed} | Pedir apoio: ${data.counts.support} | Ajudar alguém: ${data.counts.supporter}`;
    pagination.textContent = `Página ${currentPage}`;
    const liveUpdated = document.querySelector("[data-live-updated]");
    if (liveUpdated) liveUpdated.textContent = `· atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

async function loadTemplates() {
    const data = await adminRequest("admin-template-list", { body: "{}" });
    const container = document.querySelector(".template-list");
    container.replaceChildren();
    data.templates.forEach(template => {
        const item = document.createElement("article");
        const name = document.createElement("strong");
        name.textContent = template.name;
        const use = document.createElement("button");
        use.type = "button";
        use.textContent = "Usar";
        use.addEventListener("click", () => {
            document.querySelector('[name="subject"]').value = template.subject;
            document.querySelector('[name="body"]').value = template.text_body;
            campaignForm.dataset.templateId = template.id;
        });
        const duplicate = document.createElement("button");
        duplicate.type = "button";
        duplicate.textContent = "Duplicar";
        duplicate.addEventListener("click", () => adminRequest("admin-template-save", { body: JSON.stringify({ name: `${template.name} (cópia)`, subject: template.subject, html_body: template.html_body, text_body: template.text_body }) }));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Excluir";
        remove.addEventListener("click", () => {
            if (window.confirm("Excluir este modelo?")) adminRequest("admin-template-delete", { body: JSON.stringify({ id: template.id }) }).then(loadTemplates);
        });
        item.append(name, use, duplicate, remove);
        container.append(item);
    });
}

async function loadStatus() {
    const status = await adminRequest("status");
    applyBroadcastStatus(status.broadcastEnabled === true);
}

loginForm.addEventListener("submit", async event => {
    event.preventEvent?.();
    event.preventDefault();
    loginStatus.textContent = "Verificando...";
    let response;
    try {
        response = await fetch(`${ENDPOINT}?action=admin-login`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.querySelector("#admin-username").value,
                password: document.querySelector("#admin-password").value
            })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        adminToken = data.token;
        sessionStorage.setItem("poorguy_admin_session", adminToken);
        loginForm.hidden = true;
        dashboard.hidden = false;
        await loadSubscribers();
        await loadTemplates();
        await loadStatus();
    } catch (error) {
        loginStatus.textContent = response?.status === 401
            ? "Usuário ou senha incorretos."
            : "Não foi possível acessar. Verifique usuário, senha, implantação e acesso à página.";
    }
});

document.querySelector('[data-admin-action="logout"]').addEventListener("click", () => {
    adminRequest("admin-logout", { body: "{}" }).catch(() => {}).finally(() => {
    sessionStorage.removeItem("poorguy_admin_session");
    adminToken = "";
    dashboard.hidden = true;
    loginForm.hidden = false;
    loginForm.reset();
    });
});

document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", async () => {
        const pane = button.dataset.adminTab;
        document.querySelectorAll("[data-admin-pane]").forEach(section => {
            section.hidden = section.dataset.adminPane !== pane;
        });
        if (pane === "activity") await loadActivity();
    });
});

async function loadActivity() {
    const status = document.querySelector(".admin-events-status");
    status.textContent = "Carregando...";
    try {
        const data = await adminRequest("admin-events");
        const body = document.querySelector(".admin-events-wrap tbody");
        body.replaceChildren();
        data.events.forEach(event => {
            const tr = document.createElement("tr");
            [
                formatDate(event.created_at),
                event.event_type,
                event.result,
                JSON.stringify(event.metadata ?? {})
            ].forEach(value => {
                const td = document.createElement("td");
                td.textContent = String(value ?? "-");
                tr.append(td);
            });
            body.append(tr);
        });
        status.textContent = "";
    } catch {
        status.textContent = "Não foi possível carregar a atividade.";
    }
}

document.addEventListener("click", async event => {
    const action = event.target.closest("[data-admin-action]")?.dataset.adminAction;
    if (action === "refresh" || action === "filter") {
        currentPage = 1;
        await loadSubscribers();
    }
    if (action === "previous") {
        currentPage = Math.max(1, currentPage - 1);
        await loadSubscribers();
    }
    if (action === "next") {
        currentPage++;
        await loadSubscribers();
    }
    if (action === "preview") {
        const data = new FormData(campaignForm);
        window.alert(`${data.get("subject")}\n\n${data.get("body")}`);
    }
    if (action === "send-test") {
        if (!broadcastEnabled) return;
        const data = new FormData(campaignForm);
        await adminRequest("admin-send-test", { body: JSON.stringify({ to: data.get("test_email"), subject: data.get("subject"), body: data.get("body"), template_id: campaignForm.dataset.templateId ?? null }) });
        campaignForm.querySelector(".admin-campaign-status").textContent = "E-mail de teste enviado.";
    }
    if (action === "export") {
        const status = document.querySelector('[name="status"]').value || "confirmed";
        const interest = document.querySelector('[name="interest"]').value;
        const csv = await adminRequest(`admin-export&status=${status}&interest=${encodeURIComponent(interest)}`);
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "poorguy-inscritos.csv";
        link.click();
        URL.revokeObjectURL(url);
    }
});

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button || !window.confirm("Excluir definitivamente este cadastro solicitado? Esta ação não pode ser desfeita.")) return;
    await adminRequest("admin-delete", { body: JSON.stringify({ id: button.dataset.deleteId }) });
    await loadSubscribers();
});

const campaignForm = document.querySelector(".admin-campaign");
campaignForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!broadcastEnabled) return;
    const phrase = window.prompt("Para enviar para todos, digite ENVIAR.");
    if (phrase !== "ENVIAR" || !window.confirm("Enviar para N pessoas? Não dá para desfazer.")) return;
    const data = new FormData(campaignForm);
    const result = await adminRequest("admin-send", {
        body: JSON.stringify({ subject: data.get("subject"), body: data.get("body"), confirmed: true, template_id: campaignForm.dataset.templateId ?? null })
    });
    campaignForm.querySelector(".admin-campaign-status").textContent = `${result.total} destinatários: ${result.sentCount} enviados, ${result.failedCount} falhas.`;
});

if (adminToken) {
    loginForm.hidden = true;
    dashboard.hidden = false;
    loadSubscribers().catch(() => {
        sessionStorage.removeItem("poorguy_admin_session");
        adminToken = "";
        dashboard.hidden = true;
        loginForm.hidden = false;
    });
    loadTemplates().catch(() => {});
    loadStatus().catch(() => {});
}

setInterval(() => {
    if (adminToken && !dashboard.hidden) loadSubscribers().catch(() => {});
}, 15_000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && adminToken && !dashboard.hidden) loadSubscribers().catch(() => {});
});
