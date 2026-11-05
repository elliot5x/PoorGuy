const modeButtons = document.querySelectorAll("[data-mode]");
const panels = document.querySelectorAll("[data-panel]");

modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        modeButtons.forEach((item) => {
            const selected = item === button;
            item.classList.toggle("active", selected);
            item.setAttribute("aria-selected", String(selected));
        });
        panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === button.dataset.mode));
    });
});

const paymentForm = document.querySelector(".payment-form");
const paymentInput = document.querySelector("#payment-link");
const formError = document.querySelector(".form-error");
const qrResult = document.querySelector(".qr-result");
const qrContainer = document.querySelector("#payment-qr");
let qrCode;

const demoAccounts = {
    energy: { category: "Energia elétrica", link: "https://example.invalid/conta/energia", name: "Mariana, 31", description: "Estou buscando apoio para regularizar uma conta essencial." },
    internet: { category: "Internet", link: "https://example.invalid/conta/internet", name: "Renato, 28", description: "Preciso manter a conexão para continuar o trabalho e os estudos." },
    health: { category: "Saúde", link: "https://example.invalid/conta/saude", name: "Luana, 35", description: "Quero reorganizar uma despesa de saúde com transparência." }
};
let selectedDemo = null;
let randomAccountAmount = 0;

function randomAmount() {
    const values = [85, 120, 175, 210, 240, 280, 350, 420];
    return values[Math.floor(Math.random() * values.length)];
}

document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => {
        selectedDemo = demoAccounts[button.dataset.demo];
        randomAccountAmount = randomAmount();
        paymentInput.value = `${selectedDemo.link}?valor=${randomAccountAmount}`;
        document.querySelector("#published-card-name").value = selectedDemo.name;
        document.querySelector("#published-card-category").value = selectedDemo.category;
        document.querySelector("#published-card-description").value = selectedDemo.description;
        button.querySelector("small").textContent = `R$ ${randomAccountAmount}`;
        formError.textContent = "";
        qrResult.hidden = true;
        document.querySelector(".published-card-builder").hidden = true;
        document.querySelector(".published-card-preview").hidden = true;
    });
});

Object.entries(demoAccounts).forEach(([key, account]) => {
    const button = document.querySelector(`[data-demo="${key}"]`);
    button.querySelector("small").textContent = `R$ ${randomAmount()}`;
});

paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let url;

    try {
        url = new URL(paymentInput.value.trim());
        if (url.protocol !== "https:") throw new Error("use https");
    } catch {
        formError.textContent = "Informe um link público válido iniciado por https://.";
        return;
    }

    if (typeof QRCode !== "function") {
        formError.textContent = "Não foi possível carregar o gerador de QR code. Verifique sua conexão e tente novamente.";
        return;
    }

    formError.textContent = "";
    qrContainer.replaceChildren();
    qrCode = new QRCode(qrContainer, {
        text: url.href,
        width: 192,
        height: 192,
        colorDark: "#252a2d",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
    qrResult.hidden = false;
    if (!randomAccountAmount) randomAccountAmount = randomAmount();
    document.querySelector(".published-card-builder").hidden = false;
});

