/* cart.js — фінальна версія з виправленим скролом для мобільних */

const CART_KEY = 'medok_cart_v1';

const $ = (s, r=document) => r.querySelector(s);
const formatUAH = (n) => '₴' + Number(n||0).toLocaleString('uk-UA');

function loadCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}

function saveCart(items){
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
}

function cartTotal(items){ 
    return items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0); 
}

function updateCartBadge(){
    const badge = $('#cartQtyBadge');
    if (!badge) return;
    const items = loadCart();
    const qty = items.reduce((s,i)=> s + (Number(i.count)||0), 0);
    badge.textContent = qty;
    badge.style.display = qty ? 'inline-block' : 'none';
}

// Додаємо стилі окремим блоком для надійності
function injectCartStyles() {
    if ($('#cartStyles')) return;
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.innerHTML = `
        #cartOverlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 2000;
            backdrop-filter: blur(2px);
        }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }

        #cartDrawer {
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 100%; max-width: 400px; background: #fff;
            transform: translateX(105%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 2001; box-shadow: -10px 0 30px rgba(0,0,0,0.1);
            display: flex; flex-direction: column;
            height: 100dvh;
        }
        #cartDrawer.active { transform: translateX(0); }

        .cart-header {
            padding: 20px; border-bottom: 1px solid #eee;
            display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .cart-body {
            padding: 20px; overflow-y: auto; flex-grow: 1;
            -webkit-overflow-scrolling: touch;
        }
        .cart-footer {
            padding: 20px; border-top: 1px solid #eee; flex-shrink: 0;
            padding-bottom: calc(20px + env(safe-area-inset-bottom));
            background: #fff;
        }
        .cart-item {
            border: 1px solid #f0f0f0; border-radius: 16px; padding: 15px;
            margin-bottom: 15px; background: #fafafa;
        }
        .cart-item-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .cart-item-title { font-weight: 800; font-size: 17px; color: #111; }
        .cart-item-price { font-weight: 900; color: #087B04; font-size: 17px; }
        .cart-controls { display: flex; align-items: center; justify-content: space-between; }
        .qty-btns { 
            display: flex; align-items: center; gap: 15px; 
            background: #fff; border: 1px solid #eee; padding: 5px 10px; border-radius: 12px;
        }
        .qty-btn {
            width: 32px; height: 32px; border: none; background: #f3f3f3;
            border-radius: 8px; cursor: pointer; font-weight: 900; font-size: 18px;
        }
    `;
    document.head.appendChild(style);
}

function ensureCartUI(){
    if ($('#cartDrawer')) return;
    injectCartStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header">
            <b style="font-size:22px;">🛒 Кошик</b>
            <button id="cartCloseBtn" style="border:none;background:#f3f3f3;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:20px;">✕</button>
        </div>
        <div id="cartBody" class="cart-body"></div>
        <div class="cart-footer">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <b style="font-size:18px; color:#666;">Разом</b>
                <b id="cartTotal" style="color:#087B04; font-size:24px;">₴0</b>
            </div>
            <div style="display:flex; gap:12px;">
                <button id="cartClearBtn" style="flex:1; border:none; background:#f3f3f3; padding:16px; border-radius:14px; font-weight:800; color:#666;">Очистити</button>
                <a href="order.html" style="flex:2; text-align:center; text-decoration:none; background:#087B04; color:#fff; padding:16px; border-radius:14px; font-weight:900; font-size:18px;">Оформити</a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.onclick = closeCart;
    $('#cartCloseBtn').onclick = closeCart;
    $('#cartClearBtn').onclick = () => { if(confirm('Очистити кошик?')) { saveCart([]); renderCart(); } };
}

function renderCart(){
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    if (!body || !totalEl) return;

    const items = loadCart();
    totalEl.textContent = formatUAH(cartTotal(items));

    if (!items.length){
        body.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <div style="font-size:50px; margin-bottom:20px;">🍯</div>
                <div style="color:#888; font-weight:600;">Ваш кошик ще порожній</div>
                <button onclick="closeCart()" style="margin-top:20px; border:none; background:none; color:#087B04; font-weight:800; cursor:pointer;">Перейти до меду</button>
            </div>`;
        return;
    }

    body.innerHTML = items.map((i, idx) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-title">${i.type} <br><small style="font-weight:400; color:#888;">${i.qty} л</small></div>
                <div class="cart-item-price">${formatUAH(i.price * i.count)}</div>
            </div>
            <div class="cart-controls">
                <div class="qty-btns">
                    <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
                    <b style="min-width:20px; text-align:center; font-size:18px;">${i.count}</b>
                    <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                </div>
                <button onclick="removeItem(${idx})" style="border:none; background:none; color:#ff4d4d; font-weight:700; cursor:pointer;">Видалити</button>
            </div>
        </div>
    `).join('');
}

window.changeQty = (idx, delta) => {
    const items = loadCart();
    items[idx].count = Math.max(1, (items[idx].count || 1) + delta);
    saveCart(items);
    renderCart();
};

window.removeItem = (idx) => {
    const items = loadCart();
    items.splice(idx, 1);
    saveCart(items);
    renderCart();
};

function openCart(){
    ensureCartUI();
    renderCart();
    // Додаємо класи active замість прямої зміни стилів
    $('#cartOverlay').classList.add('active');
    $('#cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart(){
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    const btn = $('#cartBtn');
    if (btn) btn.onclick = (e) => { e.preventDefault(); openCart(); };
});
