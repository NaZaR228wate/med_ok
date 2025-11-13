/* med_ok — зовнішній скрипт
 * Тут зібрана вся інтерактивна логіка: бургер-меню, слайдер, reveal-ефекти,
 * робота з кошиком, вибір літражу через степпер, та оновлення підсумку в шапці.
 */

(() => {
  /* ======= Утиліти ======= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const formatUAH = (n) => {
    const num = Number(n || 0);
    // Використовуємо HTML-entity або універсальний код для гривні, щоб уникнути проблем зі шрифтом
    return '\u20B4' + num.toLocaleString('uk-UA');
  };

  /* ======= Оновлення року в футері ======= */
  (() => {
    const y = $('#y');
    if (y) y.textContent = new Date().getFullYear();
  })();

  /* ======= Burger / Navigation ======= */
  (() => {
    const toggle = $('#menu-toggle');
    const nav    = $('#primary-nav');
    if (!toggle || !nav) return;

    const close = () => {
      nav.dataset.open = 'false';
      nav.setAttribute('aria-hidden', 'true');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    const open  = () => {
      nav.dataset.open = 'true';
      nav.removeAttribute('aria-hidden');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    // Початковий стан (мобільний — закрито)
    close();

    toggle.addEventListener('click', () => (
      nav.dataset.open === 'true' ? close() : open()
    ));

    // Клік поза меню — закрити
    document.addEventListener('click', (e) => {
      if (nav.dataset.open !== 'true') return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });
    // Esc — закрити
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Синхронізація десктопу
    function syncDesktop() {
      if (window.matchMedia('(min-width: 900px)').matches) {
        nav.dataset.open = 'true';
        nav.removeAttribute('aria-hidden');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }
    syncDesktop();
    window.addEventListener('resize', syncDesktop);
  })();

  /* ======= Hero slider (autoplay) ======= */
  (() => {
    const slides  = $$('.hero-slider .slide');
    const prevBtn = $('#prev');
    const nextBtn = $('#next');
    if (!slides.length || !prevBtn || !nextBtn) return;

    const AUTOPLAY_MS = 3000;
    const ANIM_MS     = 650;
    let current = slides.findIndex((s) => s.classList.contains('active'));
    if (current < 0) current = 0;
    let isAnimating = false;
    let autoplayId  = null;

    const show = (idx) => {
      if (isAnimating || idx === current) return;
      isAnimating = true;
      slides.forEach((s, k) => s.classList.toggle('active', k === idx));
      current = idx;
      setTimeout(() => { isAnimating = false; }, ANIM_MS);
    };
    const next = () => show((current + 1) % slides.length);
    const prev = () => show((current - 1 + slides.length) % slides.length);

    const schedule = () => {
      clearTimeout(autoplayId);
      autoplayId = setTimeout(function tick() {
        next();
        autoplayId = setTimeout(tick, AUTOPLAY_MS);
      }, AUTOPLAY_MS);
    };
    const restart = () => {
      clearTimeout(autoplayId);
      schedule();
    };

    prevBtn.addEventListener('click', () => { prev(); restart(); });
    nextBtn.addEventListener('click', () => { next(); restart(); });

    schedule();
  })();

  /* ======= Scroll reveal для карток ======= */
  (() => {
    const els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach((e) => io.observe(e));
  })();

  /* ======= Анімація лічильника років пасіки ======= */
  (() => {
    const yearsEl = document.getElementById('yearsCounter');
    if (!yearsEl || !('IntersectionObserver' in window)) return;
    const target = parseInt(yearsEl.dataset.target || '0', 10);
    let started = false;
    function animate() {
      const duration = 2000; // тривалість анімації в мс
      const startTimestamp = performance.now();
      function tick(now) {
        const progress = Math.min((now - startTimestamp) / duration, 1);
        const value = Math.floor(progress * target);
        yearsEl.textContent = value;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          yearsEl.textContent = target;
        }
      }
      requestAnimationFrame(tick);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !started) {
          started = true;
          animate();
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });
    io.observe(yearsEl);
  })();

  /* ======= Кошик (localStorage) ======= */
  const CART_KEY     = 'medok_cart_v1';
  const LAST_QTY_KEY = 'medok_last_qty_v1';
  // Таблиця цін за об’єм (л) для різних сортів меду
  const PRICES = {
    'Акація':       { '0.5': 170, '1': 300, '2': 560, '3': 810, '4': 1040, '5': 1250 },
    'Липовий':      { '0.5': 150, '1': 260, '2': 480, '3': 690, '4': 880,  '5': 1050 },
    'Різнотрав’я':  { '0.5': 140, '1': 240, '2': 440, '3': 630, '4': 800,  '5': 960  },
    'Соняшниковий': { '0.5': 130, '1': 220, '2': 400, '3': 570, '4': 720,  '5': 860  }
  };

  // Завантаження/збереження кошика
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:changed'));
  }
  // Завантаження/збереження останнього вибору літражу для кожного типу
  function loadLastQty() {
    try {
      return JSON.parse(localStorage.getItem(LAST_QTY_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveLastQty(map) {
    localStorage.setItem(LAST_QTY_KEY, JSON.stringify(map));
  }

  function computeItemKey(type, qty) {
    return `${type}|${qty}`;
  }

  // Додати позицію в кошик
  function addToCart(type, qtyLiters) {
    const price = PRICES?.[type]?.[String(qtyLiters)];
    if (!price) {
      alert('Немає ціни для такого об’єму. Змініть кількість.');
      return;
    }
    const items = loadCart();
    const key   = computeItemKey(type, qtyLiters);
    const existing = items.find((i) => i.key === key);
    if (existing) existing.count += 1;
    else items.push({ key, type, qty: String(qtyLiters), price, count: 1 });
    saveCart(items);
    // Показати невеликий тост
    try {
      const toast = document.createElement('div');
      toast.className = 'toast show';
      toast.textContent = 'Додано в кошик';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
      }, 1000);
    } catch (err) {}
  }
  // Зменшити кількість одного товару
  function removeOne(key) {
    const items = loadCart();
    const ex = items.find((i) => i.key === key);
    if (!ex) return;
    ex.count--;
    if (ex.count <= 0) items.splice(items.findIndex((i) => i.key === key), 1);
    saveCart(items);
  }
  // Збільшити кількість одного товару
  function addOne(key) {
    const items = loadCart();
    const ex = items.find((i) => i.key === key);
    if (!ex) return;
    ex.count++;
    saveCart(items);
  }
  // Видалити рядок
  function deleteLine(key) {
    const items = loadCart().filter((i) => i.key !== key);
    saveCart(items);
  }
  function clearCart() {
    saveCart([]);
  }

  /* ======= Елементи DOM ======= */
  const cartBtn         = $('#cartBtn');
  const cartQtyBadge    = $('#cartQtyBadge');
  const cartTotalHeader = $('#cartTotalHeader');
  const cartDrawer      = $('#cartDrawer');
  const cartBackdrop    = $('#cartBackdrop');
  const cartClose       = $('#cartClose');
  const cartList        = $('#cartList');
  const cartEmpty       = $('#cartEmpty');
  const cartSummary     = $('#cartSummary');
  const cartItemsCount  = $('#cartItemsCount');
  const cartTotal       = $('#cartTotal');
  const cartClearBtn    = $('#cartClear');

  /* ======= Рендер кошика та підсумку ======= */
  function renderCart() {
    const items = loadCart();
    const totalCount = items.reduce((s, i) => s + i.count, 0);
    const totalPrice = items.reduce((s, i) => s + i.price * i.count, 0);

    // Оновити бейдж кількості
    if (cartQtyBadge) {
      if (totalCount > 0) {
        cartQtyBadge.style.display = 'inline-block';
        cartQtyBadge.textContent   = totalCount;
      } else {
        cartQtyBadge.style.display = 'none';
      }
    }
    // Оновити суму в шапці
    if (cartTotalHeader) {
      if (totalCount > 0) {
        cartTotalHeader.style.display = 'flex';
        cartTotalHeader.textContent   = formatUAH(totalPrice);
      } else {
        // Якщо кошик порожній, показувати ₴0 або приховати зовсім
        cartTotalHeader.style.display = 'none';
      }
    }

    if (!cartList) return;
    // Оновити дроуер
    cartList.innerHTML = '';
    if (items.length === 0) {
      if (cartEmpty) cartEmpty.style.display = 'block';
      if (cartSummary) cartSummary.style.display = 'none';
      return;
    }
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';

    items.forEach((i) => {
      const lineTotal = i.price * i.count;
      const el = document.createElement('div');
      el.className = 'card';
      el.style.display = 'grid';
      el.style.gap = '8px';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <div style="font-weight:800">${i.type}</div>
            <div class="muted">${i.qty} л — ${formatUAH(i.price)} / шт</div>
          </div>
          <button data-del="${i.key}" class="btn-secondary" title="Видалити" style="background:#fff;border:1px solid #ddd;">🗑</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <button data-minus="${i.key}" class="btn-secondary" style="padding:6px 10px;">−</button>
            <span style="display:inline-block;min-width:28px;text-align:center;font-weight:800">${i.count}</span>
            <button data-plus="${i.key}" class="btn-secondary" style="padding:6px 10px;">+</button>
          </div>
          <div style="font-weight:800">${formatUAH(lineTotal)}</div>
        </div>
      `;
      cartList.appendChild(el);
    });
    if (cartItemsCount) cartItemsCount.textContent = totalCount;
    if (cartTotal) cartTotal.textContent = formatUAH(totalPrice);
  }

  // Відкрити/закрити кошик
  function openCart() {
    if (cartDrawer) cartDrawer.style.display = 'block';
  }
  function closeCartDrawer() {
    if (cartDrawer) cartDrawer.style.display = 'none';
  }

  // Події кошика
  cartBtn      && cartBtn.addEventListener('click', openCart);
  cartBackdrop && cartBackdrop.addEventListener('click', closeCartDrawer);
  cartClose    && cartClose.addEventListener('click', closeCartDrawer);
  cartClearBtn && cartClearBtn.addEventListener('click', () => {
    if (confirm('Очистити кошик?')) clearCart();
  });
  cartList     && cartList.addEventListener('click', (e) => {
    const t = e.target;
    const plus  = t.closest('[data-plus]');
    const minus = t.closest('[data-minus]');
    const del   = t.closest('[data-del]');
    if (plus)  addOne(plus.getAttribute('data-plus'));
    if (minus) removeOne(minus.getAttribute('data-minus'));
    if (del)   deleteLine(del.getAttribute('data-del'));
  });

  // Слухати змін кошика
  window.addEventListener('cart:changed', renderCart);
  // Початковий рендер
  renderCart();

  /* ======= Кнопки "У кошик" у продуктах ======= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.addToCart');
    if (!btn) return;
    const type = btn.getAttribute('data-type') || btn.textContent.trim();
    const qty  = btn.getAttribute('data-qty') || '1';
    openQtyMenu(type, qty, btn);
  });

  /* ======= Меню вибору об’єму (степпер) ======= */
  const qtyMenu     = $('#qtyMenu');
  const qtyBackdrop = $('#qtyBackdrop');
  const qtyCloseBtn = $('#qtyClose');
  const qtyTitle    = $('#qtyTitle');
  const qtyMinus    = $('#qtyMinus');
  const qtyPlus     = $('#qtyPlus');
  const qtyValue    = $('#qtyValue');
  const qtyPrice    = $('#qtyPrice');
  const qtyAddBtn   = $('#qtyAddBtn');
  let currentTypeForQty = null;
  let qtyOptions = [];
  let qtyIdx = 0;
  let lastAddBtn = null;

  // Встановити кількість за індексом і оновити відображення
  function setQtyByIndex(i, priceTable) {
    qtyIdx = Math.max(0, Math.min(i, qtyOptions.length - 1));
    const q = qtyOptions[qtyIdx];
    if (qtyValue) qtyValue.textContent = q + ' л';
    if (qtyPrice) qtyPrice.textContent = formatUAH(priceTable[q]);
  }

  function openQtyMenu(type, defaultQty, fromBtn) {
    const priceTable = PRICES?.[type];
    if (!priceTable) {
      alert('Немає інформації про ціни для цього меду.');
      return;
    }
    currentTypeForQty = type;
    lastAddBtn = fromBtn instanceof Element ? fromBtn : null;
    // Заголовок
    if (qtyTitle) qtyTitle.textContent = type;
    // Список об’ємів за зростанням
    qtyOptions = Object.keys(priceTable)
      .map((x) => parseFloat(x))
      .sort((a, b) => a - b)
      .map((x) => String(x));
    // Відновити останній вибір для цього виду або взяти defaultQty
    const lastMap = loadLastQty();
    const preferred = String(lastMap[type] ?? defaultQty ?? qtyOptions[0]);
    const startIdx = Math.max(0, qtyOptions.indexOf(preferred));
    setQtyByIndex(startIdx, priceTable);
    // Показати меню
    if (qtyMenu) qtyMenu.style.display = 'block';
    // Підписатись на ±
    const onMinus = () => setQtyByIndex(qtyIdx - 1, priceTable);
    const onPlus  = () => setQtyByIndex(qtyIdx + 1, priceTable);
    if (qtyMinus) qtyMinus.addEventListener('click', onMinus);
    if (qtyPlus)  qtyPlus.addEventListener('click', onPlus);
    // Зберегти функцію для очищення
    qtyMenu._cleanup = () => {
      if (qtyMinus) qtyMinus.removeEventListener('click', onMinus);
      if (qtyPlus)  qtyPlus.removeEventListener('click', onPlus);
    };
  }
  function closeQtyMenu() {
    if (qtyMenu && qtyMenu._cleanup) qtyMenu._cleanup();
    if (qtyMenu) qtyMenu.style.display = 'none';
    currentTypeForQty = null;
    lastAddBtn = null;
  }
  // Закриття через фон або кнопку
  qtyBackdrop && qtyBackdrop.addEventListener('click', closeQtyMenu);
  qtyCloseBtn && qtyCloseBtn.addEventListener('click', closeQtyMenu);
  // Додати у кошик і запам’ятати вибір
  qtyAddBtn && qtyAddBtn.addEventListener('click', () => {
    if (!currentTypeForQty) return;
    const q = qtyOptions[qtyIdx];
    const priceTable = PRICES[currentTypeForQty];
    addToCart(currentTypeForQty, q);
    // Запам’ятати останній вибір
    const map = loadLastQty();
    map[currentTypeForQty] = q;
    saveLastQty(map);
    // Оновити текст кнопки, з якої відкрили (показати суму)
    if (lastAddBtn) {
      lastAddBtn.setAttribute('data-qty', q);
      lastAddBtn.textContent = 'У кошик — ' + formatUAH(priceTable[q]);
    }
    closeQtyMenu();
  });
})();
