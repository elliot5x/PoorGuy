const WAITLIST_ADMIN_ENDPOINT = "";
let adminToken = "";

const loginForm = document.querySelector(".admin-login");
const loginStatus = document.querySelector(".admin-login-status");
const dashboard = document.querySelector(".admin-dashboard");
const tableBody = document.querySelector(".admin-table-wrap tbody");
const campaignForm = document.querySelector(".admin-campaign");
const campaignStatus = document.querySelector(".admin-campaign-status");

async function adminRequest(action, options = {}) {
    const separator = WAITLIST_ADMIN_ENDPOINT.includes("?") ? "&" : "?";
    const response = await fetch(`${WAITLIST_ADMIN_ENDPOINT}${separator}action=${encodeURIComponent(action)}`, {
        ...options,
        headers: { Accept: "application/json", "Content-Type": "application/json", "x-admin-token": adminToken, ...(options.headers ?? {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "request_failed");
    return data;
}

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function loadSubscribers() {
    const data = await adminRequest("admin-list");
    tableBody.replaceChildren();
    data.subscribers.forEach(subscriber => {
        const row = document.createElement("tr");
        const interest = subscriber.interest === "request_support" ? "Pedir apoio" : "Ser apoiador";
        [subscriber.email, interest, subscriber.confirmed_at ? formatDate(subscriber.confirmed_at) : "Não confirmado", formatDate(subscriber.created_at)].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        });
        const actions = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Excluir";
        deleteButton.dataset.deleteId = subscriber.id;
        actions.append(deleteButton);
        row.append(actions);
        tableBody.append(row);
    });
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!WAITLIST_ADMIN_ENDPOINT) {
        loginStatus.textContent = "O painel administrativo ainda não está configurado.";
        return;
    }
    loginStatus.textContent = "Verificando...";
    try {
        const response = await fetch(`${WAITLIST_ADMIN_ENDPOINT}?action=admin-login`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ password: document.querySelector("#admin-password").value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error("unauthorized");
        adminToken = data.token;
        loginForm.hidden = true;
        dashboard.hidden = false;
        await loadSubscribers();
    } catch {
        loginStatus.textContent = "Senha inválida ou serviço indisponível.";
    }
});

document.querySelector('[data-admin-action="refresh"]').addEventListener("click", loadSubscribers);
document.querySelector('[data-admin-action="logout"]').addEventListener("click", () => {
    adminToken = "";
    dashboard.hidden = true;
    loginForm.hidden = false;
    loginForm.reset();
});

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;
    if (!window.confirm("Excluir definitivamente este cadastro solicitado?")) return;
    await adminRequest("admin-delete", { method: "POST", body: JSON.stringify({ id: button.dataset.deleteId }) });
    await loadSubscribers();
});

campaignForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!window.confirm("Enviar esta mensagem para todos os inscritos confirmados ativos?")) return;
    campaignStatus.textContent = "Enviando...";
    try {
        const data = new FormData(campaignForm);
        const result = await adminRequest("admin-send", {
            method: "POST",
            body: JSON.stringify({ subject: data.get("subject"), body: data.get("body") })
        });
        campaignStatus.textContent = `${result.sentCount} e-mail(s) enviado(s).`;
        campaignForm.reset();
    } catch {
        campaignStatus.textContent = "Não foi possível enviar a mensagem.";
    }
});
