/* med_ok — order.js ================= */
/* Замовлення + Нова Пошта + Телеграм + "Подяка" з ультра-надійним редіректом */

const CART_KEY  = 'medok_cart_v1';
const API_BASE  = 'https://medok-proxy.veter010709.workers.dev';
const API_ORDER = `${API_BASE}/order`;

/* Рік у футері */
(() => { const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear(); })();

/* ────────── Глобальний прапорець для безпечної навігації ────────── */
window.__allowNavigate = false;

/* ────────── Утиліти ────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');
const debounce = (fn, ms = 350) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

/* ────────── UI helpers ────────── */
function showSuccessToast(msg = '✅ Замовлення надіслано!') {
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position:'fixed', left:'50%', bottom:'24px', transform:'translateX(-50%)',
    background:'#111', color:'#fff', padding:'10px 14px', borderRadius:'12px',
    opacity:'0.95', zIndex:9999, fontFamily:'Inter,system-ui,sans-serif'
  });
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.opacity='0.2'; setTimeout(()=>toast.remove(), 280); }, 1200);
}
function setStatus(el, text = '') { if (el) el.textContent = text; }

/* ────────── Нова Пошта (API) ────────── */
async function fetchCities(q) {
  if ((q||'').trim().length < 2) return [];
  const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(q)}`);
  const j = await r.json().catch(()=>({}));
  return Array.isArray(j?.data) ? j.data : [];
}
async function fetchWarehousesByCityName(city) {
  if (!city) return [];
  const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(city)}`);
  const j = await r.json().catch(()=>({}));
  return Array.isArray(j?.data) ? j.data : [];
}

