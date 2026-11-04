document.querySelectorAll(".benefit-grid article").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;

        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        card.style.setProperty("--rotate-x", `${y * -12}deg`);
        card.style.setProperty("--rotate-y", `${x * 12}deg`);
        card.style.transform = `perspective(900px) translateY(-8px) rotateX(${y * -12}deg) rotateY(${x * 12}deg)`;
    });

    card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--rotate-x");
        card.style.removeProperty("--rotate-y");
        card.style.transform = "";
    });
});

const revealTargets = document.querySelectorAll(
    ".announcement, .hero h1, .hero-subtitle, .hero-actions, .hero-note, .product-preview, " +
    ".intro-section > *, .feature-copy, .steps article, .story-copy, .story-panel, " +
    ".section-heading, .benefit-grid article, .security-copy, .security-section li, " +
    ".faq-heading, .faq-list details, .waitlist > *, footer > *"
);

revealTargets.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
});

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
    });
}, {
    threshold: 0.14,
    rootMargin: "0px 0px -40px"
});

revealTargets.forEach((element) => revealObserver.observe(element));

const preview = document.querySelector(".product-preview");
const previewCard = preview?.querySelector(".app-window");

if (preview && previewCard && window.matchMedia("(pointer: fine)").matches) {
    preview.addEventListener("pointermove", (event) => {
        const bounds = preview.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        previewCard.style.setProperty("--card-rotate-x", `${5 - y * 4}deg`);
        previewCard.style.setProperty("--card-rotate-y", `${x * 5}deg`);
    });

    preview.addEventListener("pointerleave", () => {
        previewCard.style.setProperty("--card-rotate-x", "5deg");
        previewCard.style.setProperty("--card-rotate-y", "0deg");
    });

    let scrollFrame;
    const updatePreviewScrollTilt = () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => {
            const rect = preview.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;
            const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewportCenter) / (window.innerHeight / 2)));
            previewCard.style.setProperty("--card-scroll-y", `${progress * 9}px`);
            previewCard.style.setProperty("--card-rotate-x", `${5 + progress * 2.5}deg`);
        });
    };

    window.addEventListener("scroll", updatePreviewScrollTilt, { passive: true });
    updatePreviewScrollTilt();
}
