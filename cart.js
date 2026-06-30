const CART_KEY = 'medok_cart_v1';
const $ = (s, r = document) => r.querySelector(s);
const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');
const catalog = window.MEDOK_CATALOG;

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

function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:changed'));
}

function updateCartBadge() {
    const badge = $('#cartQtyBadge');
    const totalHeader = $('#cartTotalHeader');
    const items = loadCart();
    const qty = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.count) || 0), 0);

    if (badge) {
        badge.textContent = qty;
        badge.style.display = qty ? 'inline-block' : 'none';
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
    style.innerHTML = `
        #cartOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 100000; backdrop-filter: blur(4px); }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }
        #cartDrawer { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 420px; background: #fff; transform: translateX(100%); transition: transform 0.3s ease-out; z-index: 100001; display: flex; flex-direction: column; box-shadow: -5px 0 30px rgba(0,0,0,0.3); }
        #cartDrawer.active { transform: translateX(0); }
        .cart-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .cart-body { flex: 1; overflow-y: auto; padding: 20px; -webkit-overflow-scrolling: touch; }
        .cart-footer { padding: 20px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
        .cart-item { background: #f9f9f9; border-radius: 16px; padding: 14px; margin-bottom: 12px; border: 1px solid #eee; }
        body.cart-open { overflow: hidden !important; }
    `;
    document.head.appendChild(style);
}

window.closeCart = () => {
    $('#cartOverlay')?.classList.remove('active');
    $('#cartDrawer')?.classList.remove('active');
    document.body.classList.remove('cart-open');
    document.body.style.overflow = '';
};

window.openCart = () => {
    ensureCartUI();
    renderCart();
    $('#cartOverlay')?.classList.add('active');
    $('#cartDrawer')?.classList.add('active');
    document.body.classList.add('cart-open');
};

function ensureCartUI() {
    if ($('#cartDrawer')) return;
    injectCartStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header"><b style="font-size:20px;">🛒 Кошик</b><button onclick="closeCart()" style="border:none;background:#eee;width:36px;height:36px;border-radius:50%;cursor:pointer;">✕</button></div>
        <div id="cartBody" class="cart-body"></div>
        <div class="cart-footer" id="cartFooter">
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;"><b>Разом</b><b id="cartTotal" style="color:#087B04;font-size:22px;">—</b></div>
            <div style="display:flex; gap:10px;">
                <button onclick="clearAll()" style="flex:1;border:none;background:#f3f3f3;padding:12px;border-radius:12px;font-weight:700;">Очистити</button>
                <a href="order.html" style="flex:2;text-align:center;text-decoration:none;background:#087B04;color:#fff;padding:12px;border-radius:12px;font-weight:900;">Оформити</a>
            </div>
        </div>`;
    document.body.append(overlay, drawer);
    overlay.onclick = closeCart;
}

function renderCart() {
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    const footer = $('#cartFooter');
    if (!body || !totalEl) return;

    const items = loadCart();
    const sum = items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.count) || 0), 0);
    totalEl.textContent = formatUAH(sum);

    if (!items.length) {
        if (footer) footer.style.display = 'none';
        body.innerHTML = '<div style="text-align:center;padding:40px 0;"><p>Кошик порожній 🍯</p></div>';
        return;
    }

    if (footer) footer.style.display = 'block';
    body.innerHTML = items.map((item, idx) => `
        <div class="cart-item">
            <div style="display:flex;justify-content:space-between;font-weight:800;gap:10px;">
                <span>${item.type} (${item.qty} л)</span>
                <span>${formatUAH(item.price * item.count)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;align-items:center;">
                <div>${formatUAH(item.price)} / шт · К-сть: ${item.count}</div>
                <button onclick="removeItem(${idx})" style="border:none;background:none;color:red;cursor:pointer;">Видалити</button>
            </div>
        </div>
    `).join('');
}

window.removeItem = (idx) => {
    const items = loadCart();
    items.splice(idx, 1);
    saveCart(items);
    renderCart();
};

window.clearAll = () => {
    if (!confirm('Очистити кошик?')) return;
    saveCart([]);
    renderCart();
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
});

window.addEventListener('cart:changed', () => {
    updateCartBadge();
    if ($('#cartDrawer')?.classList.contains('active')) renderCart();
});
