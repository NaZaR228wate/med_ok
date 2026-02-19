/* med_ok — order.js (Валідація + Покращений UX) */

(() => {
    'use strict';

    const CART_KEY = 'medok_cart_v1';
    const API_BASE = '';

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ======= Утиліти ======= */
    const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (e) { return []; }
    }

    // Очищення помилок
    function clearErrors() {
        $$('.field-error').forEach(el => el.classList.remove('field-error'));
        $$('.error-text').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
    }

    // Показ помилки для конкретного поля
    function showError(fieldId, message) {
        const field = $(`#${fieldId}`);
        const errorLabel = $(`#err-${fieldId}`);
        if (field) field.classList.add('field-error');
        if (errorLabel) {
            errorLabel.textContent = message;
            errorLabel.style.display = 'block';
        }
    }

    /* ======= Маска телефону ======= */
    function initPhoneMask(input) {
        if (!input) return;
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.startsWith('38')) val = val.substring(2);
            if (val.length > 10) val = val.substring(0, 10);

            let formatted = '+38 ';
            if (val.length > 0) formatted += '(' + val.substring(0, 3);
            if (val.length >= 4) formatted += ') ' + val.substring(3, 6);
            if (val.length >= 7) formatted += '-' + val.substring(6, 8);
            if (val.length >= 9) formatted += '-' + val.substring(8, 10);

            e.target.value = formatted;
        });
    }

    /* ======= Оновлення суми ======= */
    function updateTotals() {
        const items = readCart();
        const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.count) || 0), 0);

        const payTotalEl = $('#payTotal');
        if (payTotalEl) payTotalEl.textContent = formatUAH(total);

        const stickyTotal = $('#stickyTotal');
        if (stickyTotal) stickyTotal.textContent = formatUAH(total);

        return total;
    }

    /* ======= Валідація ======= */
    function validateOrder(data, isQuick = false) {
        clearErrors();
        let isValid = true;

        // Перевірка телефону (має бути 10 цифр після +38)
        const digits = data.phone.replace(/\D/g, '');
        if (digits.length < 12) {
            showError(isQuick ? 'oneclickPhone' : 'phone', 'Введіть коректний номер телефону');
            isValid = false;
        }

        if (isQuick) return isValid; // Для швидкого замовлення достатньо телефону

        // Перевірка імені
        if (data.name.length < 2) {
            showError('name', 'Введіть ваше ім’я');
            isValid = false;
        }

        // Перевірка Нової Пошти
        if (!data.np_city) {
            showError('citySearch', 'Оберіть місто зі списку');
            isValid = false;
        }
        if (!data.np_warehouse) {
            showError('warehouse', 'Оберіть відділення');
            isValid = false;
        }

        return isValid;
    }

    /* ======= Нова Пошта ======= */
    let cityTimeout;
    function initNP() {
        const citySearch = $('#citySearch');
        const citySelect = $('#city');
        const whSelect   = $('#warehouse');

        citySearch?.addEventListener('input', (e) => {
            clearTimeout(cityTimeout);
            const q = e.target.value.trim();
            if (q.length < 2) return;

            cityTimeout = setTimeout(async () => {
                try {
                    const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(q)}`);
                    const res = await r.json();
                    if (res.ok) {
                        citySelect.disabled = false;
                        citySelect.innerHTML = '<option value="">Оберіть місто...</option>' +
                            res.data.map(c => `<option value="${c.Description}">${c.Description}</option>`).join('');
                    }
                } catch (e) {}
            }, 400);
        });

        citySelect?.addEventListener('change', async (e) => {
            const cityName = e.target.value;
            if (!cityName) return;
            whSelect.disabled = false;
            whSelect.innerHTML = '<option>Завантаження...</option>';
            try {
                const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(cityName)}`);
                const res = await r.json();
                if (res.ok) {
                    whSelect.innerHTML = '<option value="">Оберіть відділення...</option>' +
                        res.data.map(w => `<option value="${w.Description}">${w.Description}</option>`).join('');
                }
            } catch (e) {}
        });
    }

    /* ======= Відправка ======= */
    async function handleOrder(e) {
        e.preventDefault();
        const items = readCart();
        if (!items.length) return alert("Кошик порожній!");

        const payload = {
            name: $('#name').value.trim(),
            phone: $('#phone').value.trim(),
            np_city: $('#city').value,
            np_warehouse: $('#warehouse').value,
            pay: $('input[name="pay"]:checked')?.value || 'cod',
            comment: $('#comment').value.trim(),
            from_cart: true,
            cart: items,
            cart_total: updateTotals()
        };

        if (!validateOrder(payload)) return;

        const btn = $('#submitBtn');
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
                sessionStorage.setItem('medok_last_order', JSON.stringify(payload));
                localStorage.removeItem(CART_KEY);
                window.location.href = `thank-you.html?order=${res.order_id}`;
            } else {
                alert("Помилка: " + res.error);
                btn.disabled = false;
                btn.innerHTML = '✅ Підтвердити замовлення';
            }
        } catch (err) {
            alert("Помилка мережі");
            btn.disabled = false;
        }
    }

    function initQuickOrder() {
        const qBtn = $('#oneclickBtn');
        const qInput = $('#oneclickPhone');
        if (!qBtn || !qInput) return;

        initPhoneMask(qInput);

        qBtn.addEventListener('click', async () => {
            const items = readCart();
            const phone = qInput.value.trim();

            if (!validateOrder({ phone }, true)) return;
            if (!items.length) return alert("Додайте мед у кошик!");

            qBtn.disabled = true;
            qBtn.textContent = '⏳';

            const payload = {
                phone,
                name: "Швидке замовлення",
                one_click: true,
                from_cart: true,
                cart: items,
                cart_total: updateTotals()
            };

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
                    qBtn.disabled = false;
                    qBtn.textContent = 'Передзвоніть мені';
                }
            } catch (e) {
                qBtn.disabled = false;
            }
        });
    }

    /* ======= Start ======= */
    document.addEventListener('DOMContentLoaded', () => {
        updateTotals();
        initNP();
        initPhoneMask($('#phone'));
        initQuickOrder();

        $('#order')?.addEventListener('submit', handleOrder);

        const y = $('#y');
        if (y) y.textContent = new Date().getFullYear();
    });

})();
