/* med_ok — order.js */
/* Кошик + Нова пошта + оф-канвас меню + надсилання в Worker */

const CART_KEY  = 'medok_cart_v1';
const API_BASE  = 'https://medok-proxy.veter010709.workers.dev';
const API_ORDER = `${API_BASE}/order`;

/* ───── helpers ───── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');
const debounce = (fn, ms = 350) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

(function setYear(){ const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear(); })();
const setStatus = (el, text = '') => { if (el) el.textContent = text; };

function showToast(msg = '✅ Готово') {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = msg;
  Object.assign(toast.style,{
    position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',
    background:'#111',color:'#fff',padding:'10px 14px',borderRadius:'12px',
    opacity:'1',transition:'.25s opacity',zIndex:'9999'
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 1400);
}

/* ───── NP API ───── */
async function fetchCities(q) {
  if ((q||'').trim().length < 2) return [];
  const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(q)}`);
  const j = await r.json().catch(()=>({}));
  return Array.isArray(j?.data) ? j.data : [];
}
async function fetchWarehousesByCityName(city) {
  if (!city) return [];
  const r = await fetch(`${API_BASE}/np/warehouses?