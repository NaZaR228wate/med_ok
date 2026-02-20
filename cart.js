/* cart.js — shared cart modal for all pages */

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
function cartQty(items){ return items.reduce((s,i)=> s + (Number(i.count)||0), 0); }
function cartTotal(items){ return items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0); }

function updateCartBadge(){
    const badge = $('#cartQtyBadge');
    if (!badge) return;
    const items = loadCart();
    const qty = cartQty(items);
    badge.textContent = qty;
    badge.style.display = qty ? 'inline-block' : 'none';
}

function ensureCartUI(){
    if ($('#cartOverlay')) return;

    // Фон (overlay)
    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,.45);
        opacity:0; pointer-events:none; transition:.2s; z-index:2000;
    `;

    // Вікно кошика (drawer)
    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.style.cssText = `
        position:fixed; top:0; right:0; height:100dvh; width:min(420px, 92vw);
        background:#fff; transform:translateX(105%);
        transition:.25s; z-index:2001; box-shadow:-10px 0 30px rgba(0,0,0,.2);
        display:flex; flex-direction:column; /* ВАЖЛИВО для скролу */
    `;

    drawer.innerHTML = `
    <div style="padding:16px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
      <div style="font-weight:900; font-size:20px;">🛒 Кошик</div>
      <button id="cartCloseBtn" style="border:none;background:#f3f3f3;border-radius:12px;padding:10px 15px;cursor:pointer;font-size:18px;">✕</button>
    </div>

    <!-- Область зі списком товарів - тепер вона буде гортатися -->
    <div id="cartBody" style="padding:16px; overflow-y:auto; flex-grow:1; -webkit-overflow-scrolling:touch;"></div>

    <div style="padding:16px; border-top:1px solid #eee; flex-shrink:0; background:#fff;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <b style="font-size:18px;">Разом</b>
        <b id="cartTotal" style="color:#087B04; font-size:22px;">₴0</b>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="cartClearBtn" style="flex:1;border:none;background:#f3f3f3;border-radius:14px;padding:14px;cursor:pointer;font-weight:800;">Очистити</button>
        <a href="order.html" style="flex:1.5;text-align:center;text-decoration:none;background:#087B04;color:#fff;border-radius:14px;padding:14px;font-weight:900;font-size:18px;">Оформити</a>
      </div>
    </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeCart);
    $('#cartCloseBtn').addEventListener('click', closeCart);

    $('#cartClearBtn').addEventListener('click', ()=>{
        saveCart([]);
        renderCart();
    });
}

function openCart(){
    ensureCartUI();
    renderCart();
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    drawer.style.transform = 'translateX(0)';
    document.body.style.overflow = 'hidden';
}

function closeCart(){
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    if (!overlay || !drawer) return;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    drawer.style.transform = 'translateX(105%)';
    document.body.style.overflow = '';
}

function renderCart(){
    const body = $('#cartBody');
    const totalEl = $('#cartTotal');
    if (!body || !totalEl) return;

    const items = loadCart();
    totalEl.textContent = formatUAH(cartTotal(items));

    if (!items.length){
        body.innerHTML = `
      <div style="padding:14px;border:1px dashed #ddd;border-radius:14px;color:#555;">
        Кошик порожній. Додайте мед на головній сторінці 🙂
      </div>
      <div style="margin-top:10px;">
        <a href="index.html#products" style="display:inline-block;text-decoration:none;background:#111;color:#fff;border-radius:14px;padding:12px 14px;font-weight:900;">
          Перейти до продукції
        </a>
      </div>
    `;
        return;
    }

    body.innerHTML = items.map((i, idx)=>{
        const line = (Number(i.price)||0)*(Number(i.count)||0);
        return `
      <div style="border:1px solid #eee;border-radius:14px;padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div style="min-width:0;">
            <b>${idx+1}. ${String(i.type||'')}</b><br>
            <small style="color:#666">${String(i.qty||'')} л × ${Number(i.count)||0} шт</small>
          </div>
          <div style="font-weight:900;color:#087B04;white-space:nowrap;">${formatUAH(line)}</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
          <button data-dec="${idx}" style="width:40px;height:40px;border:none;background:#f3f3f3;border-radius:12px;cursor:pointer;font-weight:900;">−</button>
          <div style="min-width:34px;text-align:center;font-weight:900;">${Number(i.count)||0}</div>
          <button data-inc="${idx}" style="width:40px;height:40px;border:none;background:#f3f3f3;border-radius:12px;cursor:pointer;font-weight:900;">+</button>
          <button data-del="${idx}" style="margin-left:auto;border:none;background:#fff3f3;color:#b00020;border-radius:12px;padding:10px 12px;cursor:pointer;font-weight:900;">
            Видалити
          </button>
        </div>
      </div>
    `;
    }).join('');

    body.querySelectorAll('[data-inc]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = Number(btn.getAttribute('data-inc'));
            const items = loadCart();
            items[idx].count = (Number(items[idx].count)||0) + 1;
            saveCart(items);
            renderCart();
        });
    });

    body.querySelectorAll('[data-dec]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = Number(btn.getAttribute('data-dec'));
            const items = loadCart();
            items[idx].count = Math.max(1, (Number(items[idx].count)||1) - 1);
            saveCart(items);
            renderCart();
        });
    });

    body.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const idx = Number(btn.getAttribute('data-del'));
            const items = loadCart();
            items.splice(idx, 1);
            saveCart(items);
            renderCart();
        });
    });
}

document.addEventListener('DOMContentLoaded', ()=>{
    updateCartBadge();

    const cartBtn = $('#cartBtn');
    if (cartBtn){
        cartBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            openCart();
            navigator.vibrate?.(20);
        });
    }
});
