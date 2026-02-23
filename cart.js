/* cart.js — Універсальний файл (Кошик + Мобільне меню) */

const CART_KEY = 'medok_cart_v1';
const $ = (s, r=document) => r.querySelector(s);
const formatUAH = (n) => '₴' + Number(n||0).toLocaleString('uk-UA');

// --- 1. ЛОГІКА МОБІЛЬНОГО МЕНЮ (БУРГЕР) ---
function initMobileMenu() {
    const burger = $('#burgerBtn');
    const close = $('#closeMenuBtn');
    const menu = $('#mobileMenu');
    const backdrop = $('#mobileBackdrop');
    const links = document.querySelectorAll('.mobile-link');

    if (!burger || !menu) return;

    const toggle = (show) => {
        if (show) {
            menu.classList.add('active');
            if (backdrop) backdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            menu.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    burger.onclick = () => toggle(true);
    if (close) close.onclick = () => toggle(false);
    if (backdrop) backdrop.onclick = () => toggle(false);

    links.forEach(link => {
        link.onclick = () => toggle(false);
    });
}

// --- 2. РОБОТА З КОШИКОМ ---
function loadCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}
function saveCart(items){
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
}
function updateCartBadge(){
    const badge = $('#cartQtyBadge');
    if (!badge) return;
    const items = loadCart();
    const qty = items.reduce((s,i)=> s + (Number(i.count)||0), 0);
    badge.textContent = qty;
    badge.style.display = qty ? 'inline-block' : 'none';
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
    const o = $('#cartOverlay'), d = $('#cartDrawer');
    if (o) o.classList.remove('active');
    if (d) d.classList.remove('active');
    document.body.classList.remove('cart-open');
    document.body.style.overflow = '';
};

window.openCart = () => {
    ensureCartUI(); 
    renderCart();
    $('#cartOverlay').classList.add('active');
    $('#cartDrawer').classList.add('active');
    document.body.classList.add('cart-open');
};

function ensureCartUI(){
    if ($('#cartDrawer')) return;
    injectCartStyles();
    const overlay = document.createElement('div'); overlay.id = 'cartOverlay';
    const drawer = document.createElement('div'); drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header"><b style="font-size:20px;">🛒 Кошик</b><button onclick="closeCart()" style="border:none;background:#eee;width:36px;height:36px;border-radius:50%;cursor:pointer;">✕</button></div>
        <div id="cartBody" class="cart-body"></div>
        <div class="cart-footer" id="cartFooter">
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;"><b>Разом</b><b id="cartTotal" style="color:#087B04;font-size:22px;">₴0</b></div>
            <div style="display:flex; gap:10px;">
                <button onclick="clearAll()" style="flex:1;border:none;background:#f3f3f3;padding:12px;border-radius:12px;font-weight:700;">Очистити</button>
                <a href="order.html" style="flex:2;text-align:center;text-decoration:none;background:#087B04;color:#fff;padding:12px;border-radius:12px;font-weight:900;">Оформити</a>
            </div>
        </div>`;
    document.body.appendChild(overlay); document.body.appendChild(drawer);
    overlay.onclick = closeCart;
}

function renderCart(){
    const body = $('#cartBody'), totalEl = $('#cartTotal'), footer = $('#cartFooter');
    if (!body || !totalEl) return;
    const items = loadCart();
    const sum = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0);
    totalEl.textContent = formatUAH(sum);

    if (!items.length){
        if(footer) footer.style.display = 'none';
        body.innerHTML = `<div style="text-align:center;padding:40px 0;"><p>Кошик порожній 🍯</p></div>`;
        return;
    }
    
    if(footer) footer.style.display = 'block';
    body.innerHTML = items.map((i, idx) => `
        <div class="cart-item">
            <div style="display:flex;justify-content:space-between;font-weight:800;">
                <span>${i.type} (${i.qty}л)</span>
                <span>${formatUAH(i.price * i.count)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;align-items:center;">
                <div>К-сть: ${i.count}</div>
                <button onclick="removeItem(${idx})" style="border:none;background:none;color:red;cursor:pointer;">Видалити</button>
            </div>
        </div>
    `).join('');
}

window.removeItem = (idx) => {
    let items = loadCart();
    items.splice(idx, 1);
    saveCart(items);
    renderCart();
};

window.clearAll = () => {
    if(confirm('Очистити кошик?')) {
        saveCart([]);
        renderCart();
    }
};

// --- 3. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ---
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізуємо бургер-меню
    initMobileMenu();
    
    // Оновлюємо значок кількості товарів
    updateCartBadge();

    // Навішуємо відкриття кошика на кнопку
    const cartBtn = $('#cartBtn');
    if (cartBtn) {
        cartBtn.onclick = (e) => {
            e.preventDefault();
            window.openCart();
        };
    }
});
