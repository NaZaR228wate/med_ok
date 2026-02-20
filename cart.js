/* cart.js — Універсальний фікс скролу (v202) */
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

function injectCartStyles() {
    if ($('#cartStyles')) return;
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.innerHTML = `
        #cartOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); opacity: 0; pointer-events: none;
            transition: opacity 0.3s; z-index: 100000; backdrop-filter: blur(4px);
        }
        #cartOverlay.active { opacity: 1; pointer-events: auto; }
        #cartDrawer {
            position: fixed; top: 0; right: 0; bottom: 0;
            width: 100%; max-width: 420px; background: #fff;
            transform: translateX(100%); transition: transform 0.3s ease-out;
            z-index: 100001; display: flex; flex-direction: column;
            box-shadow: -5px 0 30px rgba(0,0,0,0.3);
        }
        #cartDrawer.active { transform: translateX(0); }
        .cart-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .cart-body { flex: 1; overflow-y: auto; padding: 20px; -webkit-overflow-scrolling: touch; }
        .cart-footer { padding: 20px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
        .cart-item { background: #f9f9f9; border-radius: 16px; padding: 14px; margin-bottom: 12px; border: 1px solid #eee; }
        body.no-scroll { overflow: hidden !important; height: 100vh !important; width: 100%; position: fixed; }
    `;
    document.head.appendChild(style);
}

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
    const body = $('#cartBody'); const totalEl = $('#cartTotal'); const footer = $('#cartFooter');
    if (!body || !totalEl) return;
    const items = loadCart();
    const sum = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0);
    totalEl.textContent = formatUAH(sum);
    if (!items.length){
        if(footer) footer.style.display = 'none';
        body.innerHTML = `<div style="text-align:center;padding:50px 10px;"><div style="font-size:40px;">🍯</div><p style="color:#888;margin:15px 0;">Кошик порожній</p><a href="index.html#products" onclick="closeCart()" style="color:#087B04;font-weight:800;text-decoration:none;border:2px solid #087B04;padding:10px 20px;border-radius:12px;display:inline-block;">До продукції</a></div>`;
        return;
    }
    if(footer) footer.style.display = 'block';
    body.innerHTML = items.map((i, idx) => `
        <div class="cart-item">
            <div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:10px;"><span>${i.type} (${i.qty}л)</span><span style="color:#087B04;">${formatUAH(i.price * i.count)}</span></div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;background:#fff;padding:4px 8px;border-radius:10px;border:1px solid #ddd;">
                    <button onclick="changeQty(${idx},-1)" style="width:30px;height:30px;border:none;background:#eee;border-radius:6px;font-weight:900;cursor:pointer;">−</button>
                    <b style="min-width:20px;text-align:center;">${i.count}</b>
                    <button onclick="changeQty(${idx},1)" style="width:30px;height:30px;border:none;background:#eee;border-radius:6px;font-weight:900;cursor:pointer;">+</button>
                </div>
                <button onclick="removeItem(${idx})" style="border:none;background:none;color:#ff4d4d;font-weight:700;cursor:pointer;">Видалити</button>
            </div>
        </div>`).join('');
}

window.closeCart = () => {
    const o = $('#cartOverlay'); const d = $('#cartDrawer');
    if (o) o.classList.remove('active');
    if (d) d.classList.remove('active');
    document.body.classList.remove('no-scroll');
};
window.openCart = () => {
    ensureCartUI(); renderCart();
    $('#cartOverlay').classList.add('active');
    $('#cartDrawer').classList.add('active');
    document.body.classList.add('no-scroll');
};
window.changeQty = (idx, delta) => {
    const items = loadCart();
    items[idx].count = Math.max(1, (items[idx].count || 1) + delta);
    saveCart(items); renderCart();
};
window.removeItem = (idx) => {
    const items = loadCart(); items.splice(idx, 1);
    saveCart(items); renderCart();
};
window.clearAll = () => { if(confirm('Очистити кошик?')) { saveCart([]); renderCart(); } };

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    const btn = $('#cartBtn');
    if (btn) btn.onclick = (e) => { e.preventDefault(); openCart(); };
});
