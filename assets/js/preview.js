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
    { initials: "M", name: "Mariana, 31", bill: "R$ 180", category: "Energia elétrica", message: "Estou tentando regularizar a conta da minha casa e retomar meus estudos com mais tranquilidade.", tags: ["Conta vencida há 12 dias", "Perfil ilustrativo"] },
    { initials: "R", name: "Renato, 28", bill: "R$ 240", category: "Internet", message: "Preciso manter a conexão para continuar trabalhando e participar das aulas do curso técnico.", tags: ["Conta vencida há 20 dias", "Perfil ilustrativo"] },
    { initials: "L", name: "Luana, 35", bill: "R$ 125", category: "Medicamentos", message: "Minha intenção é reorganizar uma conta essencial sem expor mais dados do que o necessário.", tags: ["Necessidade comprovada", "Perfil ilustrativo"] }
];

const deck = document.querySelector(".deck");
const deckStatus = document.querySelector(".deck-status");
let currentIndex = 0;

function renderCards() {
    deck.replaceChildren();
    profiles.forEach((profile, index) => {
        if (index < currentIndex) return;
        const card = document.createElement("article");
        card.className = "support-card";
        card.style.zIndex = String(profiles.length - index);
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
                        <div class="card-tags">${profile.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
                    </div>
                </div>
                <div class="support-card-face support-card-back">
                    <span class="eyebrow">Forma de pagamento</span>
                    <h2>${profile.category}</h2>
                    <strong class="payment-total">${profile.bill}</strong>
                    <p>Nesta demonstração, escolha como a conta ilustrativa seria paga.</p>
                    <div class="payment-options" aria-label="Opções ilustrativas de pagamento">
                        <button type="button">Pix</button>
                        <button type="button">Cartão</button>
                    </div>
                    <small>Nenhum pagamento será realizado.</small>
                    <button class="payment-back" type="button">Voltar ao perfil</button>
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
        currentIndex += 1;
        renderCards();
        if (currentIndex >= profiles.length) {
            deck.hidden = true;
            document.querySelector(".deck-actions").hidden = true;
            deckStatus.hidden = false;
        }
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
document.querySelector(".deck-button.pay").addEventListener("click", () => {
    const activeCard = deck.querySelector(".support-card");
    if (!activeCard) return;
    activeCard.classList.add("is-flipped");
});

deck.addEventListener("click", (event) => {
    const backButton = event.target.closest(".payment-back");
    if (!backButton) return;
    backButton.closest(".support-card").classList.remove("is-flipped");
});
deckStatus.querySelector("button").addEventListener("click", () => {
    currentIndex = 0;
    deck.hidden = false;
    document.querySelector(".deck-actions").hidden = false;
    deckStatus.hidden = true;
    renderCards();
});

renderCards();