/* ────────── Кошик ────────── */
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function renderCartBlock() {
  const items = loadCart();
  if (!items.length) return;
  const form = $('#order'); if (!form) return;

  const section = document.createElement('section');
  section.className = 'card';
  section.style.marginBottom = '20px';
  section.innerHTML = `
    <h2 class="section-subtitle">Ваше замовлення</h2>
    <div id="orderList" style="display:grid;gap:10px;margin-bottom:10px;"></div>
    <p style="font-weight:700">Разом: <span id="orderTotal">₴0</span></p>
  `;
  form.parentElement.insertBefore(section, form);

  let sum = 0;
  const list = section.querySelector('#orderList');
  const totalEl = section.querySelector('#orderTotal');

  items.forEach((i, idx) => {
    const line = (Number(i.price)||0) * (Number(i.count)||0);
    sum += line;
    const row = document.createElement('div');
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <b>${idx + 1}. ${i.type}</b><br>
          <small>${i.qty} л × ${i.count} шт — ${formatUAH(i.price)} / шт</small>
        </div>
        <div><b>${formatUAH(line)}</b></div>
      </div>
    `;
    list.appendChild(row);
  });

  totalEl.textContent = formatUAH(sum);
  const payTotal = $('#payTotal');
  if (payTotal) payTotal.textContent = formatUAH(sum);
}

/* ────────── Меню (бургер) ────────── */
function initNav() {
  const toggle = document.getElementById('menu-toggle');
  const nav    = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  const close = () => { nav.dataset.open='false'; nav.setAttribute('aria-hidden','true'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); };
  const open  = () => { nav.dataset.open='true';  nav.removeAttribute('aria-hidden');   toggle.classList.add('is-open');    toggle.setAttribute('aria-expanded','true'); };

  close();
  toggle.addEventListener('click', () => { nav.dataset.open === 'true' ? close() : open(); });
  document.addEventListener('click', (e) => { if (nav.dataset.open !== 'true') return; if (nav.contains(e.target) || toggle.contains(e.target)) return; close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  const syncDesktop = () => {
    if (window.matchMedia('(min-width: 900px)').matches) {
      nav.dataset.open = 'true'; nav.removeAttribute('aria-hidden'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false');
    }
  };
  syncDesktop();
  window.addEventListener('resize', syncDesktop);
}

/* ────────── Формування та відправка ────────── */
function buildOrderData(form, items) {
  return {
    from_cart: true,
    cart: items,
    cart_total: items.reduce((s, i) => s + (Number(i.price)||0) * (Number(i.count)||0), 0),

    name:  $('#name', form)?.value.trim(),
    phone: $('#phone', form)?.value.trim(),
    pay:   form.querySelector('input[name="pay"]:checked')?.value || 'cod',

    np_city:      $('#city', form)?.value.trim(),
    np_warehouse: $('#warehouse', form)?.value.trim(),

    comment: $('#comment', form)?.value.trim(),
  };
}

async function sendOrder(data) {
  const r = await fetch(API_ORDER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

/* ────────── НАДІЙНИЙ РЕДІРЕКТ ────────── */
function goThankYou(orderId) {
  const base = new URL('/thank-you.html', location.origin).href;
  const target = orderId ? `${base}?order=${encodeURIComponent(String(orderId))}` : base;

  // 1) відключаємо все, що може заважати виходу
  window.__allowNavigate = true;
  try { window.onbeforeunload = null; window.onpagehide = null; window.onunload = null; } catch {}

  // 2) кілька способів поспіль
  try { location.replace(target); } catch {}
  setTimeout(() => { try { location.href = target; } catch {} }, 60);
  setTimeout(() => { try { location.assign(target); } catch {} }, 140);

  // 3) жорсткий фолбек — сабміт формою GET (деякі SW/розширення це не чіпляють)
  setTimeout(() => {
    const f = document.createElement('form');
    f.method = 'GET';
    f.action = base;
    if (orderId) {
      const inp = document.createElement('input');
      inp.type = 'hidden'; inp.name = 'order'; inp.value = String(orderId);
      f.appendChild(inp);
    }
    document.body.appendChild(f);
    try { f.submit(); } catch {}
  }, 220);

  // 4) останній шанс
  setTimeout(() => { try { window.open(target, '_self'); } catch {} }, 300);
}

function initForm() {
  const form = $('#order');
  if (!form) return;

  // Забороняємо Enter у пошуку міста
  $('#citySearch')?.addEventListener('keydown', (e)=>{ if (e.key==='Enter') e.preventDefault(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const items = loadCart();
    if (!items.length) {
      showSuccessToast('😅 Кошик порожній — додайте товари');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const data = buildOrderData(form, items);

    // Валідація
    const required = {
      'Ім’я': data.name,
      'Телефон': data.phone,
      'Місто (НП)': data.np_city,
      'Відділення (НП)': data.np_warehouse,
    };
    for (const [label, val] of Object.entries(required)) {
      if (!val) {
        showSuccessToast(`Будь ласка, заповніть поле: ${label}`);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    }

    try {
      const json = await sendOrder(data);

      if (json?.ok) {
        showSuccessToast('✅ Замовлення надіслано!');

        // зберігаємо короткий підсумок (щоб показати на "Подяці")
        try {
          sessionStorage.setItem('medok_last_order', JSON.stringify({
            name:  data.name,
            phone: data.phone,
            pay:   data.pay,
            np_city: data.np_city,
            np_warehouse: data.np_warehouse,
            from_cart: true,
            cart: data.cart,
            total: data.cart_total
          }));
        } catch {}

        // чистимо кошик + форму
        try { localStorage.removeItem(CART_KEY); } catch {}
        form.reset();

        // ПЕРЕХІД (з невеличкою паузою, щоб тост мигнув)
        const orderId = json.order_id || '';
        setTimeout(() => goThankYou(orderId), 600);
      } else {
        showSuccessToast('❌ Помилка: ' + (json?.error || 'невідомо'));
      }
    } catch (err) {
      console.error(err);
      showSuccessToast('⚠️ Не вдалося надіслати замовлення. Перевірте інтернет.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* ────────── Нова Пошта: плейсхолдери + індикатори + автопам'ять ────────── */
function initNovaPoshta() {
  const cityInput       = $('#citySearch');
  const citySelect      = $('#city');
  const warehouseSelect = $('#warehouse');
  const whStatus        = $('#wh-status');
  if (!cityInput || !citySelect || !warehouseSelect) return;

  let cityStatus = document.getElementById('city-status');
  if (!cityStatus) {
    cityStatus = document.createElement('div');
    cityStatus.id = 'city-status';
    cityStatus.className = 'muted';
    cityInput.insertAdjacentElement('afterend', cityStatus);
  }
  cityStatus.setAttribute('role','status');
  cityStatus.setAttribute('aria-live','polite');
  if (whStatus) { whStatus.setAttribute('role','status'); whStatus.setAttribute('aria-live','polite'); }

  const SAVED_CITY_KEY = 'medok_np_city';
  const SAVED_WH_KEY   = 'medok_np_warehouse';

  const setEmptyCity = (text='Оберіть місто зі списку') => {
    citySelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
    citySelect.disabled = false; citySelect.selectedIndex = 0;
  };
  const setEmptyWarehouse = (text='Оберіть відділення') => {
    warehouseSelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
    warehouseSelect.disabled = false; warehouseSelect.selectedIndex = 0;
  };

  const setCityOptions = (cities) => {
    if (!cities.length) { setEmptyCity('Місто не знайдено'); setEmptyWarehouse('Спочатку оберіть місто'); return; }
    citySelect.innerHTML = [`<option value="" selected>— Оберіть місто —</option>`, ...cities.map(c=>`<option value="${c.Description}">${c.Description}</option>`)].join('');
    citySelect.disabled = false; citySelect.selectedIndex = 0;
    setEmptyWarehouse('Спочатку оберіть місто');
  };

  const setWarehouseOptions = (warehouses) => {
    setStatus(whStatus,'');
    if (!warehouses.length) { setEmptyWarehouse('Немає відділень'); return; }
    warehouseSelect.innerHTML = [`<option value="" selected>— Оберіть відділення —</option>`, ...warehouses.map(w=>`<option value="${w.Description}">${w.Description}</option>`)].join('');
    warehouseSelect.disabled = false; warehouseSelect.selectedIndex = 0;
  };

  setEmptyCity('Спочатку введіть 2+ літери');
  setEmptyWarehouse('Спочатку оберіть місто');

  cityInput.addEventListener('input', debounce(async () => {
    const q = cityInput.value.trim();
    if (q.length < 2) { setEmptyCity('Спочатку введіть 2+ літери'); setEmptyWarehouse('Спочатку оберіть місто'); setStatus(cityStatus,''); return; }
    setStatus(cityStatus,'🔄 Завантаження міст…'); setEmptyCity('Завантаження…');
    try {
      const cities = await fetchCities(q);
      setCityOptions(cities);
      setStatus(cityStatus, cities.length ? '' : 'Місто не знайдено');
    } catch { setStatus(cityStatus,'Помилка завантаження'); setEmptyCity('Помилка завантаження'); }
  }, 350));

  citySelect.addEventListener('change', async () => {
    const city = citySelect.value;
    if (!city) { setEmptyWarehouse('Спочатку оберіть місто'); return; }
    localStorage.setItem(SAVED_CITY_KEY, city);
    localStorage.removeItem(SAVED_WH_KEY);
    setStatus(whStatus,'🔄 Завантаження відділень…'); setEmptyWarehouse('Завантаження…');
    try {
      const list = await fetchWarehousesByCityName(city);
      setWarehouseOptions(list);
      const savedWh = localStorage.getItem(SAVED_WH_KEY);
      if (savedWh) warehouseSelect.value = savedWh;
    } catch { setStatus(whStatus,'Помилка завантаження'); setEmptyWarehouse('Помилка завантаження'); }
  });

  warehouseSelect.addEventListener('change', () => {
    const val = warehouseSelect.value;
    if (val) localStorage.setItem(SAVED_WH_KEY, val);
    else localStorage.removeItem(SAVED_WH_KEY);
  });

  (async () => {
    const saved = localStorage.getItem(SAVED_CITY_KEY);
    if (!saved) return;
    cityInput.value = saved;
    setStatus(cityStatus, '🔄 Завантаження міст…');
    try {
      const cities = await fetchCities(saved);
      setCityOptions(cities);
      citySelect.value = saved;
      setStatus(cityStatus, '');
      setStatus(whStatus, '🔄 Завантаження відділень…');
      const list = await fetchWarehousesByCityName(saved);
      setWarehouseOptions(list);
      const savedWh = localStorage.getItem(SAVED_WH_KEY);
      if (savedWh) warehouseSelect.value = savedWh;
    } catch { setStatus(cityStatus, ''); setStatus(whStatus, ''); }
  })();
}

/* ────────── Init ────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderCartBlock();
  initNav();
  initNovaPoshta();
  initForm();
});

/* Запам'ятовуємо ім’я та телефон */
(function rememberContact(){
  const nameEl = document.getElementById('name');
  const phoneEl = document.getElementById('phone');
  if (!nameEl || !phoneEl) return;
  const K1 = 'medok_name'; const K2 = 'medok_phone';
  try {
    const n = localStorage.getItem(K1) || ''; const p = localStorage.getItem(K2) || '';
    if (n) nameEl.value = n; if (p) phoneEl.value = p;
  } catch {}
  nameEl.addEventListener('input', () => { try { localStorage.setItem(K1, nameEl.value); } catch {} });
  phoneEl.addEventListener('input', () => { try { localStorage.setItem(K2, phoneEl.value); } catch {} });
})();

/* Попередження при виході, якщо кошик не порожній (поважає редірект) */
(function guardLeaving(){
  window.addEventListener('beforeunload', (e) => {
    try {
      if (window.__allowNavigate) return;
      const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; }
    } catch {}
  });
})();