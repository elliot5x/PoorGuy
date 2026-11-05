const WAITLIST_UNSUBSCRIBE_ENDPOINT = "";
const status = document.querySelector(".waitlist-confirmation-status");
const token = new URLSearchParams(location.search).get("token");

async function unsubscribe() {
    if (!WAITLIST_UNSUBSCRIBE_ENDPOINT || !token) {
        status.textContent = "Este link de descadastro é inválido ou expirou.";
        return;
    }
    try {
        const response = await fetch(`${WAITLIST_UNSUBSCRIBE_ENDPOINT}?action=unsubscribe&token=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
        const data = await response.json();
        status.textContent = data.ok ? "Seu e-mail foi descadastrado das comunicações do PoorGuy." : "Este link de descadastro é inválido ou expirou.";
    } catch {
        status.textContent = "Não foi possível concluir o descadastro agora. Tente novamente.";
    }
}

unsubscribe();