document.querySelector(".create-card-button").addEventListener("click", () => {
    const name = document.querySelector("#published-card-name").value.trim();
    const category = document.querySelector("#published-card-category").value.trim();
    const description = document.querySelector("#published-card-description").value.trim();
    if (!name || !category || !description) {
        formError.textContent = "Preencha nome, tipo da conta e descrição para gerar o card.";
        return;
    }
    const preview = document.querySelector(".published-card-preview");
    preview.querySelector(".published-card-avatar").textContent = name.charAt(0).toUpperCase();
    document.querySelector("#published-card-category-preview").textContent = category;
    document.querySelector("#published-card-name-preview").textContent = name;
    if (!randomAccountAmount) randomAccountAmount = randomAmount();
    document.querySelector("#published-card-amount-preview").textContent = `R$ ${randomAccountAmount}`;
    document.querySelector("#published-card-description-preview").textContent = description;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector(".download-qr").addEventListener("click", () => {
    const qrImage = qrContainer.querySelector("img") || qrContainer.querySelector("canvas");
    if (!qrImage) return;
    const source = qrImage.tagName === "CANVAS" ? qrImage.toDataURL("image/png") : qrImage.src;
    const link = document.createElement("a");
    link.href = source;
    link.download = "poorguy-conta.png";
    link.click();
});

const profiles = [
    { initials: "M", name: "Mariana, 31", bill: "R$ 180", amount: 180, category: "Energia elétrica", reference: "Conta ilustrativa de outubro/2026", message: "Estou tentando regularizar a conta da minha casa e retomar meus estudos com mais tranquilidade.", tags: ["Conta vencida há 12 dias", "Perfil ilustrativo"], demoId: "energia-01", paid: false },
    { initials: "R", name: "Renato, 28", bill: "R$ 240", amount: 240, category: "Internet", reference: "Conta ilustrativa de outubro/2026", message: "Preciso manter a conexão para continuar trabalhando e participar das aulas do curso técnico.", tags: ["Conta vencida há 20 dias", "Perfil ilustrativo"], demoId: "internet-01", paid: false },
    { initials: "L", name: "Luana, 35", bill: "R$ 125", amount: 125, category: "Medicamentos", reference: "Despesa ilustrativa de outubro/2026", message: "Minha intenção é reorganizar uma conta essencial sem expor mais dados do que o necessário.", tags: ["Necessidade comprovada", "Perfil ilustrativo"], demoId: "medicamentos-01", paid: false }
];

const deck = document.querySelector(".deck");
const deckStatus = document.querySelector(".deck-status");
let currentIndex = 0;

const payButton = document.querySelector(".deck-button.pay");

function updatePayButton() {
    const profile = profiles[currentIndex];
    payButton.disabled = Boolean(profile?.paid);
    payButton.setAttribute("aria-label", profile?.paid ? "Conta já paga" : "Pagar conta ilustrativa");
    payButton.querySelector("span").textContent = profile?.paid ? "Pago" : "Pagar";
}

function renderCards() {
    deck.replaceChildren();
    profiles.map((profile, index) => ({
        profile,
        position: (index - currentIndex + profiles.length) % profiles.length
    })).sort((a, b) => a.position - b.position).forEach(({ profile, position }) => {
        const card = document.createElement("article");
        card.className = `support-card${profile.paid ? " is-paid" : ""}`;
        card.style.zIndex = String(profiles.length - position);
        card.innerHTML = `
            <div class="support-card-inner">
                <div class="support-card-face support-card-front">
                    <div class="card-cover"><div class="card-avatar">${profile.initials}</div></div>
                    <div class="card-body">
                        <span class="card-bill">${profile.bill}</span>
                        <span class="eyebrow">${profile.category}</span>
                        <h2>${profile.name}</h2>
                        <small>Solicitação ilustrativa</small>
                        <p>${profile.message}</p>
                        <div class="card-tags">${profile.paid ? '<span class="paid-tag">Pago</span>' : ""}${profile.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
                    </div>
                </div>
            </div>`;
        makeDraggable(card);
        deck.append(card);
    });
}

function advanceCard(direction) {
    const cards = [...deck.querySelectorAll(".support-card")];
    const activeCard = cards[0];
    if (!activeCard) return;
    activeCard.style.transform = `translate(${direction * 120}%, 20px) rotate(${direction * 18}deg)`;
    activeCard.style.opacity = "0";
    window.setTimeout(() => {
        currentIndex = (currentIndex + direction + profiles.length) % profiles.length;
        renderCards();
        updatePayButton();
    }, 280);
}

function makeDraggable(card) {
    let startX = 0;
    let dragging = false;

    card.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        if (card !== deck.querySelector(".support-card")) return;
        dragging = true;
        startX = event.clientX;
        card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const distance = event.clientX - startX;
        card.style.transition = "none";
        card.style.transform = `translateX(${distance}px) rotate(${distance / 18}deg)`;
    });

    card.addEventListener("pointerup", (event) => {
        if (!dragging) return;
        dragging = false;
        card.style.transition = "";
        const distance = event.clientX - startX;
        if (Math.abs(distance) > 110) advanceCard(distance > 0 ? 1 : -1);
        else card.style.transform = "";
    });
}

