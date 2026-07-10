const CART_KEY = 'medok_cart_v1';
const $ = (selector, root = document) => root.querySelector(selector);
const formatUAH = (value) => '₴' + Number(value || 0).toLocaleString('uk-UA');
const formatVolume = (qty) => `${String(qty).replace('.', ',')} л`;
const catalog = window.MEDOK_CATALOG;
const EMPTY_CHECKOUT_MESSAGE = 'Спочатку оберіть мед, а потім переходьте до оформлення.';
const CHECKOUT_NOTICE_KEY = 'medok_checkout_notice';
let lastCartTrigger = null;

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
}

function loadCart() {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
        const normalized = catalog ? catalog.normalizeCart(raw) : raw;
        if (catalog && catalog.hasCartChanged(raw, normalized)) {
            localStorage.setItem(CART_KEY, JSON.stringify(normalized));
        }
        return normalized;
    } catch {
        return [];
    }
}

function saveCart(items, announcement = '') {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:changed'));
    if (announcement) announceCart(announcement);
}

function hasCartItems() {
    return loadCart().some((item) => item && Number(item.count) > 0);
}

function cartQuantity(items = loadCart()) {
    return items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
}

function cartTotal(items = loadCart()) {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.count) || 0), 0);
}

function jarLabel(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} банка`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} банки`;
    return `${count} банок`;
}

function isCheckoutLink(link) {
    if (!(link instanceof HTMLAnchorElement)) return false;
    try {
        const url = new URL(link.href, window.location.href);
        return url.origin === window.location.origin && /\/order\.html$/i.test(url.pathname);
    } catch {
        return false;
    }
}

function showCheckoutNotice(message = EMPTY_CHECKOUT_MESSAGE) {
    injectCartStyles();
    let notice = $('#checkoutGuardNotice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'checkoutGuardNotice';
        notice.className = 'checkout-guard-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.remove('show');
    requestAnimationFrame(() => notice.classList.add('show'));
    clearTimeout(notice._hideTimer);
    notice._hideTimer = setTimeout(() => notice.classList.remove('show'), 3200);
}

function guideToProducts() {
    window.closeCart?.();
    const mobileMenu = $('#mobileMenu');
    const mobileBackdrop = $('#mobileBackdrop');
    mobileMenu?.classList.remove('active');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    mobileBackdrop?.classList.remove('active');
    $('#burgerBtn')?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    const products = document.getElementById('products');
    if (products) {
        showCheckoutNotice();
        products.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
        });
        window.history.replaceState(null, '', '#products');
        return;
    }

    try {
        sessionStorage.setItem(CHECKOUT_NOTICE_KEY, EMPTY_CHECKOUT_MESSAGE);
    } catch {
        // Navigation still works when storage is unavailable.
    }
    window.location.assign('index.html#products');
}

function guardCheckoutNavigation(event) {
    const link = event.target.closest('a[href]');
    if (!isCheckoutLink(link) || hasCartItems()) return;
    event.preventDefault();
    guideToProducts();
}

function updateCartBadge() {
    const badge = $('#cartQtyBadge');
    const totalHeader = $('#cartTotalHeader');
    const items = loadCart();
    const qty = cartQuantity(items);
    const total = cartTotal(items);

    if (badge) {
        badge.textContent = qty;
        badge.style.display = qty ? 'inline-grid' : 'none';
    }
    if (totalHeader) {
        totalHeader.textContent = formatUAH(total);
        totalHeader.style.display = qty ? 'flex' : 'none';
    }
}

function initMobileMenu() {
    const burger = $('#burgerBtn');
    const close = $('#closeMenuBtn');
    const menu = $('#mobileMenu');
    const backdrop = $('#mobileBackdrop');
    const links = document.querySelectorAll('.mobile-link');
    if (!burger || !menu) return;

    const toggle = (show) => {
        menu.classList.toggle('active', show);
        backdrop?.classList.toggle('active', show);
        menu.setAttribute('aria-hidden', String(!show));
        burger.setAttribute('aria-expanded', String(show));
        document.body.style.overflow = show ? 'hidden' : '';
    };

    burger.onclick = () => toggle(true);
    if (close) close.onclick = () => toggle(false);
    if (backdrop) backdrop.onclick = () => toggle(false);
    links.forEach((link) => { link.onclick = () => toggle(false); });
}

