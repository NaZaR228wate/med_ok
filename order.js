/* ================= med_ok — order.js ================= */
/* Відображення кошика + Нова пошта + надсилання замовлення */

const CART_KEY = 'medok_cart_v1';
const API_BASE = 'https://medok-proxy.veter010709.workers.dev';

// форматування гривні
function formatUAH(n) {
  return '₴' + Number(n || 0).toLocaleString('uk-UA');
}

// завантаження кошика
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

/* ======== НОВА ПОШТА ======== */
async function fetchCities(query) {
  if (query.length < 2) return [];
  const res = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  return json?.data || [];
}

async function fetchWarehouses(city) {
  if (!city) return [];
  const res = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(city)}`);
  const json = await res.json();
  return json?.data || [];
}

function initNovaPoshta() {
  const cityInput = document.querySelector('#citySearch');
  const citySelect = document.querySelector('#city');
  const warehouseSelect = document.querySelector('#warehouse');

  if (!cityInput || !citySelect || !warehouseSelect) return;

  let lastCityQuery = '';

  // автопошук міст
  cityInput.addEventListener('input', async () => {
    const query = cityInput.value.trim();
    if (query.length < 2 || query === lastCityQuery) return;
    lastCityQuery = query;

    citySelect.innerHTML = `<option>Завантаження...</option>`;
    const cities = await fetchCities(query);
    if (cities.length) {
      citySelect.innerHTML = cities
        .map(c => `<option value="${c.Description}">${c.Description}</option>`)
        .join('');
    } else {
      citySelect.innerHTML = `<option value="">Місто не знайдено</option>`;
    }
  });

  // при виборі міста — підтягуємо відділення
  citySelect.addEventListener('change', async () => {
    const city = citySelect.value;
    warehouseSelect.innerHTML = `<option>Завантаження...</option>`;
    const warehouses = await fetchWarehouses(city);
    if (warehouses.length) {
      warehouseSelect.innerHTML = warehouses
        .map(w => `<option value="${w.Description}">${w.Description}</option>`)
        .join('');
    } else {
      warehouseSelect.innerHTML = `<option value="">Немає відділень</option>`;
    }
  });
}

/* ======== КОШИК ======== */
function renderCartBlock() {
  const items = loadCart();
  if (!items.length) return;

  const form = document.querySelector('#order');
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
    const row = document.createElement('div');
    row.className = 'order-item card';
    const lineSum = i.price * i.count;
    sum += lineSum;
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <b>${idx + 1}. ${i.type}</b><br>
          <small>${i.qty} л × ${i.count} шт — ${formatUAH(i.price)} / шт</small>
        </div>
        <div><b>${formatUAH(lineSum)}</b></div>
      </div>
    `;
    list.appendChild(row);
  });

  totalEl.textContent = formatUAH(sum);
  const payTotal = document.querySelector('#payTotal');
  if (payTotal) payTotal.textContent = formatUAH(sum);
}

/* ======== ВІДПРАВКА ЗАМОВЛЕННЯ ======== */
async function sendOrder(data) {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

function initForm() {
  const form = document.querySelector('#order');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const items = loadCart();
    if (!items.length) {
      alert('Кошик порожній 😅');
      return;
    }

    const name = form.querySelector('#name')?.value.trim();
    const phone = form.querySelector('#phone')?.value.trim();
    const np_city = form.querySelector('#city')?.value.trim();
    const np_warehouse = form.querySelector('#warehouse')?.value.trim();

    if (!name || !phone) {
      alert('Будь ласка, введіть імʼя та номер телефону 📞');
      return;
    }
    if (!np_city || !np_warehouse) {
      alert('Будь ласка, оберіть місто та відділення Нової пошти 🏤');
      return;
    }

    const data = {
      from_cart: true,
      cart: items,
      cart_total: items.reduce((s, i) => s + i.price * i.count, 0),
      name,
      phone,
      pay: form.querySelector('input[name="pay"]:checked')?.value || 'cod',
      np_city,
      np_warehouse,
      comment: form.querySelector('#comment')?.value.trim(),
    };

    try {
      const json = await sendOrder(data);
      if (json.ok) {
        alert('✅ Замовлення надіслано!');
        localStorage.removeItem(CART_KEY);
        form.reset();
        window.location.href = 'index.html';
      } else {
        alert('❌ Помилка: ' + (json.error || 'невідомо'));
      }
    } catch (err) {
      console.error(err);
      alert('⚠️ Не вдалося надіслати замовлення. Перевір інтернет або сервер.');
    }
  });
}

/* ======== ІНІЦІАЛІЗАЦІЯ ======== */
document.addEventListener('DOMContentLoaded', () => {
  renderCartBlock();
  initForm();
  initNovaPoshta();
});
