/* ================= med_ok — order.js ================= */
/* Кошик на сторінці замовлення + Нова пошта + надсилання в Worker */

const CART_KEY  = 'medok_cart_v1';
const API_BASE  = 'https://medok-proxy.veter010709.workers.dev';
const API_ORDER = `${API_BASE}/order`;

(() => {
    const y = document.getElementById('y');
    if (y) y.textContent = new Date().getFullYear();
})();

/* ────────── Утиліти ────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');
const debounce = (fn, ms = 350) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

/* ────────── Нова пошта (API) ────────── */
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

    let sum = 0;
    const list = section.querySelector('#orderList');
    const totalEl = section.querySelector('#orderTotal');

    items.forEach((i, idx) => {
        const line = (Number(i.price)||0) * (Number(i.count)||0);
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

/* ────────── Меню (бургер) ────────── */
function initNav() {
    const toggle = document.getElementById('menuBtn');
    const nav    = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    const close = () => {
        nav.dataset.open = 'false';
        nav.setAttribute('aria-hidden', 'true');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        nav.dataset.open = 'true';
        nav.removeAttribute('aria-hidden');
        toggle.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    close();

    toggle.addEventListener('click', () => {
        nav.dataset.open === 'true' ? close() : open();
    });

    document.addEventListener('click', (e) => {
        if (nav.dataset.open !== 'true') return;
        if (nav.contains(e.target) || toggle.contains(e.target)) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    const syncDesktop = () => {
        if (window.matchMedia('(min-width: 900px)').matches) {
            nav.dataset.open = 'true';
            nav.removeAttribute('aria-hidden');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    };

    syncDesktop();
    window.addEventListener('resize', syncDesktop);
}

/* ────────── Відправлення ────────── */
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

function initForm() {
    const form = $('#order');
    if (!form) return;

    // Забороняємо Enter у пошуку міста (щоб не сабмітило форму)
    $('#citySearch')?.addEventListener('keydown', (e)=>{ if (e.key==='Enter') e.preventDefault(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const items = loadCart();
        if (!items.length) {
            alert('Кошик порожній 😅 Спочатку додайте товари.');
            return;
        }

        const data = buildOrderData(form, items);

        // Жорстка валідація (усі поля, окрім коментаря)
        const required = {
            'Ім’я': data.name,
            'Телефон': data.phone,
            'Місто (НП)': data.np_city,
            'Відділення (НП)': data.np_warehouse,
        };
        for (const [label, val] of Object.entries(required)) {
            if (!val) { alert(`Будь ласка, заповніть поле: ${label}`); return; }
        }

        try {
            const json = await sendOrder(data);
            if (json?.ok) {
                alert('✅ Замовлення надіслано!');
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

/* ────────── Поля Нової пошти з плейсхолдерами ────────── */
function initNovaPoshta() {
    const cityInput       = $('#citySearch');
    const citySelect      = $('#city');
    const warehouseSelect = $('#warehouse');
    const whStatus        = $('#wh-status'); // опційно

    if (!cityInput || !citySelect || !warehouseSelect) return;

    const setEmptyCity = (text = 'Оберіть місто зі списку') => {
        citySelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
        citySelect.disabled = false;
        citySelect.selectedIndex = 0;
    };
    const setEmptyWarehouse = (text = 'Оберіть відділення') => {
        warehouseSelect.innerHTML = `<option value="" selected>— ${text} —</option>`;
        warehouseSelect.disabled = false;
        warehouseSelect.selectedIndex = 0;
    };

    const setCityOptions = (cities) => {
        if (!cities.length) {
            setEmptyCity('Місто не знайдено');
            setEmptyWarehouse('Спочатку оберіть місто');
            return;
        }
        citySelect.innerHTML = [
            `<option value="" selected>— Оберіть місто —</option>`,
            ...cities.map(c => `<option value="${c.Description}">${c.Description}</option>`)
        ].join('');
        citySelect.disabled = false;
        citySelect.selectedIndex = 0;
        setEmptyWarehouse('Спочатку оберіть місто');
    };

    const setWarehouseOptions = (warehouses) => {
        if (whStatus) whStatus.textContent = '';
        if (!warehouses.length) {
            setEmptyWarehouse('Немає відділень');
            return;
        }
        warehouseSelect.innerHTML = [
            `<option value="" selected>— Оберіть відділення —</option>`,
            ...warehouses.map(w => `<option value="${w.Description}">${w.Description}</option>`)
        ].join('');
        warehouseSelect.disabled = false;
        warehouseSelect.selectedIndex = 0;
    };

    // стартовий стан
    setEmptyCity('Спочатку введіть 2+ літери');
    setEmptyWarehouse('Спочатку оберіть місто');

    // пошук міст (з дебаунсом)
    cityInput.addEventListener('input', debounce(async () => {
        const q = cityInput.value.trim();
        if (q.length < 2) {
            setEmptyCity('Спочатку введіть 2+ літери');
            setEmptyWarehouse('Спочатку оберіть місто');
            return;
        }
        citySelect.innerHTML = `<option value="" selected>— Завантаження… —</option>`;
        citySelect.disabled = false;
        const cities = await fetchCities(q).catch(()=>[]);
        setCityOptions(cities);
    }, 350));

    // вибір міста -> тягнемо відділення
    citySelect.addEventListener('change', async () => {
        const city = citySelect.value.trim();
        if (!city) { setEmptyWarehouse('Спочатку оберіть місто'); return; }
        warehouseSelect.innerHTML = `<option value="" selected>— Завантаження… —</option>`;
        warehouseSelect.disabled = false;
        if (whStatus) whStatus.textContent = 'Завантажуємо відділення…';
        const list = await fetchWarehousesByCityName(city).catch(()=>[]);
        setWarehouseOptions(list);
    });
}

/* ────────── Старт ────────── */
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    // якщо кошик порожній — назад до товарів
    const initialItems = loadCart();
    if (!initialItems || initialItems.length === 0) {
        window.location.href = 'index.html#products';
        return;
    }

    renderCartBlock();
    initForm();
    initNovaPoshta();
});