function injectCartStyles() {
    if ($('#cartStyles')) return;
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.textContent = `
        #cartOverlay { position: fixed; inset: 0; z-index: 100000; background: rgba(23,38,29,.58); opacity: 0; pointer-events: none; backdrop-filter: blur(5px); transition: opacity .28s ease; }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }
        #cartDrawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 100001; width: min(100%, 470px); display: flex; flex-direction: column; background: #fffdf8; color: #211a14; box-shadow: -26px 0 80px rgba(23,38,29,.22); transform: translateX(104%); transition: transform .42s cubic-bezier(.22,1,.36,1); }
        #cartDrawer.active { transform: translateX(0); }
        #cartDrawer:focus { outline: none; }
        .cart-header { min-height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px; border-bottom: 1px solid rgba(33,26,20,.12); }
        .cart-title { display: grid; gap: 2px; }
        .cart-title strong { font-family: Georgia,serif; font-size: 27px; font-weight: 500; line-height: 1; }
        .cart-title span { color: #6f6255; font-size: 12px; }
        .cart-close { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid rgba(33,26,20,.14); border-radius: 50%; background: transparent; color: #211a14; font-size: 25px; cursor: pointer; transition: transform .18s ease, border-color .18s ease; }
        .cart-close:hover { border-color: #9a5d20; transform: rotate(4deg); }
        .cart-body { flex: 1; overflow-y: auto; padding: 18px 24px 28px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .cart-item { display: grid; grid-template-columns: 82px minmax(0,1fr); gap: 15px; padding: 18px 0; border-bottom: 1px solid rgba(33,26,20,.11); }
        .cart-item:first-child { padding-top: 4px; }
        .cart-item-image { width: 82px; height: 92px; object-fit: cover; border-radius: 16px; background: #efe1c6; }
        .cart-item-main { min-width: 0; display: grid; gap: 10px; }
        .cart-item-head { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
        .cart-item-name { margin: 0; font-family: Georgia,serif; font-size: 20px; font-weight: 500; line-height: 1.15; }
        .cart-item-meta { margin: 3px 0 0; color: #6f6255; font-size: 12px; }
        .cart-item-sum { white-space: nowrap; font-weight: 800; }
        .cart-item-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .cart-stepper { display: inline-grid; grid-template-columns: 36px 38px 36px; align-items: center; min-height: 38px; overflow: hidden; border: 1px solid rgba(33,26,20,.16); border-radius: 999px; background: #fff; }
        .cart-stepper button { width: 36px; height: 36px; border: 0; background: transparent; color: #211a14; font-size: 20px; cursor: pointer; }
        .cart-stepper button:hover { background: #f6f0e3; }
        .cart-stepper button:disabled { color: #b8afa5; cursor: not-allowed; }
        .cart-stepper output { text-align: center; font-size: 14px; font-weight: 800; }
        .cart-remove { min-height: 38px; padding: 6px 0; border: 0; border-bottom: 1px solid transparent; background: transparent; color: #74685d; font-size: 12px; cursor: pointer; }
        .cart-remove:hover { border-color: currentColor; color: #8f3229; }
        .cart-empty { min-height: 100%; display: grid; place-content: center; justify-items: center; padding: 48px 18px; text-align: center; }
        .cart-empty-mark { width: 72px; height: 86px; display: grid; place-items: center; margin-bottom: 22px; border: 1px solid rgba(154,93,32,.22); border-radius: 52% 48% 50% 50% / 58% 58% 42% 42%; background: #f6f0e3; color: #9a5d20; font-family: Georgia,serif; font-size: 30px; }
        .cart-empty h2 { margin: 0; font-family: Georgia,serif; font-size: 28px; font-weight: 500; }
        .cart-empty p { max-width: 290px; margin: 10px 0 24px; color: #6f6255; }
        .cart-empty-cta { min-height: 48px; display: inline-flex; align-items: center; justify-content: center; padding: 12px 20px; border-radius: 999px; background: #23372b; color: #fff; font-weight: 750; text-decoration: none; }
        .cart-footer { flex-shrink: 0; padding: 20px 24px calc(20px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(33,26,20,.12); background: #fffdf8; box-shadow: 0 -14px 36px rgba(61,42,21,.05); }
        .cart-total-row { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
        .cart-total-label { display: grid; color: #6f6255; font-size: 12px; }
        .cart-total-label strong { color: #211a14; font-size: 15px; }
        #cartTotal { font-family: Georgia,serif; font-size: 32px; font-weight: 500; line-height: 1; }
        .cart-delivery-note { margin: 11px 0 16px; color: #6f6255; font-size: 11px; }
        .cart-footer-actions { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 12px; }
        .cart-clear { min-height: 46px; padding: 8px 4px; border: 0; border-bottom: 1px solid rgba(33,26,20,.18); background: transparent; color: #6f6255; font-weight: 650; cursor: pointer; }
        .cart-checkout { min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 18px; border-radius: 999px; background: #23372b; color: #fff; font-weight: 800; text-decoration: none; box-shadow: 0 12px 28px rgba(35,55,43,.18); transition: transform .18s ease, background .18s ease; }
        .cart-checkout:hover { background: #17261d; transform: translateY(-1px); }
        .cart-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        body.cart-open { overflow: hidden !important; }
        .checkout-guard-notice { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom)); z-index: 100100; width: min(calc(100% - 32px), 520px); padding: 14px 18px; border: 1px solid rgba(255,255,255,.16); border-radius: 16px; background: #17261d; color: #fff; box-shadow: 0 18px 55px rgba(23,38,29,.28); font-weight: 700; line-height: 1.45; text-align: center; opacity: 0; pointer-events: none; transform: translate(-50%,14px); transition: opacity .2s ease, transform .25s ease; }
        .checkout-guard-notice.show { opacity: 1; transform: translate(-50%,0); }
        @media (max-width: 520px) {
            #cartDrawer { width: 100%; }
            .cart-header { min-height: 76px; padding: 16px 18px; }
            .cart-body { padding: 14px 18px 24px; }
            .cart-footer { padding: 16px 18px calc(16px + env(safe-area-inset-bottom)); }
            .cart-item { grid-template-columns: 70px minmax(0,1fr); gap: 12px; }
            .cart-item-image { width: 70px; height: 82px; }
            .cart-item-name { font-size: 18px; }
            .cart-item-controls { align-items: end; }
        }
        @media (prefers-reduced-motion: reduce) {
            #cartOverlay, #cartDrawer, .cart-close, .cart-checkout, .checkout-guard-notice { transition: none; }
        }
    `;
    document.head.appendChild(style);
}

