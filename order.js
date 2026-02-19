// order.js
(() => {
    'use strict';
    const CART_KEY = 'medok_cart_v1';
    const API_BASE = ''; // Порожньо, бо сайт і API на одному домені (воркері)

    const $ = (s) => document.querySelector(s);

    // Читання кошика
    function readCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (e) { return []; }
    }

    // Форматування ціни
    function formatUAH(n) {
        return '₴' + Number(n || 0).toLocaleString('uk-UA');
    }

    // Оновлення суми на сторінці
    function updateTotals() {
        const items = readCart();
        const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.count) || 0), 0);
        const totalStr = formatUAH(total);
        if ($('#payTotal')) $('#payTotal').textContent = totalStr;
        return totalStr;
    }

    /* --- Маска телефону +38 (0XX) XXX-XX-XX --- */
    function initPhoneMask(el) {
        if (!el) return;
        el.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
            if (!x) return;
            if (!x[2]) { e.target.value = x[1] ? '+' + x[1] : ''; return; }
            e.target.value = '+38 (' + x[2] + ') ' + x[3] + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
        });
    }

    /* --- Нова Пошта (Міста та Відділення) --- */
    function initNovaPoshta() {
        const searchInput = $('#citySearch'), citySelect = $('#city'), whSelect = $('#warehouse');
        if (!searchInput) return;

        searchInput.addEventListener('input', async (e) => {
            const q = e.target.value.trim();
            if (q.length < 2) return;
            try {
                const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(q)}`);
                const j = await r.json();
                if (j.ok && j.data.length) {
                    citySelect.disabled = false;
                    citySelect.innerHTML = '<option value="">Оберіть місто...</option>' +
                        j.data.map(c => `<option value="${c.Description}">${c.Description}</option>`).join('');
                }
            } catch (err) { console.error("NP Error:", err); }
        });

        citySelect.addEventListener('change', async (e) => {
            const cityName = e.target.value;
            if (!cityName) return;
            whSelect.disabled = false;
            whSelect.innerHTML = '<option>Завантаження...</option>';
            try {
                const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(cityName)}`);
                const j = await r.json();
                if (j.ok) {
                    whSelect.innerHTML = '<option value="">Оберіть відділення...</option>' +
                        j.data.map(w => `<option value="${w.Description}">${w.Description}</option>`).join('');
                }
            } catch (err) { console.error("WH Error:", err); }
        });
    }

    /* --- Відправка замовлення --- */
    async function submitOrder(payload, btn) {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Надсилаємо...';

        try {
            const r = await fetch(`${API_BASE}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await r.json();
            if (res.ok) {
                localStorage.removeItem(CART_KEY);
                window.location.href = `thank-you.html?order=${res.order_id}`;
            } else {
                alert("Помилка: " + (res.error || "Невідома помилка"));
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (e) {
            alert('Помилка мережі. Спробуйте пізніше.');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /* --- Ініціалізація при завантаженні --- */
    document.addEventListener('DOMContentLoaded', () => {
        updateTotals();
        initNovaPoshta();
        initPhoneMask($('#phone'));
        initPhoneMask($('#oneclickPhone'));

        // Кнопка "Передзвоніть мені" (1 клік)
        $('#oneclickBtn')?.addEventListener('click', () => {
            const phone = $('#oneclickPhone').value;
            const items = readCart();
            if (phone.length < 10) return alert('Введіть коректний номер телефону');
            if (!items.length) return alert('Ваш кошик порожній');

            const payload = {
                phone,
                name: "Швидке замовлення",
                cart: items,
                cart_total: updateTotals(),
                one_click: true
            };
            submitOrder(payload, $('#oneclickBtn'));
        });

        // Повна форма
        $('#order')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const items = readCart();
            if (!items.length) return alert('Додайте товар у кошик');

            const payload = {
                name: $('#name').value.trim(),
                phone: $('#phone').value.trim(),
                np_city: $('#city').value,
                np_warehouse: $('#warehouse').value,
                pay: $('input[name="pay"]:checked')?.value || 'cod',
                comment: $('#comment').value.trim(),
                cart: items,
                cart_total: updateTotals()
            };

            if (payload.phone.length < 10) return alert('Вкажіть номер телефону');
            if (!payload.np_warehouse) return alert('Оберіть відділення Нової Пошти');

            submitOrder(payload, $('#submitBtn') || e.target.querySelector('button[type="submit"]'));
        });

        // Рік у футері
        const y = $('#y');
        if (y) y.textContent = new Date().getFullYear();
    });
})();
