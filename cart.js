/* cart.js — Rozetka-style (Fixed Header & Footer) */

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

function updateCartBadge(){
    const badge = $('#cartQtyBadge');
    if (!badge) return;
    const items = loadCart();
    const qty = items.reduce((s,i)=> s + (Number(i.count)||0), 0);
    badge.textContent = qty;
    badge.style.display = qty ? 'inline-block' : 'none';
}

// 1. СТИЛІ (Забезпечують прилипання кнопок до низу)
function injectCartStyles() {
    if ($('#cartStyles')) return;
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.innerHTML = `
        #cartOverlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); opacity: 0; pointer-events: none;
            transition: opacity 0.3s; z-index: 999999; backdrop-filter: blur(4px);
        }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }

        #cartDrawer {
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 100%; max-width: 420px; background: #fff;
            transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            z-index: 1000000; display: flex; flex-direction: column; /* Важливо! */
        }
        #cartDrawer.active { transform: translateX(0); }

        .cart-header {
            padding: 16px 20px; border-bottom: 1px solid #f0f0f0;
            display: flex; align-items: center; justify-content: space-between;
            flex-shrink: 0; background: #fff;
        }

        .cart-body {
            flex: 1; overflow-y: auto; padding: 20px;
            -webkit-overflow-scrolling: touch;
        }

        .cart-footer {
            padding: 20px; border-top: 1px solid #f0f0f0; 
            flex-shrink: 0; background: #fff;
            padding-bottom: calc(20px + env(safe-area-inset-bottom)); /* Фікс для iPhone */
        }

        .cart-item {
            background: #fff; border: 1px solid #eee; border-radius: 16px; 
            padding: 14px; margin-bottom: 12px;
        }

        body.cart-open { overflow: hidden; position: fixed; width: 100%; }
        
        .empty-cart-btn {
            display: inline-block; padding: 14px 24px; background: #087B04;
            color: #fff; border-radius: 14px; font-weight: 900; 
            text-decoration: none; margin-top: 20px;
        }
    `;
    document.head.appendChild(style);
}

// 2. СТВОРЕННЯ ЕЛЕМЕНТІВ (Тільки один раз)
function ensureCartUI(){
    if ($('#cartDrawer')) return;
    injectCartStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header">
            <span style="font-weight:900; font-size:20px;">🛒 Кошик</span>
            <button onclick="closeCart()" style="border:none;background:#f5f5f5;width:36px;height:36px;border-radius:50%;cursor:pointer;">✕</button>
        </div>
        <div id="cartBody" class="cart-body"></div>
        <div class="cart-footer" id="cartFooter">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <b style="font-size:17px;color:#666;">Разом</b>
                <b id="cartTotal" style="color:#087B04;font-size:24px;">₴0</b>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="clearAll()" style="flex:1; border:none; background:#f5f5f5; padding:14px; border-radius:12px; font-weight:700; color:#888;">Очистити</button>
                <a href="order.html" style="flex:2; text-align:center; text-decoration:none; background:#087B04; color:#fff; padding:14px; border-radius:12px; font-weight:900; font-size:18px;">Оформити</a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    overlay.onclick = closeCart;
}

// 3. РЕНДЕР ТОВАРІВ
function renderCart(){
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    const footer = $('#cartFooter');
    if (!body || !totalEl) return;

    const items = loadCart();
    const sum = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0);
    totalEl.textContent = formatUAH(sum);

    if (!items.length){
        footer.style.display = 'none'; // Ховаємо кнопки, якщо пусто
        body.innerHTML = `
            <div style="text-align:center; padding:60px 10px;">
                <div style="font-size:50px;">🍯</div>
                <p style="color:#888; margin:20px 0; font-size:16px;">Ваш кошик ще порожній.<br>Додайте мед на головній сторінці.</p>
                <a href="#products" onclick="closeCart()" class="empty-cart-btn">До продукції</a>
            </div>`;
        return;
    }

    footer.style.display = 'block'; // Показуємо кнопки
    body.innerHTML = items.map((i, idx) => `
        <div class="cart-item">
            <div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:12px;">
                <span style="font-size:16px;">${i.type} <br><small style="font-weight:400;color:#999;">${i.qty}л</small></span>
                <span style="color:#087B04; font-size:17px;">${formatUAH(i.price * i.count)}</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px; background:#f5f5f5; padding:4px 10px; border-radius:10px;">
                    <button onclick="changeQty(${idx},-1)" style="border:none;background:none;font-weight:900;font-size:20px;padding:5px 10px;cursor:pointer;">−</button>
                    <span style="font-weight:900;font-size:16px;">${i.count}</span>
                    <button onclick="changeQty(${idx},1)" style="border:none;background:none;font-weight:900;font-size:20px;padding:5px 10px;cursor:pointer;">+</button>
                </div>
                <button onclick="removeItem(${idx})" style="border:none;background:none;color:#ff4d4d;font-weight:700;cursor:pointer;">Видалити</button>
            </div>
        </div>
    `).join('');
}

// 4. ГЛОБАЛЬНІ КОМАНДИ
window.closeCart = () => {
    const o = $('#cartOverlay'), d = $('#cartDrawer');
    if (o && d) {
        o.classList.remove('active');
        d.classList.remove('active');
        document.body.classList.remove('cart-open');
    }
};

window.openCart = () => {
    ensureCartUI();
    renderCart();
    $('#cartOverlay').classList.add('active');
    $('#cartDrawer').classList.add('active');
    document.body.classList.add('cart-open');
};

window.changeQty = (idx, delta) => {
    const items = loadCart();
    items[idx].count = Math.max(1, (items[idx].count || 1) + delta);
    saveCart(items); renderCart();
};

window.removeItem = (idx) => {
    const items = loadCart();
    items.splice(idx, 1);
    saveCart(items); renderCart();
};

window.clearAll = () => {
    if(confirm('Очистити кошик?')) { saveCart([]); renderCart(); }
};

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    const btn = $('#cartBtn');
    if (btn) btn.onclick = (e) => { e.preventDefault(); openCart(); };
});