function announceCart(message) {
    const liveRegion = $('#cartLiveRegion');
    if (!liveRegion) return;
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
}

window.closeCart = () => {
    const drawer = $('#cartDrawer');
    const wasOpen = drawer?.classList.contains('active');
    $('#cartOverlay')?.classList.remove('active');
    $('#cartOverlay')?.setAttribute('aria-hidden', 'true');
    drawer?.classList.remove('active');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
    document.body.style.overflow = '';
    if (wasOpen && lastCartTrigger instanceof HTMLElement) lastCartTrigger.focus();
};

window.openCart = () => {
    ensureCartUI();
    renderCart();
    lastCartTrigger = document.activeElement;
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    overlay?.classList.add('active');
    overlay?.setAttribute('aria-hidden', 'false');
    drawer?.classList.add('active');
    drawer?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    requestAnimationFrame(() => $('#cartClose')?.focus());
};

function ensureCartUI() {
    if ($('#cartDrawer')) return;
    injectCartStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.id = 'cartDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'cartDrawerTitle');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('tabindex', '-1');
    drawer.innerHTML = `
        <header class="cart-header">
            <div class="cart-title">
                <strong id="cartDrawerTitle">Ваш кошик</strong>
                <span id="cartDrawerCount">Поки порожній</span>
            </div>
            <button id="cartClose" class="cart-close" type="button" aria-label="Закрити кошик">×</button>
        </header>
        <div id="cartBody" class="cart-body"></div>
        <footer class="cart-footer" id="cartFooter" hidden>
            <div class="cart-total-row">
                <span class="cart-total-label"><span>Разом</span><strong id="cartFooterCount"></strong></span>
                <strong id="cartTotal">—</strong>
            </div>
            <p class="cart-delivery-note">Доставка Новою поштою оплачується окремо за тарифами перевізника.</p>
            <div class="cart-footer-actions">
                <button class="cart-clear" type="button" data-cart-action="clear">Очистити</button>
                <a class="cart-checkout" href="order.html">Оформити замовлення <span aria-hidden="true">→</span></a>
            </div>
        </footer>
        <div id="cartLiveRegion" class="cart-live" role="status" aria-live="polite"></div>
    `;
    document.body.append(overlay, drawer);
    overlay.addEventListener('click', window.closeCart);
    $('#cartClose', drawer)?.addEventListener('click', window.closeCart);
    drawer.addEventListener('click', handleCartAction);
}

