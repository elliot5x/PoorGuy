const WAITLIST_ENDPOINT = window.PoorGuyWaitlistConfig?.endpoint ?? "";

const waitlistForm = document.querySelector(".waitlist-form");
const waitlistStatus = waitlistForm?.querySelector(".waitlist-status");
const waitlistButton = waitlistForm?.querySelector('button[type="submit"]');
const WAITLIST_COOLDOWN_MS = 60_000;
const WAITLIST_SUBMISSION_KEY = "poorguy_waitlist_submission";

function getLastSubmission() {
    try {
        return Number(localStorage.getItem(WAITLIST_SUBMISSION_KEY) || 0);
    } catch {
        return 0;
    }
}

function saveLastSubmission() {
    try {
        localStorage.setItem(WAITLIST_SUBMISSION_KEY, String(Date.now()));
    } catch {
        // O cadastro ainda pode seguir; o bloqueio repetido apenas não será persistente.
    }
}

function setWaitlistStatus(message, state = "") {
    waitlistStatus.textContent = message;
    waitlistStatus.dataset.state = state;
}

if (waitlistForm && waitlistStatus && waitlistButton) {
    waitlistForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!waitlistForm.checkValidity()) {
            waitlistForm.reportValidity();
            setWaitlistStatus("Preencha seu e-mail e confirme o consentimento.", "error");
            return;
        }

        if (waitlistForm.elements.website.value.trim()) {
            setWaitlistStatus("Não foi possível concluir o cadastro.", "error");
            return;
        }

        const lastSubmission = getLastSubmission();
        if (Date.now() - lastSubmission < WAITLIST_COOLDOWN_MS) {
            setWaitlistStatus("Você já enviou recentemente. Aguarde um minuto antes de tentar novamente.", "error");
            return;
        }

        if (!WAITLIST_ENDPOINT.trim()) {
            setWaitlistStatus("O cadastro ainda não está ativo. Volte em breve para se inscrever.", "error");
            return;
        }

        const interestInput = waitlistForm.querySelector('input[name="interest"]:checked');
        const payload = {
            email: waitlistForm.elements.email.value.trim(),
            interest: interestInput?.value || "",
            consent: true,
            hp: waitlistForm.elements.website.value
        };

        waitlistButton.disabled = true;
        const buttonContent = waitlistButton.innerHTML;
        waitlistButton.textContent = "Enviando...";
        setWaitlistStatus("Enviando seu cadastro...", "");

        try {
            const endpoint = `${WAITLIST_ENDPOINT}${WAITLIST_ENDPOINT.includes("?") ? "&" : "?"}action=subscribe`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("submission_failed");

            saveLastSubmission();
            waitlistForm.reset();
            setWaitlistStatus("Enviamos um e-mail de confirmação. Confirme para entrar na lista.", "success");
        } catch {
            setWaitlistStatus("Não foi possível concluir o cadastro agora. Tente novamente em instantes.", "error");
        } finally {
            waitlistButton.disabled = false;
            waitlistButton.innerHTML = buttonContent;
        }
    });
}
