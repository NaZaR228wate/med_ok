/* cart.js — Rozetka-style fixed drawer for mobile */

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

// 1. СТИЛІ (Повне блокування екрана та примусовий скрол)
function injectCartStyles() {
    if ($('#cartStyles')) return;
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.innerHTML = `
        #cartOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); opacity: 0; pointer-events: none;
            transition: opacity 0.3s; z-index: 999999; backdrop-filter: blur(4px);
        }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }

        #cartDrawer {
            position: fixed; top: 0; right: 0; width: 100%; max-width: 440px; 
            height: 100%; background: #fff; z-index: 1000000;
            transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            display: flex; flex-direction: column; overflow: hidden;
        }
        #cartDrawer.active { transform: translateX(0); }

        .cart-header {
            padding: 20px; border-bottom: 1px solid #f0f0f0;
            display: flex; align-items: center; justify-content: space-between;
            background: #fff; flex-shrink: 0;
        }
        
        /* ЦЕЙ БЛОК ТЕПЕР ТОЧНО БУДЕ ГОРТАТИСЯ */
        .cart-body {
            flex: 1 1 auto; overflow-y: scroll; /* Примусовий скрол */
            padding: 20px; -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
        }
        
        .cart-footer {
            padding: 20px; border-top: 1px solid #f0f0f0; background: #fff;
            flex-shrink: 0; padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        .cart-item {
            background: #fff; border: 1px solid #eee; border-radius: 16px; 
            padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        
        /* Блокування скролу фонової сторінки */
        body.cart-open {
            overflow: hidden !important;
            position: fixed;
            width: 100%;
            height: 100%;
        }
    `;
    document.head.appendChild(style);
}

// 2. СТВОРЕННЯ UI
function ensureCartUI(){
    if ($('#cartDrawer')) return;
    injectCartStyles();

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header">
            <span style="font-weight:900; font-size:22px;">🛒 Кошик</span>
            <button onclick="closeCart()" style="border:none;background:#f0f0f0;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div id="cartBody" class="cart-body"></div>
        <div class="cart-footer">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <b style="font-size:18px;color:#666;">Разом</b>
                <b id="cartTotal" style="color:#087B04;font-size:26px;">₴0</b>
            </div>
            <div style="display:flex; gap:12px;">
                <button onclick="clearAll()" style="flex:1;border:none;background:#f5f5f5;padding:16px;border-radius:16px;font-weight:800;color:#888;">Очистити</button>
                <a href="order.html" class="checkout-btn" style="flex:2;text-align:center;text-decoration:none;background:#087B04;color:#fff;padding:16px;border-radius:16px;font-weight:900;font-size:18px;">Оформити</a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.onclick = closeCart;
}

function renderCart(){
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    if (!body || !totalEl) return;

    const items = loadCart();
    const sum = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0);
    totalEl.textContent = formatUAH(sum);

    if (!items.length){
        body.innerHTML = `
            <div style="text-align:center; padding:100px 20px;">
                <div style="font-size:60px; margin-bottom:20px;">🍯</div>
                <p style="color:#888; font-size:18px; margin-bottom:30px;">Кошик порожній</p>
                <a href="#products" class="close-link" style="display:inline-block; padding:15px 30px; border:2px solid #087B04; color:#087B04; border-radius:16px; font-weight:900; text-decoration:none;">ДО ПРОДУКЦІЇ</a>
            </div>`;
        
        // Гарантоване закриття при кліку на посилання
        body.querySelectorAll('.close-link').forEach(link => {
            link.onclick = (e) => { closeCart(); };
        });
        return;
    }

    body.innerHTML = items.map((i, idx) => `
        <div class="cart-item">
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:18px;margin-bottom:15px;">
                <span>${i.type} <br><small style="font-weight:400;color:#999;font-size:14px;">${i.qty}л</small></span>
                <span style="color:#087B04;">${formatUAH(i.price * i.count)}</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:15px; background:#f0f0f0; padding:6px 12px; border-radius:12px;">
                    <button onclick="changeQty(${idx},-1)" style="width:30px;height:30px;border:none;background:none;font-weight:900;font-size:20px;cursor:pointer;">−</button>
                    <span style="font-weight:900;font-size:18px;min-width:20px;text-align:center;">${i.count}</span>
                    <button onclick="changeQty(${idx},1)" style="width:30px;height:30px;border:none;background:none;font-weight:900;font-size:20px;cursor:pointer;">+</button>
                </div>
                <button onclick="removeItem(${idx})" style="border:none;background:none;color:#ff4d4d;font-weight:700;cursor:pointer;font-size:15px;">Видалити</button>
            </div>
        </div>
    `).join('');
}

// 3. ГЛОБАЛЬНІ ФУНКЦІЇ
window.closeCart = () => {
    const o = $('#cartOverlay');
    const d = $('#cartDrawer');
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
    document.body.classList.add('cart-open'); // Фіксуємо сторінку
};

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

window.clearAll = () => {
    if(confirm('Очистити кошик?')) {
        saveCart([]);
        renderCart();
    }
};

// 4. ІНІЦІАЛІЗАЦІЯ
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    const btn = $('#cartBtn');
    if (btn) {
        btn.onclick = (e) => {
            e.preventDefault();
            openCart();
        };
    }
    
    // Закриваємо кошик, якщо людина натиснула на посилання в меню або десь ще
    document.addEventListener('click', (e) => {
        if (e.target.closest('a') && !e.target.closest('.checkout-btn')) {
            closeCart();
        }
    });
});
