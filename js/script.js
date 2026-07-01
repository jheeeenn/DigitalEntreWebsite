document.addEventListener("DOMContentLoaded", function () {
    setActiveNavLink();
    setupFaqAccordion();
    setupMissingImageFallbacks();
    setupPrelaunchBanner();
});

function setupPrelaunchBanner() {
    const banner = document.getElementById("prelaunchBanner");
    const dismissButton = document.querySelector(".banner-dismiss");

    if (!banner || !dismissButton) {
        return;
    }

    const isDismissed = localStorage.getItem("cheesieClubPreorderDismissed") === "true";

    if (isDismissed) {
        banner.classList.add("is-hidden");
        return;
    }

    dismissButton.addEventListener("click", function () {
        banner.classList.add("is-hidden");
        localStorage.setItem("cheesieClubPreorderDismissed", "true");
    });
}

function setActiveNavLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const currentHash = window.location.hash;
    const navLinks = document.querySelectorAll(".nav-links a");

    navLinks.forEach(function (link) {
        const hrefParts = link.getAttribute("href").split("#");
        const linkPage = hrefParts[0];
        const linkHash = hrefParts[1] ? "#" + hrefParts[1] : "";

        if (linkPage === currentPage && linkHash === currentHash) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
}

function setupFaqAccordion() {
    const faqButtons = document.querySelectorAll(".faq-question");

    faqButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const item = button.closest(".faq-item");
            const isOpen = item.classList.contains("open");

            document.querySelectorAll(".faq-item.open").forEach(function (openItem) {
                openItem.classList.remove("open");
                openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
                openItem.querySelector(".faq-question span").textContent = "+";
            });

            if (!isOpen) {
                item.classList.add("open");
                button.setAttribute("aria-expanded", "true");
                button.querySelector("span").textContent = "-";
            }
        });
    });
}

function setupMissingImageFallbacks() {
    const images = document.querySelectorAll("img");

    images.forEach(function (image) {
        image.addEventListener("error", function () {
            if (image.classList.contains("brand-logo") || image.closest(".hero-visual")) {
                image.classList.add("is-missing");
                return;
            }

            image.src = createPlaceholderImage(image.alt || "Cheesie Club");
        });
    });
}

function createPlaceholderImage(label) {
    const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
            <rect width="800" height="600" fill="#eadcc8"/>
            <circle cx="610" cy="140" r="160" fill="#d8c5ad" opacity="0.65"/>
            <circle cx="185" cy="440" r="190" fill="#8f967d" opacity="0.18"/>
            <rect x="170" y="170" width="460" height="260" rx="44" fill="#fffaf3" opacity="0.9"/>
            <text x="400" y="285" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#4b3f35">Cheesie Club</text>
            <text x="400" y="345" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#7a746d">${safeLabel}</text>
        </svg>
    `;

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}
