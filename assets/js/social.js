const overlay = document.querySelector(".login-overlay");
const dialog = overlay.querySelector(".login-dialog");
const form = overlay.querySelector(".login-form");
const status = overlay.querySelector(".login-status");
let previousFocus = null;

function openLogin() {
    previousFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    dialog.querySelector("input").focus();
}

function closeLogin() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    previousFocus?.focus();
}

document.querySelectorAll("[data-login-open]").forEach((button) => {
    button.addEventListener("click", openLogin);
});
const settingsButton = document.querySelector(".settings-button");
const settingsPanel = document.querySelector(".settings-panel");
settingsButton.addEventListener("click", () => {
    const expanded = settingsButton.getAttribute("aria-expanded") === "true";
    settingsButton.setAttribute("aria-expanded", String(!expanded));
    settingsPanel.hidden = expanded;
});
overlay.querySelector(".login-close").addEventListener("click", closeLogin);
overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeLogin();
});
dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLogin();
});
overlay.querySelectorAll(".login-providers button").forEach((button) => {
    button.addEventListener("click", () => {
        status.textContent = "A conexão com este provedor será ativada junto da autenticação da rede.";
    });
});
form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "A autenticação da rede ainda não está ativada.";
});
