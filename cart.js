/* cart.js — фікс прокрутки для мобільних пристроїв */

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

function ensureCartUI(){
    if ($('#cartOverlay')) return;

    // Створюємо фон
    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,.5);
        opacity:0; pointer-events:none; transition:.3s; z-index:2000;
    `;

    // Створюємо вікно кошика
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.style.cssText = `
        position:fixed; top:0; right:0; bottom:0;
        width:min(420px, 92vw); background:#fff;
        transform:translateX(105%); transition:.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index:2001; box-shadow:-10px 0 30px rgba(0,0,0,0.2);
        display:flex; flex-direction:column; /* Робимо колонку */
        height: 100%; /* Для старих браузерів */
        height: 100dvh; /* Для нових (враховує панель адреси) */
    `;

    drawer.innerHTML = `
    <!-- Шапка кошика (завжди зверху) -->
    <div style="padding:18px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
      <div style="font-weight:900; font-size:20px;">🛒 Кошик</div>
      <button id="cartCloseBtn" style="border:none;background:#f3f3f3;border-radius:12px;padding:10px 14px;cursor:pointer;font-size:18px;">✕</button>
    </div>

    <!-- Тіло кошика (ГОРТАЄТЬСЯ) -->
    <div id="cartBody" style="padding:16px; overflow-y:auto; flex-grow:1; -webkit-overflow-scrolling:touch;">
        <!-- Сюди рендеряться товари -->
    </div>

    <!-- Підсумок (завжди знизу) -->
    <div style="padding:18px; border-top:1px solid #eee; flex-shrink:0; background:#fff; padding-bottom: calc(18px + env(safe-area-inset-bottom));">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <b style="font-size:18px;">Разом</b>
        <b id="cartTotal" style="color:#087B04; font-size:22px;">₴0</b>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="cartClearBtn" style="flex:1;border:none;background:#f3f3f3;border-radius:14px;padding:14px;cursor:pointer;font-weight:800;font-size:15px;">Очистити</button>
        <a href="order.html" style="flex:1.5;text-align:center;text-decoration:none;background:#087B04;color:#fff;border-radius:14px;padding:14px;font-weight:900;font-size:17px;">Оформити</a>
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
        body.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#888;">Кошик порожній 🍯</div>`;
        return;
    }

    body.innerHTML = items.map((i, idx) => `
      <div style="border:1px solid #eee; border-radius:16px; padding:14px; margin-bottom:12px; background:#fafafa;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div style="font-weight:800; font-size:16px; line-height:1.3;">${i.type} (${i.qty} л)</div>
          <div style="font-weight:900; color:#087B04;">${formatUAH(i.price * i.count)}</div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px; background:#fff; padding:4px; border-radius:12px; border:1px solid #eee;">
            <button onclick="changeQty(${idx}, -1)" style="width:34px;height:34px;border:none;background:#f3f3f3;border-radius:10px;cursor:pointer;font-weight:900;">−</button>
            <span style="font-weight:900;min-width:20px;text-align:center;">${i.count}</span>
            <button onclick="changeQty(${idx}, 1)" style="width:34px;height:34px;border:none;background:#f3f3f3;border-radius:10px;cursor:pointer;font-weight:900;">+</button>
          </div>
          <button onclick="removeItem(${idx})" style="border:none; background:none; color:#ff4d4d; font-weight:700; cursor:pointer; font-size:14px;">Видалити</button>
        </div>
      </div>
    `).join('');
}

// Глобальні функції для кнопок всередині рядка (через innerHTML)
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
    $('#cartOverlay').style.opacity = '1';
    $('#cartOverlay').style.pointerEvents = 'auto';
    $('#cartDrawer').style.transform = 'translateX(0)';
    document.body.style.overflow = 'hidden'; // Блокуємо скрол основної сторінки
}

function closeCart(){
    if (!$('#cartDrawer')) return;
    $('#cartOverlay').style.opacity = '0';
    $('#cartOverlay').style.pointerEvents = 'none';
    $('#cartDrawer').style.transform = 'translateX(105%)';
    document.body.style.overflow = ''; // Повертаємо скрол
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    const btn = $('#cartBtn');
    if (btn) btn.onclick = (e) => { e.preventDefault(); openCart(); };
});
