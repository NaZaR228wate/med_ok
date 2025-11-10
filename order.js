/* ================= med_ok — order.js ================= */
/* Кошик на сторінці замовлення + Нова пошта + надсилання в Worker */

const CART_KEY = 'medok_cart_v1';

// БАЗА твого Cloudflare Worker (без слеша в кінці!)
const API_BASE = 'https://medok-proxy.veter010709.workers.dev';

// Ендпоінт надсилання замовлення
const API_ORDER = `${API_BASE}/order`;

// ───────────── Утиліти ─────────────
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');

const debounce = (fn, ms = 350) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// ───────────── Нова пошта (API) ─────────────
async function fetchCities(query) {
  if (query.length < 2) return [];
  const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(query)}`);
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j?.data) ? j.data : [];
}

async function fetchWarehousesByCityName(cityName) {
  if (!cityName) return [];
  const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(cityName)}`);
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j?.data) ? j.data : [];
}

// ───────────── Кошик (з localStorage) ─────────────
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function renderCartBlock() {
  const items = loadCart();
  if (!items.length) return;

  const form = $('#order');
  if (!form) return;

  const section = document.createElement('section');
  section.className = 'card';
  section.style.marginBottom = '20px';
  section.innerHTML = `
    <h2 class="section-subtitle">Ваше замовлення</h2>
    <div id="orderList" style="display:grid;gap:10px;margin-bottom:10px;"></div>
    <p style="font-weight:700">Разом: <span id="orderTotal">₴0</span></p>
  `;
  form.parentElement.insertBefore(section, form);

  const list = section.querySelector('#orderList');
  const totalEl = section.querySelector('#orderTotal');

  let sum = 0;
  items.forEach((i, idx) => {
    const line = i.price * i.count;
    sum += line;
    const row = document.createElement('div');
    row.className = 'order-item card';
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

// ───────────── Формування і надсилання замовлення ─────────────
function buildOrderData(form, items) {
  return {
    from_cart: true,
    cart: items,
    cart_total: items.reduce((s, i) => s + i.price * i.count, 0),
    name:  $('#name', form)?.value.trim(),
    phone: $('#phone', form)?.value.trim(),
    pay:   form.querySelector('input[name="pay"]:checked')?.value || 'cod',

    // важливо: передаємо саме текст значень
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

// ───────────── Ініціалізація форми ─────────────
function initForm() {
  const form = $('#order');
  if (!form) return;

  // Забороняємо випадковий submit при Enter у пошуку міста
  $('#citySearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const items = loadCart();
    if (!items.length) {
      alert('Кошик порожній 😅');
      return;
    }

    // Жорстка перевірка міста/відділення
    const city = $('#city')?.value.trim();
    const wh   = $('#warehouse')?.value.trim();
    if (!city)    { alert('Будь ласка, оберіть місто Нової пошти.'); return; }
    if (!wh)      { alert('Будь ласка, оберіть відділення Нової пошти.'); return; }

    const data = buildOrderData(form, items);

    try {
      const json = await sendOrder(data);
      if (json?.ok) {
        alert('✅ Замовлення успішно надіслано!');
        localStorage.removeItem(CART_KEY);
        form.reset();
        window.location.href = 'index.html';
      } else {
        alert('❌ Помилка: ' + (json?.error || 'невідомо'));
      }
    } catch (err) {
      console.error(err);
      alert('⚠️ Не вдалося надіслати замовлення. Перевірте інтернет або конфіг воркера.');
    }
  });
}

// ───────────── Інпут/селекти Нової пошти ─────────────
function initNovaPoshta() {
  const cityInput       = $('#citySearch');
  const citySelect      = $('#city');
  const warehouseSelect = $('#warehouse');
  const whStatus        = $('#wh-status');

  if (!cityInput || !citySelect || !warehouseSelect) return;

  const setCityOptions = (cities) => {
    if (!cities.length) {
      citySelect.innerHTML = `<option value="">Місто не знайдено</option>`;
      citySelect.disabled = true;
      warehouseSelect.innerHTML = `<option value="">Спочатку оберіть місто</option>`;
      warehouseSelect.disabled = true;
      return;
    }
    citySelect.innerHTML = cities
      .map(c => `<option value="${c.Description}">${c.Description}</option>`)
      .join('');
    citySelect.disabled = false;
    // Скидаємо відділення
    warehouseSelect.innerHTML = `<option value="">Спочатку оберіть місто</option>`;
    warehouseSelect.disabled = true;
  };

  const setWarehouseOptions = (warehouses) => {
    if (whStatus) whStatus.textContent = '';
    if (!warehouses.length) {
      warehouseSelect.innerHTML = `<option value="">Немає відділень</option>`;
      warehouseSelect.disabled = true;
      return;
    }
    warehouseSelect.innerHTML = warehouses
      .map(w => `<option value="${w.Description}">${w.Description}</option>`)
      .join('');
    warehouseSelect.disabled = false;
  };

  // Автопошук міст
  cityInput.addEventListener('input', debounce(async () => {
    const q = cityInput.value.trim();
    if (q.length < 2) {
      setCityOptions([]);
      return;
    }
    const cities = await fetchCities(q).catch(() => []);
    setCityOptions(cities);
  }, 350));

  // Після вибору міста — вантажимо відділення
  citySelect.addEventListener('change', async () => {
    const city = citySelect.value.trim();
    if (!city) { setWarehouseOptions([]); return; }
    warehouseSelect.innerHTML = `<option value="">Завантаження...</option>`;
    warehouseSelect.disabled = true;
    if (whStatus) whStatus.textContent = 'Завантажуємо відділення…';
    const list = await fetchWarehousesByCityName(city).catch(() => []);
    setWarehouseOptions(list);
  });
}

// ───────────── Старт ─────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCartBlock();
  initForm();
  initNovaPoshta();
});
