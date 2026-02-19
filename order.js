/*
  order.js (drop-in)
  - Works with existing order.html (no HTML changes required)
  - Reads cart from localStorage (same key as cart.js)
  - Correct API routes for Cloudflare Worker: /order, /np/cities, /np/warehouses
  - "1 клік" (callback) button is disabled until phone is provided
  - Sends Telegram message for fast order via /order with quick_order: true
*/

(() => {
  'use strict';

  // Same key as cart.js
  const CART_KEY = 'medok_cart_v1';

  // If you set window.MEDOK_API_BASE in HTML, it will be used (e.g. "https://medok.ink")
  // Otherwise use same-origin.
  const API_BASE = (window.MEDOK_API_BASE || '').replace(/\/$/, '');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    // Cart summary block in order.html
    orderItems: $('#orderItems'),
    payTotal: $('#payTotal'),

    // Form fields
    name: $('#name'),
    phone: $('#phone'),
    comment: $('#comment'),

    // NP fields
    npCityInput: $('#npCityInput'),
    npCitySelect: $('#npCitySelect'),
    npWarehouseSelect: $('#npWarehouseSelect'),

    // Payment
    payCod: $('#pay_cod'),
    payPrepay: $('#pay_prepay'),

    // Buttons
    submitBtn: $('#submitOrder'),
    quickBtn: $('#quickOrder'), // optional in HTML

    // Status
    status: $('#orderStatus'),
  };

  function money(n) {
    const x = Number(n) || 0;
    return `₴${x.toLocaleString('uk-UA')}`;
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
      // normalize
      const items = parsed.items
        .map(i => ({
          type: String(i.type || '').trim(),
          qty: String(i.qty || '').trim(),
          price: Number(i.price) || 0,
          count: Math.max(0, Number(i.count) || 0),
        }))
        .filter(i => i.type && i.qty && i.count > 0);
      return { items };
    } catch {
      return { items: [] };
    }
  }

  function cartTotal(items) {
    return items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.count) || 0), 0);
  }

  function renderCartToOrder() {
    if (!els.orderItems || !els.payTotal) return;

    const { items } = readCart();

    if (!items.length) {
      els.orderItems.innerHTML = '<div class="muted">Кошик порожній. Додайте мед на головній сторінці 🙂</div>';
      els.payTotal.textContent = '—';
      return;
    }

    const rows = items.map((i, idx) => {
      const lineSum = (Number(i.price) || 0) * (Number(i.count) || 0);
      return `
        <div class="order-item">
          <div class="order-item__left">
            <div class="order-item__title">${idx + 1}. ${escapeHtml(i.type)}</div>
            <div class="order-item__sub">${escapeHtml(i.qty)} л × ${i.count} шт</div>
          </div>
          <div class="order-item__right">${money(lineSum)}</div>
        </div>
      `;
    }).join('');

    els.orderItems.innerHTML = rows;
    els.payTotal.textContent = money(cartTotal(items));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(msg, kind = 'info') {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.className = `status status--${kind}`;
  }

  function selectedPay() {
    // default: prepay if exists & checked, else cod
    if (els.payPrepay && els.payPrepay.checked) return 'prepay';
    return 'cod';
  }

  async function apiGet(path, params) {
    const u = new URL((API_BASE || '') + path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') u.searchParams.set(k, String(v));
      });
    }
    const r = await fetch(u.toString(), { method: 'GET', headers: { 'Accept': 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  }

  async function apiPost(path, payload) {
    const u = new URL((API_BASE || '') + path, window.location.origin);
    const r = await fetch(u.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  }

  // -------- NP binding --------
  let npCityTimer = null;

  function bindNovaPoshta() {
    if (!els.npCityInput || !els.npCitySelect || !els.npWarehouseSelect) return;

    els.npCityInput.addEventListener('input', () => {
      clearTimeout(npCityTimer);
      const q = String(els.npCityInput.value || '').trim();

      // reset
      els.npCitySelect.innerHTML = '<option value="">Почніть вводити 2+ літери…</option>';
      els.npWarehouseSelect.innerHTML = '<option value="">Спочатку оберіть місто</option>';

      if (q.length < 2) return;

      npCityTimer = setTimeout(async () => {
        try {
          const res = await apiGet('/np/cities', { q });
          const data = Array.isArray(res.data) ? res.data : [];
          if (!data.length) {
            els.npCitySelect.innerHTML = '<option value="">Місто не знайдено</option>';
            return;
          }

          els.npCitySelect.innerHTML = '<option value="">Оберіть місто…</option>' +
            data.map(c => {
              const name = c.Description || c.DescriptionUa || c.DescriptionRU || '';
              const ref = c.Ref || '';
              return `<option value="${escapeHtml(ref)}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
            }).join('');

        } catch (e) {
          console.error('[NP cities]', e);
          els.npCitySelect.innerHTML = '<option value="">Помилка завантаження міст</option>';
        }
      }, 250);
    });

    els.npCitySelect.addEventListener('change', async () => {
      const cityRef = els.npCitySelect.value;
      const opt = els.npCitySelect.selectedOptions?.[0];
      const cityName = opt?.dataset?.name || '';

      els.npWarehouseSelect.innerHTML = '<option value="">Завантаження…</option>';

      if (!cityRef && !cityName) {
        els.npWarehouseSelect.innerHTML = '<option value="">Спочатку оберіть місто</option>';
        return;
      }

      try {
        const res = await apiGet('/np/warehouses', cityRef ? { cityRef } : { city: cityName });
        const data = Array.isArray(res.data) ? res.data : [];

        if (!data.length) {
          els.npWarehouseSelect.innerHTML = '<option value="">Відділень не знайдено</option>';
          return;
        }

        els.npWarehouseSelect.innerHTML = '<option value="">Оберіть відділення…</option>' +
          data.map(w => {
            const title = w.Description || w.DescriptionUa || '';
            return `<option value="${escapeHtml(title)}">${escapeHtml(title)}</option>`;
          }).join('');

      } catch (e) {
        console.error('[NP wh]', e);
        els.npWarehouseSelect.innerHTML = '<option value="">Помилка завантаження відділень</option>';
      }
    });
  }

  // -------- quick order (callback) --------
  function bindQuickOrderValidation() {
    if (!els.quickBtn) return;

    const sync = () => {
      const phone = String(els.phone?.value || '').trim();
      const ok = phone.replace(/\D/g, '').length >= 10; // UA-like length
      els.quickBtn.disabled = !ok;
      els.quickBtn.setAttribute('aria-disabled', String(!ok));
      els.quickBtn.title = ok ? '' : 'Вкажіть номер телефону, щоб ми могли передзвонити';
    };

    sync();
    els.phone?.addEventListener('input', sync);

    els.quickBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const phone = String(els.phone?.value || '').trim();
      if (phone.replace(/\D/g, '').length < 10) {
        setStatus('Спочатку введіть номер телефону 🙂', 'warn');
        els.phone?.focus();
        return;
      }

      // Fast order payload: minimal + cart snapshot if available
      const { items } = readCart();
      const total = cartTotal(items);

      const payload = {
        quick_order: true,
        name: String(els.name?.value || '').trim(),
        phone,
        // attach cart if exists
        from_cart: !!items.length,
        cart: items.length ? items.map(i => ({ type: i.type, qty: i.qty, count: i.count, price: i.price })) : [],
        cart_total: total,
        // note: do not require delivery fields for quick callback
        comment: (String(els.comment?.value || '').trim() || 'Передзвоніть мені (швидке замовлення)')
      };

      try {
        els.quickBtn.disabled = true;
        setStatus('Відправляємо…', 'info');
        await apiPost('/order', payload);
        setStatus('✅ Дякуємо! Ми передзвонимо вам найближчим часом.', 'ok');
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (err) {
        console.error('[quick order]', err);
        setStatus('❌ Не вдалося відправити. Спробуйте ще раз або напишіть у Viber.', 'error');
        els.quickBtn.disabled = false;
      }
    });
  }

  // -------- full order submit --------
  function bindFullOrderSubmit() {
    if (!els.submitBtn) return;

    els.submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const name = String(els.name?.value || '').trim();
      const phone = String(els.phone?.value || '').trim();
      const npCityOpt = els.npCitySelect?.selectedOptions?.[0];
      const npCityName = npCityOpt?.dataset?.name || '';
      const npWarehouse = String(els.npWarehouseSelect?.value || '').trim();

      if (!phone || phone.replace(/\D/g, '').length < 10) {
        setStatus('Вкажіть номер телефону (мін. 10 цифр)', 'warn');
        els.phone?.focus();
        return;
      }

      // Delivery fields are required for full order
      if (!npCityName) {
        setStatus('Оберіть місто Нової пошти', 'warn');
        els.npCitySelect?.focus();
        return;
      }
      if (!npWarehouse) {
        setStatus('Оберіть відділення Нової пошти', 'warn');
        els.npWarehouseSelect?.focus();
        return;
      }

      const { items } = readCart();
      if (!items.length) {
        setStatus('Кошик порожній. Додайте мед на головній сторінці 🙂', 'warn');
        return;
      }

      const total = cartTotal(items);

      const payload = {
        from_cart: true,
        cart: items.map(i => ({ type: i.type, qty: i.qty, count: i.count, price: i.price })),
        cart_total: total,
        name,
        phone,
        np_city: npCityName,
        np_cityRef: String(els.npCitySelect?.value || '').trim(),
        np_warehouse: npWarehouse,
        pay: selectedPay(),
        comment: String(els.comment?.value || '').trim(),
      };

      try {
        els.submitBtn.disabled = true;
        setStatus('Відправляємо замовлення…', 'info');
        const res = await apiPost('/order', payload);

        // Clear cart after success
        try { localStorage.removeItem(CART_KEY); } catch {}

        renderCartToOrder();
        setStatus(`✅ Замовлення прийнято! Номер: ${res.order_id || '—'}. Ми з вами звʼяжемося.`, 'ok');
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (err) {
        console.error('[order submit]', err);
        setStatus('❌ Помилка відправки. Перевірте інтернет або спробуйте ще раз.', 'error');
      } finally {
        els.submitBtn.disabled = false;
      }
    });
  }

  // -------- init --------
  function init() {
    try {
      renderCartToOrder();
    } catch (e) {
      console.error('[renderCartToOrder]', e);
    }

    bindNovaPoshta();
    bindQuickOrderValidation();
    bindFullOrderSubmit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
