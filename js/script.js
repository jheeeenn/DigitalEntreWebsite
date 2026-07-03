document.addEventListener("DOMContentLoaded", function () {
    setActiveNavLink();
    setupFaqAccordion();
    setupMissingImageFallbacks();
    setupOrderBanner();
    setupOrderCart();
});

function setupOrderBanner() {
    const banner = document.getElementById("orderBanner");
    const dismissButton = document.querySelector(".banner-dismiss");

    if (!banner || !dismissButton) {
        return;
    }

    const isDismissed = localStorage.getItem("cheesieClubOrderBannerDismissed") === "true";

    if (isDismissed) {
        banner.classList.add("is-hidden");
        return;
    }

    dismissButton.addEventListener("click", function () {
        banner.classList.add("is-hidden");
        localStorage.setItem("cheesieClubOrderBannerDismissed", "true");
    });
}

function setupOrderCart() {
    const STORAGE_KEY = "cheesieClubOrderCartV1";
    const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/cheesie_club/";
    const INSTAGRAM_DM_URL = "https://ig.me/m/cheesie_club";
    const NORMAL_DELIVERY_FEE = 1;
    const FREE_DELIVERY_PROMOTION_ACTIVE = true;
    const MENU_PRICES = {
        Original: 8.90,
        Oreo: 9.90,
        Biscoff: 11.90,
        Matcha: 10.90
    };

    const addButtons = document.querySelectorAll(".add-to-cart-btn");
    const floatingButton = document.getElementById("floatingCartButton");
    const badge = document.getElementById("cartBadge");
    const overlay = document.getElementById("cartOverlay");
    const drawer = document.getElementById("cartDrawer");
    const closeButton = document.getElementById("cartClose");
    const emptyState = document.getElementById("cartEmpty");
    const content = document.getElementById("cartContent");
    const itemsContainer = document.getElementById("cartItems");
    const subtotalEl = document.getElementById("cartSubtotal");
    const deliveryFeeEl = document.getElementById("cartDeliveryFee");
    const promotionRow = document.getElementById("cartPromotionRow");
    const promotionDiscountEl = document.getElementById("cartPromotionDiscount");
    const totalEl = document.getElementById("cartTotal");
    const messagePreview = document.getElementById("orderMessagePreview");
    const copyButton = document.getElementById("copyOrderMessage");
    const copyOpenButton = document.getElementById("copyAndOpenInstagram");
    const clearButton = document.getElementById("clearCartButton");
    const fulfilmentInputs = document.querySelectorAll('input[name="fulfilment"]');

    if (!floatingButton || !badge || !overlay || !drawer || !closeButton || !emptyState || !content ||
        !itemsContainer || !subtotalEl || !deliveryFeeEl || !promotionRow || !promotionDiscountEl ||
        !totalEl || !messagePreview || !copyButton || !copyOpenButton || !clearButton) {
        return;
    }

    let state = loadCart();
    let lastFocusedElement = null;

    addButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const name = button.dataset.name;
            const price = Number(button.dataset.price);

            if (!name || !Object.prototype.hasOwnProperty.call(MENU_PRICES, name) ||
                Number.isNaN(price) || price !== MENU_PRICES[name]) {
                return;
            }

            if (!state.items[name]) {
                state.items[name] = {
                    name: name,
                    price: MENU_PRICES[name],
                    qty: 0
                };
            }

            state.items[name].qty += 1;
            saveCart();
            renderCart();
            flashAddedButton(button);
            pulseCartButton();
        });
    });

    floatingButton.addEventListener("click", openDrawer);
    closeButton.addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && drawer.classList.contains("is-open")) {
            closeDrawer();
        }
    });

    fulfilmentInputs.forEach(function (input) {
        input.addEventListener("change", function () {
            state.fulfilment = input.value;
            saveCart();
            renderCart();
        });
    });

    copyButton.addEventListener("click", async function () {
        const copied = await copyText(generateOrderMessage());
        showTemporaryButtonText(copyButton, copied ? "Copied!" : "Copy failed", "Copy order message");
    });

    copyOpenButton.addEventListener("click", function () {
        let copied = false;

        try {
            copied = copyTextImmediately(generateOrderMessage());
        } catch (error) {
            console.warn("Could not copy order message before opening Instagram", error);
        }

        const instagramWindow = window.open(INSTAGRAM_DM_URL, "_blank", "noopener");

        if (!instagramWindow) {
            window.location.href = INSTAGRAM_PROFILE_URL;
        }

        showTemporaryButtonText(copyOpenButton, copied ? "Copied!" : "Opened Instagram", "Copy & open Instagram");
    });

    clearButton.addEventListener("click", function () {
        state.items = {};
        saveCart();
        renderCart();
    });

    itemsContainer.addEventListener("click", function (event) {
        const button = event.target.closest("[data-cart-action]");

        if (!button) {
            return;
        }

        const name = button.dataset.name;
        const action = button.dataset.cartAction;

        if (!state.items[name]) {
            return;
        }

        if (action === "increase") {
            state.items[name].qty += 1;
        }

        if (action === "decrease") {
            state.items[name].qty -= 1;

            if (state.items[name].qty <= 0) {
                delete state.items[name];
            }
        }

        saveCart();
        renderCart();
    });

    renderCart();

    function loadCart() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            const items = {};

            if (saved && saved.items) {
                Object.keys(saved.items).forEach(function (name) {
                    const savedItem = saved.items[name];
                    const qty = Math.floor(Number(savedItem.qty));

                    if (Object.prototype.hasOwnProperty.call(MENU_PRICES, name) && qty > 0) {
                        items[name] = {
                            name: name,
                            price: MENU_PRICES[name],
                            qty: qty
                        };
                    }
                });
            }

            return {
                items: items,
                fulfilment: saved && saved.fulfilment === "pickup" ? "pickup" : "delivery"
            };
        } catch (error) {
            console.warn("Could not load Cheesie Club order draft", error);
        }

        return {
            items: {},
            fulfilment: "delivery"
        };
    }

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn("Could not save Cheesie Club order draft", error);
        }
    }

    function getCartItems() {
        return Object.values(state.items).filter(function (item) {
            return item.qty > 0;
        });
    }

    function getSummary() {
        const items = getCartItems();
        const itemCount = items.reduce(function (sum, item) {
            return sum + item.qty;
        }, 0);
        const subtotal = items.reduce(function (sum, item) {
            return sum + item.price * item.qty;
        }, 0);
        let deliveryFee = 0;
        let promotionDiscount = 0;

        if (state.fulfilment === "delivery" && itemCount > 0) {
            deliveryFee = NORMAL_DELIVERY_FEE;

            if (FREE_DELIVERY_PROMOTION_ACTIVE) {
                promotionDiscount = deliveryFee;
            } else if (itemCount >= 2) {
                promotionDiscount = deliveryFee;
            }
        }

        const total = Math.max(0, subtotal + deliveryFee - promotionDiscount);

        return {
            items: items,
            itemCount: itemCount,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            promotionDiscount: promotionDiscount,
            total: total
        };
    }

    function renderCart() {
        const summary = getSummary();

        badge.textContent = String(summary.itemCount);
        badge.setAttribute("aria-label", summary.itemCount + (summary.itemCount === 1 ? " item" : " items"));

        if (summary.itemCount === 0) {
            badge.classList.add("is-empty");
            emptyState.hidden = false;
            content.hidden = true;
        } else {
            badge.classList.remove("is-empty");
            emptyState.hidden = true;
            content.hidden = false;
        }

        fulfilmentInputs.forEach(function (input) {
            input.checked = input.value === state.fulfilment;
        });

        itemsContainer.innerHTML = summary.items.map(function (item) {
            const safeName = escapeHtml(item.name);

            return `
                <div class="cart-item">
                    <div>
                        <h3>${safeName}</h3>
                        <small>${formatRM(item.price)} each &middot; ${formatRM(item.price * item.qty)}</small>
                    </div>
                    <div class="cart-qty-controls">
                        <button type="button" data-cart-action="decrease" data-name="${safeName}" aria-label="Decrease ${safeName}">&minus;</button>
                        <span>${item.qty}</span>
                        <button type="button" data-cart-action="increase" data-name="${safeName}" aria-label="Increase ${safeName}">+</button>
                    </div>
                </div>
            `;
        }).join("");

        subtotalEl.textContent = formatRM(summary.subtotal);
        deliveryFeeEl.textContent = formatRM(summary.deliveryFee);

        if (summary.promotionDiscount > 0) {
            promotionRow.hidden = false;
            promotionDiscountEl.textContent = "-" + formatRM(summary.promotionDiscount);
        } else {
            promotionRow.hidden = true;
            promotionDiscountEl.textContent = "-RM0.00";
        }

        totalEl.textContent = formatRM(summary.total);
        messagePreview.value = generateOrderMessage();
    }

    function generateOrderMessage() {
        const summary = getSummary();

        if (summary.itemCount === 0) {
            return "Hi Cheesie Club, I would like to order mini cheesecakes.";
        }

        const itemLines = summary.items.map(function (item) {
            return `- ${item.name} x ${item.qty} = ${formatRM(item.price * item.qty)}`;
        }).join("\n");
        const arrangement = state.fulfilment === "delivery"
            ? "Delivery within selected Kampar area"
            : "Pickup in Kampar";
        const feeLines = state.fulfilment === "delivery"
            ? `Delivery fee: ${formatRM(summary.deliveryFee)}\nLaunch promotion: -${formatRM(summary.promotionDiscount)}`
            : "Delivery fee: RM0.00";

        return `Hi Cheesie Club, I would like to order:\n${itemLines}\n\nPreferred arrangement: ${arrangement}\n${feeLines}\nEstimated total: ${formatRM(summary.total)}\n\nPlease confirm availability and payment details. Thank you!`;
    }

    function openDrawer() {
        lastFocusedElement = document.activeElement;
        drawer.scrollTop = 0;
        drawer.classList.add("is-open");
        drawer.removeAttribute("inert");
        drawer.setAttribute("aria-hidden", "false");
        overlay.hidden = false;
        floatingButton.setAttribute("aria-expanded", "true");
        document.body.classList.add("cart-open");
        closeButton.focus();
    }

    function closeDrawer() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("inert", "");
        drawer.setAttribute("aria-hidden", "true");
        overlay.hidden = true;
        floatingButton.setAttribute("aria-expanded", "false");
        document.body.classList.remove("cart-open");

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus();
        }
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                // Fall back to the legacy copy command below.
            }
        }

        try {
            return copyTextImmediately(text);
        } catch (error) {
            console.warn("Could not copy order message", error);
            return false;
        }
    }

    function copyTextImmediately(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    }

    function flashAddedButton(button) {
        const oldText = button.textContent;
        button.classList.add("added");
        button.textContent = "Added!";

        setTimeout(function () {
            button.classList.remove("added");
            button.textContent = oldText;
        }, 1200);
    }

    function pulseCartButton() {
        floatingButton.classList.remove("cart-bounce");
        void floatingButton.offsetWidth;
        floatingButton.classList.add("cart-bounce");

        setTimeout(function () {
            floatingButton.classList.remove("cart-bounce");
        }, 650);
    }

    function showTemporaryButtonText(button, message, originalText) {
        button.textContent = message;

        setTimeout(function () {
            button.textContent = originalText;
        }, 1500);
    }

    function formatRM(value) {
        return "RM" + value.toFixed(2);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
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
