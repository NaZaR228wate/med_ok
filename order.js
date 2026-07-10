(() => {
    'use strict';

    const CART_KEY = 'medok_cart_v1';
    const API_BASE = '';
    const catalog = window.MEDOK_CATALOG;
    const $ = (selector) => document.querySelector(selector);
    const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');

    function readCart() {
        try {
            const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
            const normalized = catalog ? catalog.normalizeCart(raw) : raw;
            if (catalog && catalog.hasCartChanged(raw, normalized)) {
                localStorage.setItem(CART_KEY, JSON.stringify(normalized));
                window.dispatchEvent(new CustomEvent('cart:changed'));
            }
            return normalized;
        } catch {
            return [];
        }
    }

    function cartTotal(items = readCart()) {
        return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.count) || 0), 0);
    }

    function updateTotals() {
        const total = cartTotal();
        const payTotal = $('#payTotal');
        if (payTotal) payTotal.textContent = formatUAH(total);
        return total;
    }

    function initPhoneMask(el) {
        if (!el) return;

        el.addEventListener('input', (event) => {
            let digits = event.target.value.replace(/\D/g, '');
            if (digits.startsWith('380')) digits = digits.substring(2);
            else if (digits.startsWith('38') && digits.length > 2 && digits[2] !== '0') digits = '0' + digits.substring(2);
            else if (digits.length > 0 && digits[0] !== '0') digits = '0' + digits;

            digits = digits.substring(0, 10);

            let formatted = '+38 (';
            if (digits.length > 0) formatted += digits.substring(0, 3);
            if (digits.length >= 4) formatted += ') ' + digits.substring(3, 6);
            if (digits.length >= 7) formatted += '-' + digits.substring(6, 8);
            if (digits.length >= 9) formatted += '-' + digits.substring(8, 10);
            el.value = formatted;
        });

        el.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && el.value.length <= 5) event.preventDefault();
        });
        el.addEventListener('focus', () => {
            if (el.value.length < 5) el.value = '+38 (';
        });
    }

    function initNP() {
        const search = $('#citySearch');
        const select = $('#city');
        const wh = $('#warehouse');
        if (!search || !select || !wh) return;

        search.addEventListener('input', async (event) => {
            if (event.target.value.length < 2) return;
            try {
                const response = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(event.target.value)}`);
                const json = await response.json();
                if (json.ok && json.data.length) {
                    select.disabled = false;
                    select.innerHTML = '<option value="">Оберіть місто...</option>' +
                        json.data.map((city) => `<option value="${city.Description}">${city.Description}</option>`).join('');
                }
            } catch {
                console.error('City fetch error');
            }
        });

        select.addEventListener('change', async (event) => {
            if (!event.target.value) return;
            wh.disabled = false;
            wh.innerHTML = '<option>Завантаження...</option>';
            try {
                const response = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(event.target.value)}`);
                const json = await response.json();
                if (json.ok) {
                    wh.innerHTML = '<option value="">Оберіть відділення...</option>' +
                        json.data.map((warehouse) => `<option value="${warehouse.Description}">${warehouse.Description}</option>`).join('');
                }
            } catch {
                wh.innerHTML = '<option>Помилка</option>';
            }
        });
    }

    async function submitOrder(payload, btn) {
        if (payload.phone.length < 19) {
            alert('Будь ласка, введіть повний номер телефону');
            return;
        }
        if (!payload.cart.length) {
            alert('Кошик порожній');
            return;
        }

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳...';

        try {
            const response = await fetch(`${API_BASE}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.ok) {
                localStorage.removeItem(CART_KEY);
                window.location.href = `thank-you.html?order=${result.order_id}`;
                return;
            }
            alert('Помилка: ' + (result.error || 'Спробуйте пізніше'));
        } catch {
            alert('Помилка мережі. Перевірте з’єднання.');
        }

        btn.disabled = false;
        btn.innerHTML = originalText;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const initialItems = readCart();
        if (!initialItems.length) {
            try {
                sessionStorage.setItem(
                    'medok_checkout_notice',
                    window.MEDOK_CART?.emptyCheckoutMessage || 'Спочатку оберіть мед, а потім переходьте до оформлення.'
                );
            } catch {
                // Redirect does not depend on session storage.
            }
            window.location.replace('index.html#products');
            return;
        }

        updateTotals();
        initPhoneMask($('#phone'));
        initPhoneMask($('#oneclickPhone'));
        initNP();

        window.addEventListener('cart:changed', updateTotals);

        $('#oneclickBtn')?.addEventListener('click', () => {
            const items = readCart();
            submitOrder({
                phone: $('#oneclickPhone').value,
                cart: items,
                cart_total: cartTotal(items),
                one_click: true
            }, $('#oneclickBtn'));
        });

        $('#order')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const items = readCart();
            const payload = {
                name: $('#name').value,
                phone: $('#phone').value,
                np_city: $('#city').value,
                np_warehouse: $('#warehouse').value,
                cart: items,
                cart_total: cartTotal(items),
                pay: $('input[name="pay"]:checked')?.value || 'cod',
                comment: $('#comment').value
            };

            if (!payload.np_warehouse) {
                alert('Оберіть відділення');
                return;
            }

            submitOrder(payload, $('#submitBtn') || event.target.querySelector('button[type="submit"]'));
        });
    });
})();
