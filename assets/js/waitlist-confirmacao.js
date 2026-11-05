const WAITLIST_CONFIRM_ENDPOINT = window.PoorGuyWaitlistConfig?.endpoint ?? "";
const status = document.querySelector(".waitlist-confirmation-status");
const token = new URLSearchParams(location.search).get("token");

async function confirm() {
    if (!WAITLIST_CONFIRM_ENDPOINT || !token) {
        status.textContent = "Este link de confirmação é inválido ou expirou.";
        return;
    }
    try {
        const response = await fetch(`${WAITLIST_CONFIRM_ENDPOINT}?action=verify`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        const data = await response.json();
        status.textContent = data.ok ? "E-mail confirmado. Obrigado por entrar na lista de espera." : "Este link de confirmação é inválido ou expirou.";
    } catch {
        status.textContent = "Não foi possível confirmar seu e-mail agora. Tente novamente.";
    }
}

confirm();