document.querySelector(".deck-button.pass").addEventListener("click", () => advanceCard(-1));
const paymentOverlay = document.querySelector(".payment-overlay");
const paymentSheet = document.querySelector(".payment-sheet");
const paymentTitle = document.querySelector("#payment-title");
const paymentAmount = document.querySelector("#payment-amount");
const paymentAmountError = document.querySelector(".payment-amount-error");
const paymentQr = document.querySelector(".payment-qr");
const paymentFormView = document.querySelector(".payment-form-view");
const paymentSuccessView = document.querySelector(".payment-success-view");
const paymentSuccessTitle = document.querySelector("#payment-success-title");
let paymentTrigger = null;
let paymentProfile = null;
let previousBodyOverflow = "";

function amountIsValid() {
    const value = Number(paymentAmount.value);
    const valid = Number.isFinite(value) && paymentProfile && value === paymentProfile.amount;
    paymentAmountError.textContent = valid ? "" : `O pagamento deve ser exatamente ${paymentProfile?.bill ?? "o valor da conta"}.`;
    paymentAmount.setAttribute("aria-invalid", String(!valid));
    return valid;
}

function renderPaymentQr() {
    if (!amountIsValid()) {
        paymentQr.replaceChildren();
        return;
    }
    if (typeof QRCode !== "function") return;
    paymentQr.replaceChildren();
    const demoLink = `https://example.invalid/poorguy-demo/${encodeURIComponent(paymentProfile.demoId)}?valor=${encodeURIComponent(paymentAmount.value)}`;
    new QRCode(paymentQr, { text: demoLink, width: 144, height: 144, colorDark: "#252a2d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

function openPayment(profile, trigger) {
    paymentProfile = profile;
    paymentTrigger = trigger;
    paymentTitle.textContent = `${profile.category} — pagamento ilustrativo`;
    document.querySelector("#payment-category").textContent = profile.category;
    document.querySelector("#payment-reference").textContent = profile.reference;
    document.querySelector("#payment-bill-value").textContent = profile.bill;
    paymentAmount.value = String(profile.amount);
    paymentFormView.hidden = false;
    paymentSuccessView.hidden = true;
    paymentSheet.setAttribute("aria-labelledby", "payment-title");
    paymentOverlay.hidden = false;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    renderPaymentQr();
    requestAnimationFrame(() => paymentTitle.focus());
}

function closePayment() {
    paymentOverlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    paymentTrigger?.focus();
}

function trapDialogFocus(event) {
    if (event.key === "Escape") {
        closePayment();
        return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...paymentSheet.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="-1"]')]
        .filter((element) => element.offsetParent !== null && element !== paymentTitle);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (document.activeElement === paymentTitle || document.activeElement === paymentSuccessTitle) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
    }
}

document.querySelector(".deck-button.pay").addEventListener("click", (event) => {
    const profile = profiles[currentIndex];
    if (profile && !profile.paid) openPayment(profile, event.currentTarget);
});
document.querySelector(".payment-close").addEventListener("click", closePayment);
document.querySelector(".payment-cancel").addEventListener("click", closePayment);
paymentOverlay.addEventListener("click", (event) => {
    if (event.target === paymentOverlay) closePayment();
});
paymentSheet.addEventListener("keydown", trapDialogFocus);
document.querySelector(".payment-confirm").addEventListener("click", () => {
    if (!amountIsValid()) return;
    paymentProfile.paid = true;
    renderCards();
    updatePayButton();
    paymentFormView.hidden = true;
    paymentSuccessView.hidden = false;
    paymentSheet.setAttribute("aria-labelledby", "payment-success-title");
    paymentSuccessTitle.focus();
});
document.querySelector(".payment-next").addEventListener("click", () => {
    closePayment();
    advanceCard(1);
});
deckStatus.querySelector("button").addEventListener("click", () => {
    currentIndex = 0;
    deck.hidden = false;
    document.querySelector(".deck-actions").hidden = false;
    deckStatus.hidden = true;
    renderCards();
    updatePayButton();
});

renderCards();
