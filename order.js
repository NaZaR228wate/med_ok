/* ================= med_ok — order.js ================= */
/* Відображення кошика + надсилання замовлення через Worker */

const CART_KEY = 'medok_cart_v1';
// Базовий URL для всіх запитів до твого Cloudflare Worker
const API_BASE = 'https://medok-proxy.veter010709.workers.dev';
// Шлях для надсилання замовлення
const API_URL  = `${API_BASE}/order`;

// форматування гривні
function formatUAH(n) {
    return '₴' + Number(n || 0).toLocaleString('uk-UA');
}
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

// завантаження кошика
function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

// створюємо блок з товарами
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

// формуємо тіло замовлення
function buildOrderData(form, items) {
    return {
        from_cart: true,
        cart: items,
        cart_total: items.reduce((s, i) => s + i.price * i.count, 0),
        name: form.querySelector('#name')?.value.trim(),
        phone: form.querySelector('#phone')?.value.trim(),
        pay: form.querySelector('input[name="pay"]:checked')?.value || 'cod',
        np_city: form.querySelector('#city')?.value.trim(),
        np_warehouse: form.querySelector('#warehouse')?.value.trim(),
        comment: form.querySelector('#comment')?.value.trim(),
    };
}

// відправка замовлення
async function sendOrder(data) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

// обробка відправлення
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

        // Перевіряємо обов’язкові поля (ім’я, телефон, місто, відділення)
        const nameVal      = form.querySelector('#name')?.value.trim();
        const phoneVal     = form.querySelector('#phone')?.value.trim();
        const cityVal      = form.querySelector('#city')?.value.trim();
        const warehouseVal = form.querySelector('#warehouse')?.value.trim();
        if (!nameVal || !phoneVal || !cityVal || !warehouseVal) {
            alert('Будь ласка, заповніть всі обов’язкові поля (Ім’я, Телефон, Місто, Відділення).');
            return;
        }

        const data = buildOrderData(form, items);

        try {
            const json = await sendOrder(data);
            if (json.ok) {
                alert('✅ Замовлення успішно надіслано!');
                localStorage.removeItem(CART_KEY);
                form.reset();
                window.location.href = 'index.html';
            } else {
                alert('❌ Помилка: ' + (json.error || 'невідомо'));
            }
        } catch (err) {
            console.error(err);
            alert('⚠️ Не вдалося надіслати замовлення. Перевірте з’єднання.');
        }
    });
}
function initNovaPoshta() {
    const cityInput       = document.querySelector('#citySearch');
    const citySelect      = document.querySelector('#city');
    const warehouseSelect = document.querySelector('#warehouse');

    if (!cityInput || !citySelect || !warehouseSelect) return;

    // утиліти для встановлення плейсхолдерів та стану
    const setEmptyCity = (text = 'Спочатку введіть 2+ літери у полі вище…') => {
        citySelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
        citySelect.disabled = true;
        citySelect.selectedIndex = 0;
    };
    const setEmptyWarehouse = (text = 'Спочатку оберіть місто') => {
        warehouseSelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
        warehouseSelect.disabled = true;
        warehouseSelect.selectedIndex = 0;
    };

    // початковий стан
    setEmptyCity();
    setEmptyWarehouse();

    // автопошук міст
    let lastCityQuery = '';
    cityInput.addEventListener('input', async () => {
        const query = cityInput.value.trim();
        if (query === lastCityQuery) return;
        lastCityQuery = query;

        // якщо менше 2 символів — повертаємо початковий стан
        if (query.length < 2) {
            setEmptyCity();
            setEmptyWarehouse();
            return;
        }

        // показуємо завантаження
        citySelect.innerHTML = `<option value="" selected>— Завантаження… —</option>`;
        citySelect.disabled = true;

        try {
            const cities = await fetchCities(query);
            if (!cities || !cities.length) {
                // немає результатів
                citySelect.innerHTML = `<option value="" selected>— Місто не знайдено —</option>`;
                citySelect.disabled = true;
                // залишаємо warehouse порожнім
                setEmptyWarehouse();
                return;
            }

            // вставляємо плейсхолдер і результати
            citySelect.innerHTML = [
                `<option value="" selected disabled>— Оберіть місто —</option>`,
                ...cities.map(c => `<option value="${c.Description}">${c.Description}</option>`)
            ].join('');
            citySelect.disabled = false;
            citySelect.selectedIndex = 0;

            // після завантаження міст скидаємо відділення
            setEmptyWarehouse();
        } catch (err) {
            console.error('fetchCities error', err);
            setEmptyCity('Помилка завантаження міст');
            setEmptyWarehouse();
        }
    });

    // при виборі міста — підтягуємо відділення
    citySelect.addEventListener('change', async () => {
        const city = citySelect.value.trim();
        if (!city) {
            setEmptyWarehouse();
            return;
        }
        // показуємо завантаження
        warehouseSelect.innerHTML = `<option value="" selected>— Завантаження… —</option>`;
        warehouseSelect.disabled = true;
        warehouseSelect.selectedIndex = 0;
        try {
            const warehouses = await fetchWarehouses(city);
            if (!warehouses || !warehouses.length) {
                warehouseSelect.innerHTML = `<option value="" selected disabled>— Немає відділень —</option>`;
                warehouseSelect.disabled = true;
                return;
            }
            warehouseSelect.innerHTML = [
                `<option value="" selected disabled>— Оберіть відділення —</option>`,
                ...warehouses.map(w => `<option value="${w.Description}">${w.Description}</option>`)
            ].join('');
            warehouseSelect.disabled = false;
            warehouseSelect.selectedIndex = 0;
        } catch (err) {
            console.error('fetchWarehouses error', err);
            warehouseSelect.innerHTML = `<option value="" selected disabled>— Помилка завантаження —</option>`;
            warehouseSelect.disabled = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCartBlock();
    initForm();
    initNovaPoshta(); // підключаємо пошук міст
});
