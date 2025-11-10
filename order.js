/* ================= med_ok — order.js ================= */
/* Відображення кошика + надсилання замовлення через Worker */

const CART_KEY = 'medok_cart_v1';
const API_URL  = 'https://medok-proxy.veter010709.workers.dev/order'; // твій Cloudflare Worker

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

        const data = buildOrderData(form, items);

        try {
            const json = await sendOrder(data);
            if (json.ok) {
                alert('✅ Замовлення успішно надіслано!');
                localStorage.removeItem(CART_KEY);
                form.reset();
                window.location.href = 'index.html'; // можна прибрати, якщо не хочеш редірект
            } else {
                alert('❌ Помилка: ' + (json.error || 'невідомо'));
            }
        } catch (err) {
            console.error(err);
            alert('⚠️ Не вдалося надіслати замовлення. Перевір з’єднання.');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCartBlock();
    initForm();
});
