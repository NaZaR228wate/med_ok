// order.js (Версія з покращеною маскою телефону)
(() => {
    'use strict';
    const CART_KEY = 'medok_cart_v1';
    const API_BASE = ''; 

    const $ = (s) => document.querySelector(s);

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (e) { return []; }
    }

    function formatUAH(n) {
        return Number(n || 0).toLocaleString('uk-UA');
    }

    function updateTotals() {
        const items = readCart();
        const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.count) || 0), 0);
        if ($('#payTotal')) $('#payTotal').textContent = '₴' + formatUAH(total);
        return total;
    }

   /* --- РОЗУМНА МАСКА ТЕЛЕФОНУ +38 (0XX) XXX-XX-XX --- */
    function initPhoneMask(el) {
        if (!el) return;

        el.addEventListener('input', (e) => {
            let value = e.target.value;
            // Отримуємо тільки цифри
            let digits = value.replace(/\D/g, '');

            // 1. Якщо людина вводить 380... -> лишаємо 0... (прибираємо 38)
            if (digits.startsWith('380')) {
                digits = digits.substring(2);
            } 
            // 2. Якщо вводить 387... (забув 0) -> перетворюємо на 07...
            else if (digits.startsWith('38') && digits.length > 2 && digits[2] !== '0') {
                digits = '0' + digits.substring(2);
            }
            // 3. Якщо вводить 73... (без 0 і без 38) -> додаємо 0 в початок
            else if (digits.length > 0 && digits[0] !== '0') {
                digits = '0' + digits;
            }

            // Обмежуємо 10 цифрами (від 063 до останньої цифри номера)
            digits = digits.substring(0, 10);

            // Форматування маски
            let formatted = '+38 (';
            if (digits.length > 0) {
                formatted += digits.substring(0, 3);
            }
            if (digits.length >= 4) {
                formatted += ') ' + digits.substring(3, 6);
            }
            if (digits.length >= 7) {
                formatted += '-' + digits.substring(6, 8);
            }
            if (digits.length >= 9) {
                formatted += '-' + digits.substring(8, 10);
            }

            el.value = formatted;
        });

        // Блокуємо видалення префікса
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && el.value.length <= 5) {
                e.preventDefault();
            }
        });

        // Автозаповнення при фокусі
        el.addEventListener('focus', () => {
            if (el.value.length < 5) el.value = '+38 (';
        });
    }
    /* --- НОВА ПОШТА --- */
    function initNP() {
        const search = $('#citySearch'), select = $('#city'), wh = $('#warehouse');
        if (!search) return;

        search.addEventListener('input', async (e) => {
            if (e.target.value.length < 2) return;
            try {
                const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(e.target.value)}`);
                const j = await r.json();
                if (j.ok && j.data.length) {
                    select.disabled = false;
                    select.innerHTML = '<option value="">Оберіть місто...</option>' + 
                        j.data.map(c => `<option value="${c.Description}">${c.Description}</option>`).join('');
                }
            } catch (err) { console.error("City fetch error"); }
        });

        select.addEventListener('change', async (e) => {
            if (!e.target.value) return;
            wh.disabled = false;
            wh.innerHTML = '<option>Завантаження...</option>';
            try {
                const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(e.target.value)}`);
                const j = await r.json();
                if (j.ok) {
                    wh.innerHTML = '<option value="">Оберіть відділення...</option>' + 
                        j.data.map(w => `<option value="${w.Description}">${w.Description}</option>`).join('');
                }
            } catch (err) { wh.innerHTML = '<option>Помилка</option>'; }
        });
    }

    /* --- ВІДПРАВКА --- */
    async function submitOrder(payload, btn) {
        // Перевірка на заповненість номера
        if (payload.phone.length < 19) { // Довжина повної маски "+38 (0XX) XXX-XX-XX"
            alert('Будь ласка, введіть повний номер телефону');
            return;
        }

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳...';

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
                alert("Помилка: " + (res.error || "Спробуйте пізніше"));
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (e) {
            alert('Помилка мережі. Перевірте з’єднання.');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const currentTotal = updateTotals();
        initPhoneMask($('#phone'));
        initPhoneMask($('#oneclickPhone'));
        initNP();

        $('#oneclickBtn')?.addEventListener('click', () => {
            const phone = $('#oneclickPhone').value;
            const items = readCart();
            if (!items.length) return alert('Кошик порожній');
            
            submitOrder({ 
                phone, 
                cart: items, 
                cart_total: currentTotal, 
                one_click: true 
            }, $('#oneclickBtn'));
        });

        $('#order')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const items = readCart();
            if (!items.length) return alert('Кошик порожній');

            const payload = {
                name: $('#name').value,
                phone: $('#phone').value,
                np_city: $('#city').value,
                np_warehouse: $('#warehouse').value,
                cart: items,
                cart_total: currentTotal,
                pay: $('input[name="pay"]:checked')?.value || 'cod',
                comment: $('#comment').value
            };
            
            if (!payload.np_warehouse) return alert('Оберіть відділення');

            submitOrder(payload, $('#submitBtn') || e.target.querySelector('button[type="submit"]'));
        });
    });
})();
