const modeButtons = document.querySelectorAll("[data-mode]");
const panels = document.querySelectorAll("[data-panel]");

function activatePreviewMode(mode) {
    modeButtons.forEach((button) => {
        const selected = button.dataset.mode === mode;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
    });
    panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === mode);
    });
}

modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activatePreviewMode(button.dataset.mode);
    });
});

const paymentForm = document.querySelector(".payment-form");
const paymentInput = document.querySelector("#payment-link");
const formError = document.querySelector(".form-error");

const demoAccounts = {
    energy: { category: "energia", link: "https://example.invalid/conta/energia", name: "Mariana, 31", description: "Estou buscando apoio para regularizar uma conta essencial." },
    internet: { category: "internet", link: "https://example.invalid/conta/internet", name: "Renato, 28", description: "Preciso manter a conexão para continuar o trabalho e os estudos." },
    health: { category: "remedios", link: "https://example.invalid/conta/saude", name: "Luana, 35", description: "Quero reorganizar uma despesa de saúde com transparência." }
};
const accountCategories = Object.freeze({
    energia: "Energia",
    agua: "Água",
    internet: "Internet",
    aluguel: "Aluguel",
    remedios: "Remédios",
    alimentacao: "Alimentação",
    outro: "Outro"
});
let selectedDemo = null;
let randomAccountAmount = 0;
const publishedCategory = document.querySelector("#published-card-category");
const publishedDescription = document.querySelector("#published-card-description");
const categoryReviewNote = document.querySelector(".category-review-note");
const descriptionCounter = document.querySelector("#description-counter");

function updateDescriptionCounter() {
    descriptionCounter.textContent = `${publishedDescription.value.length}/140`;
}

function updateCategoryReviewNote() {
    categoryReviewNote.hidden = publishedCategory.value !== "outro";
}

publishedCategory.addEventListener("change", updateCategoryReviewNote);
publishedDescription.addEventListener("input", updateDescriptionCounter);
updateDescriptionCounter();
updateCategoryReviewNote();

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
        publishedCategory.value = selectedDemo.category;
        updateCategoryReviewNote();
        document.querySelector("#published-card-description").value = selectedDemo.description;
        button.querySelector("small").textContent = `R$ ${randomAccountAmount}`;
        formError.textContent = "";
        document.querySelector(".published-card-builder").hidden = true;
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

    formError.textContent = "";
    if (!randomAccountAmount) randomAccountAmount = randomAmount();
    document.querySelector(".published-card-builder").hidden = false;
    document.querySelector(".published-card-builder").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.querySelector(".create-card-button").addEventListener("click", () => {
    const name = document.querySelector("#published-card-name").value.trim();
    const category = publishedCategory.value.trim();
    const description = document.querySelector("#published-card-description").value.trim();
    if (!name || !category || !description) {
        formError.textContent = "Preencha nome, tipo da conta e descrição para gerar o card.";
        return;
    }
    if (!randomAccountAmount) randomAccountAmount = randomAmount();
    if (!Object.hasOwn(accountCategories, category)) {
        formError.textContent = "Selecione uma categoria válida para o tipo da conta.";
        publishedCategory.focus();
        return;
    }

    const generatedProfile = {
        initials: name.charAt(0).toUpperCase(),
        name,
        bill: `R$ ${randomAccountAmount}`,
        amount: randomAccountAmount,
        category: accountCategories[category],
        reference: "Conta ilustrativa criada nesta sessão",
        message: description,
        tags: ["Criado por você", "Demonstração"],
        demoId: `criado-${Date.now()}`,
        paid: false,
        generated: true
    };
    generatedProfiles.push(generatedProfile);
    profiles.push(generatedProfile);
    if (generatedProfiles.length > 5) {
        const oldest = generatedProfiles.shift();
        const oldestIndex = profiles.indexOf(oldest);
        if (oldestIndex >= 0) profiles.splice(oldestIndex, 1);
    }
    currentIndex = profiles.indexOf(generatedProfile);
    if (profiles.length) {
        renderCards();
        updatePayButton();
    }
    updatePayButton();

    activatePreviewMode("support");
    requestAnimationFrame(() => {
        document.querySelector(".support-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

let profiles = [
    { initials: "M", name: "Mariana, 31", bill: "R$ 180", amount: 180, category: "Energia elétrica", reference: "Conta ilustrativa de outubro/2026", message: "Estou tentando regularizar a conta da minha casa e retomar meus estudos com mais tranquilidade.", tags: ["Conta vencida há 12 dias", "Perfil ilustrativo"], demoId: "energia-01", paid: false },
    { initials: "R", name: "Renato, 28", bill: "R$ 240", amount: 240, category: "Internet", reference: "Conta ilustrativa de outubro/2026", message: "Preciso manter a conexão para continuar trabalhando e participar das aulas do curso técnico.", tags: ["Conta vencida há 20 dias", "Perfil ilustrativo"], demoId: "internet-01", paid: false },
    { initials: "L", name: "Luana, 35", bill: "R$ 125", amount: 125, category: "Medicamentos", reference: "Despesa ilustrativa de outubro/2026", message: "Minha intenção é reorganizar uma conta essencial sem expor mais dados do que o necessário.", tags: ["Necessidade comprovada", "Perfil ilustrativo"], demoId: "medicamentos-01", paid: false }
];

const generatedProfiles = [];

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
        const inner = document.createElement("div");
        inner.className = "support-card-inner";
        const face = document.createElement("div");
        face.className = "support-card-face support-card-front";
        const cover = document.createElement("div");
        cover.className = "card-cover";
        const avatar = document.createElement("div");
        avatar.className = "card-avatar";
        avatar.textContent = profile.initials;
        cover.append(avatar);
        const body = document.createElement("div");
        body.className = "card-body";
        const bill = document.createElement("span");
        bill.className = "card-bill";
        bill.textContent = profile.bill;
        const eyebrow = document.createElement("span");
        eyebrow.className = "eyebrow";
        eyebrow.textContent = profile.category;
        const name = document.createElement("h2");
        name.textContent = profile.name;
        const message = document.createElement("p");
        message.textContent = profile.message;
        const tags = document.createElement("div");
        tags.className = "card-tags";
        if (profile.paid) {
            const paidTag = document.createElement("span");
            paidTag.className = "paid-tag";
            paidTag.textContent = "Pago";
            tags.append(paidTag);
        }
        profile.tags.forEach((tag) => {
            if (tag === "Perfil ilustrativo") return;
            const tagElement = document.createElement("span");
            tagElement.textContent = tag;
            tags.append(tagElement);
        });
        if (!profile.generated) {
            const profileTag = document.createElement("span");
            profileTag.textContent = "Perfil ilustrativo";
            tags.append(profileTag);
        }
        const status = document.createElement("small");
        status.className = "card-status";
        status.textContent = profile.generated ? (profile.paid ? "Pago" : "Em análise") : (profile.paid ? "Pago" : "Aguardando apoio");
        body.append(bill, eyebrow, name, message, tags, status);
        face.append(cover, body);
        inner.append(face);
        card.append(inner);
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
document.querySelectorAll(".deck-button").forEach((button) => {
    button.addEventListener("focus", () => {
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
});
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