function renderCart() {
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    const footer = $('#cartFooter');
    const countEl = $('#cartDrawerCount');
    const footerCount = $('#cartFooterCount');
    if (!body || !totalEl || !footer) return;

    const items = loadCart();
    const qty = cartQuantity(items);
    const total = cartTotal(items);
    totalEl.textContent = formatUAH(total);
    if (countEl) countEl.textContent = items.length ? `${items.length} поз. · ${jarLabel(qty)}` : 'Поки порожній';
    if (footerCount) footerCount.textContent = jarLabel(qty);

    if (!items.length) {
        footer.hidden = true;
        const productsHref = document.getElementById('products') ? '#products' : 'index.html#products';
        body.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-mark" aria-hidden="true">M</div>
                <h2>Кошик чекає на ваш мед</h2>
                <p>Оберіть сорт і об’єм — ми збережемо все тут перед оформленням.</p>
                <a class="cart-empty-cta" href="${productsHref}">Обрати мед</a>
            </div>
        `;
        return;
    }

    footer.hidden = false;
    body.innerHTML = items.map((item, index) => {
        const product = catalog?.getProduct(item.productId);
        const name = product?.fullName || item.type;
        const image = product?.image || 'assets/medok-wordmark.png';
        return `
            <article class="cart-item" data-cart-index="${index}">
                <img class="cart-item-image" src="${escapeHTML(image)}" alt="" width="82" height="92">
                <div class="cart-item-main">
                    <div class="cart-item-head">
                        <div>
                            <h3 class="cart-item-name">${escapeHTML(name)}</h3>
                            <p class="cart-item-meta">${formatVolume(item.qty)} · ${formatUAH(item.price)} за банку</p>
                        </div>
                        <strong class="cart-item-sum">${formatUAH(item.price * item.count)}</strong>
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-stepper" aria-label="Кількість банок — ${escapeHTML(name)}">
                            <button type="button" data-cart-action="decrease" aria-label="Зменшити кількість ${escapeHTML(name)}" ${item.count <= 1 ? 'disabled' : ''}>−</button>
                            <output aria-label="Кількість">${item.count}</output>
                            <button type="button" data-cart-action="increase" aria-label="Збільшити кількість ${escapeHTML(name)}">+</button>
                        </div>
                        <button class="cart-remove" type="button" data-cart-action="remove">Прибрати</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function changeItemCount(index, delta) {
    const items = loadCart();
    const item = items[index];
    if (!item) return;
    item.count = Math.max(1, (Number(item.count) || 1) + delta);
    saveCart(items, `Кількість оновлено: ${item.count}`);
}

function removeItemAt(index) {
    const items = loadCart();
    if (!items[index]) return;
    const [removed] = items.splice(index, 1);
    saveCart(items, `${removed.type} прибрано з кошика`);
}

function handleCartAction(event) {
    const emptyCta = event.target.closest('.cart-empty-cta');
    if (emptyCta) {
        window.closeCart();
        return;
    }

    const control = event.target.closest('[data-cart-action]');
    if (!control) return;
    const action = control.dataset.cartAction;
    if (action === 'clear') {
        window.clearAll();
        return;
    }
    const item = control.closest('[data-cart-index]');
    const index = Number(item?.dataset.cartIndex);
    if (!Number.isInteger(index)) return;
    if (action === 'increase') changeItemCount(index, 1);
    if (action === 'decrease') changeItemCount(index, -1);
    if (action === 'remove') removeItemAt(index);
}

window.removeItem = (index) => removeItemAt(Number(index));

window.clearAll = () => {
    if (!loadCart().length || !confirm('Очистити весь кошик?')) return;
    saveCart([], 'Кошик очищено');
};

document.addEventListener('DOMContentLoaded', () => {
    const year = $('#y');
    if (year) year.textContent = new Date().getFullYear();

    initMobileMenu();
    updateCartBadge();

    const cartBtn = $('#cartBtn');
    if (cartBtn) {
        cartBtn.onclick = (event) => {
            event.preventDefault();
            window.openCart();
        };
    }

    try {
        const pendingNotice = sessionStorage.getItem(CHECKOUT_NOTICE_KEY);
        if (pendingNotice) {
            sessionStorage.removeItem(CHECKOUT_NOTICE_KEY);
            showCheckoutNotice(pendingNotice);
        }
    } catch {
        // The checkout guard does not depend on session storage.
    }
});

document.addEventListener('click', guardCheckoutNavigation);
document.addEventListener('keydown', (event) => {
    const drawer = $('#cartDrawer');
    if (!drawer?.classList.contains('active')) return;
    if (event.key === 'Escape') {
        window.closeCart();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

window.MEDOK_CART = {
    hasItems: hasCartItems,
    guideToProducts,
    open: window.openCart,
    emptyCheckoutMessage: EMPTY_CHECKOUT_MESSAGE
};

window.addEventListener('cart:changed', () => {
    updateCartBadge();
    if ($('#cartDrawer')?.classList.contains('active')) renderCart();
});
