(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const catalog = window.MEDOK_CATALOG;
    const CART_KEY = 'medok_cart_v1';
    const LAST_QTY_KEY = 'medok_last_qty_v1';
    const formatUAH = (n) => '₴' + Number(n || 0).toLocaleString('uk-UA');

    function showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 200);
        }, 1000);
    }

    function loadCart() {
        try {
            const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
            const normalized = catalog ? catalog.normalizeCart(raw) : raw;
            if (catalog && catalog.hasCartChanged(raw, normalized)) saveCart(normalized);
            return normalized;
        } catch {
            return [];
        }
    }

    function saveCart(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('cart:changed'));
    }

    function loadLastQty() {
        try {
            return JSON.parse(localStorage.getItem(LAST_QTY_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveLastQty(map) {
        localStorage.setItem(LAST_QTY_KEY, JSON.stringify(map));
    }

    function addToCart(productId, qtyLiters) {
        const product = catalog?.getProduct(productId);
        const qty = String(qtyLiters);
        const price = product?.prices?.[qty];

        if (!product || !product.inStock) {
            alert('Цього меду зараз немає в наявності.');
            return false;
        }
        if (!price) {
            alert('Немає ціни для такого об’єму. Змініть кількість.');
            return false;
        }

        const items = loadCart();
        const key = catalog.itemKey(product.id, qty);
        const existing = items.find((item) => item.key === key);
        if (existing) existing.count += 1;
        else items.push({ key, productId: product.id, type: product.name, qty, price: Number(price), count: 1 });
        saveCart(items);
        showToast('Додано в кошик');
        return true;
    }

    function initYear() {
        const y = $('#y');
        if (y) y.textContent = new Date().getFullYear();
    }

    function initMobileMenu() {
        const burger = $('#burgerBtn');
        const close = $('#closeMenuBtn');
        const menu = $('#mobileMenu');
        const bg = $('#mobileBackdrop');
        if (!burger || !menu) return;

        const toggleMenu = (show) => {
            menu.classList.toggle('active', show);
            bg?.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : '';
        };

        burger.addEventListener('click', () => toggleMenu(true));
        close?.addEventListener('click', () => toggleMenu(false));
        bg?.addEventListener('click', () => toggleMenu(false));
        $$('.mobile-link', menu).forEach((link) => link.addEventListener('click', () => toggleMenu(false)));
    }

    function initHeroSlider() {
        const slides = $$('.hero-slider .slide');
        const prevBtn = $('#prev');
        const nextBtn = $('#next');
        if (!slides.length || !prevBtn || !nextBtn) return;

        const autoplayMs = 3000;
        const animMs = 650;
        let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
        let isAnimating = false;
        let autoplayId = null;

        const show = (idx) => {
            if (isAnimating || idx === current) return;
            isAnimating = true;
            slides.forEach((slide, index) => slide.classList.toggle('active', index === idx));
            current = idx;
            setTimeout(() => { isAnimating = false; }, animMs);
        };
        const next = () => show((current + 1) % slides.length);
        const prev = () => show((current - 1 + slides.length) % slides.length);
        const schedule = () => {
            clearTimeout(autoplayId);
            autoplayId = setTimeout(function tick() {
                next();
                autoplayId = setTimeout(tick, autoplayMs);
            }, autoplayMs);
        };

        prevBtn.addEventListener('click', () => { prev(); schedule(); });
        nextBtn.addEventListener('click', () => { next(); schedule(); });
        schedule();
    }

    function initReveal() {
        const els = $$('.reveal');
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) {
            els.forEach((el) => el.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px' });
        els.forEach((el) => io.observe(el));
    }

    function initYearsCounter() {
        const yearsEl = $('#yearsCounter');
        if (!yearsEl) return;
        const target = Number.parseInt(yearsEl.dataset.target || yearsEl.textContent || '40', 10) || 40;

        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            yearsEl.textContent = target;
            return;
        }

        let started = false;
        const animate = () => {
            const duration = 1600;
            const start = performance.now();
            const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                yearsEl.textContent = Math.floor(progress * target);
                if (progress < 1) requestAnimationFrame(tick);
                else yearsEl.textContent = target;
            };
            requestAnimationFrame(tick);
        };

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || started) return;
                started = true;
                animate();
                io.unobserve(entry.target);
            });
        }, { threshold: 0.5 });
        io.observe(yearsEl);
    }

    function hydrateProducts() {
        if (!catalog) return;

        $$('.product-card[data-product-id]').forEach((card) => {
            const product = catalog.getProduct(card.dataset.productId);
            if (!product) return;
            const img = $('.prod-img', card);
            const badge = $('.badge', card);
            const priceBadge = $('.price-badge', card);
            const title = $('.product-title', card);
            const bullets = $('.p-bullets', card);
            const button = $('.addToCart', card);
            const miniPrice = $('.mini-price', card);

            if (img) {
                img.src = product.image;
                img.alt = product.alt;
            }
            if (badge) {
                badge.textContent = product.inStock ? 'В НАЯВНОСТІ' : 'НЕМАЄ В НАЯВНОСТІ';
                badge.classList.toggle('badge--out', !product.inStock);
            }
            if (priceBadge) {
                priceBadge.textContent = product.inStock ? `від ${formatUAH(catalog.minPrice(product))}` : '';
                priceBadge.style.display = product.inStock ? '' : 'none';
            }
            if (title) title.textContent = product.name;
            if (bullets) bullets.innerHTML = product.bullets.map((text) => `<li>${text}</li>`).join('');
            if (button) {
                button.dataset.productId = product.id;
                button.dataset.qty = button.dataset.qty || '1';
                button.disabled = !product.inStock;
                button.textContent = product.inStock ? 'У кошик' : 'Немає в наявності';
                button.setAttribute('aria-disabled', String(!product.inStock));
            }
            if (miniPrice) {
                miniPrice.dataset.productId = product.id;
                miniPrice.innerHTML = Object.entries(product.prices)
                    .filter(([qty]) => qty === '0.5' || qty === '1')
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([qty, price]) => `<span class="pill">${qty} л — ${formatUAH(price)}</span>`)
                    .join(' ');
            }
        });
    }

    function injectProductJsonLd() {
        if (!catalog || $('#productJsonLd')) return;
        const script = document.createElement('script');
        script.id = 'productJsonLd';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(catalog.productJsonLd());
        document.head.appendChild(script);
    }

    let qtyMenu = $('#qtyMenu');
    let qtyBackdrop = $('#qtyBackdrop');
    let qtyCloseBtn = $('#qtyClose');
    let qtyTitle = $('#qtyTitle');
    let qtyMinus = $('#qtyMinus');
    let qtyPlus = $('#qtyPlus');
    let qtyValue = $('#qtyValue');
    let qtyPrice = $('#qtyPrice');
    let qtyAddBtn = $('#qtyAddBtn');
    let currentProductId = null;
    let qtyOptions = [];
    let qtyIdx = 0;
    let lastAddBtn = null;

    function ensureQtyMenu() {
        if (!qtyMenu) {
            const wrapper = document.createElement('div');
            wrapper.id = 'qtyMenu';
            wrapper.setAttribute('aria-hidden', 'true');
            wrapper.style.display = 'none';
            wrapper.innerHTML = `
                <div id="qtyBackdrop"></div>
                <div class="qty-dialog">
                    <div class="qty-head">
                        <div id="qtyTitle"></div>
                        <button id="qtyClose" class="btn-secondary" title="Закрити">✕</button>
                    </div>
                    <label class="muted" style="display:block; margin-bottom:6px;">Кількість літрів</label>
                    <div class="qty-stepper">
                        <button id="qtyMinus" class="qty-step">−</button>
                        <div id="qtyValue" class="qty-value">1 л</div>
                        <button id="qtyPlus" class="qty-step">+</button>
                    </div>
                    <div class="qty-price">
                        Ціна: <b id="qtyPrice">—</b>
                    </div>
                    <button id="qtyAddBtn" class="btn" style="width:100%; margin-top:10px;">Додати в кошик</button>
                </div>
            `;
            document.body.appendChild(wrapper);
        }

        qtyMenu = $('#qtyMenu');
        qtyBackdrop = $('#qtyBackdrop');
        qtyCloseBtn = $('#qtyClose');
        qtyTitle = $('#qtyTitle');
        qtyMinus = $('#qtyMinus');
        qtyPlus = $('#qtyPlus');
        qtyValue = $('#qtyValue');
        qtyPrice = $('#qtyPrice');
        qtyAddBtn = $('#qtyAddBtn');
    }

    function setQtyByIndex(index, priceTable) {
        qtyIdx = Math.max(0, Math.min(index, qtyOptions.length - 1));
        const qty = qtyOptions[qtyIdx];
        if (qtyValue) qtyValue.textContent = `${qty} л`;
        if (qtyPrice) qtyPrice.textContent = formatUAH(priceTable[qty]);
    }

    function closeQtyMenu() {
        if (qtyMenu?._cleanup) qtyMenu._cleanup();
        if (qtyMenu) {
            qtyMenu.style.display = 'none';
            qtyMenu.setAttribute('aria-hidden', 'true');
        }
        currentProductId = null;
        lastAddBtn = null;
    }

    function openQtyMenu(productId, defaultQty, fromBtn) {
        const product = catalog?.getProduct(productId);
        if (!product || !product.inStock) {
            alert('Цього меду зараз немає в наявності.');
            return;
        }
        ensureQtyMenu();
        if (!qtyMenu || !product.prices) return;
        if (qtyMenu._cleanup) qtyMenu._cleanup();

        currentProductId = product.id;
        lastAddBtn = fromBtn instanceof Element ? fromBtn : null;
        if (qtyTitle) qtyTitle.textContent = product.name;
        if (qtyAddBtn) {
            qtyAddBtn.textContent = lastAddBtn?.dataset.orderAfterAdd === 'true'
                ? 'Додати і оформити замовлення'
                : 'Додати в кошик';
        }

        qtyOptions = Object.keys(product.prices)
            .map(Number)
            .sort((a, b) => a - b)
            .map(String);
        const lastMap = loadLastQty();
        const preferred = String(lastMap[product.id] || defaultQty || qtyOptions[0]);
        setQtyByIndex(Math.max(0, qtyOptions.indexOf(preferred)), product.prices);

        qtyMenu.style.display = 'block';
        qtyMenu.setAttribute('aria-hidden', 'false');

        const onMinus = () => setQtyByIndex(qtyIdx - 1, product.prices);
        const onPlus = () => setQtyByIndex(qtyIdx + 1, product.prices);
        qtyMinus?.addEventListener('click', onMinus);
        qtyPlus?.addEventListener('click', onPlus);
        qtyMenu._cleanup = () => {
            qtyMinus?.removeEventListener('click', onMinus);
            qtyPlus?.removeEventListener('click', onPlus);
        };
    }

    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.addToCart');
        if (!btn) return;
        if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
        openQtyMenu(btn.dataset.productId || btn.dataset.type, btn.dataset.qty || '1', btn);
    });

    ensureQtyMenu();
    qtyBackdrop?.addEventListener('click', closeQtyMenu);
    qtyCloseBtn?.addEventListener('click', closeQtyMenu);
    qtyAddBtn?.addEventListener('click', () => {
        if (!currentProductId) return;
        const qty = qtyOptions[qtyIdx];
        const product = catalog.getProduct(currentProductId);
        const shouldRedirectToOrder = lastAddBtn?.dataset.orderAfterAdd === 'true';
        if (!addToCart(currentProductId, qty)) return;

        const map = loadLastQty();
        map[currentProductId] = qty;
        saveLastQty(map);
        if (lastAddBtn && product && !shouldRedirectToOrder) {
            lastAddBtn.dataset.qty = qty;
            lastAddBtn.textContent = `У кошик — ${formatUAH(product.prices[qty])}`;
        }
        closeQtyMenu();
        if (shouldRedirectToOrder) {
            window.location.href = 'order.html';
        }
    });

    initYear();
    initMobileMenu();
    initHeroSlider();
    initReveal();
    initYearsCounter();
    hydrateProducts();
    injectProductJsonLd();
})();

window.addEventListener('load', () => {
    const late = [
        ['[data-flavor="linden"]', 'assets/hero-linden.webp'],
        ['[data-flavor="sunflower"]', 'assets/hero-sunflower.webp']
    ];
    const setBg = ([sel, url]) => {
        const el = document.querySelector('.hero-slider ' + sel);
        if (el && !el.style.backgroundImage) el.style.backgroundImage = `url("${url}")`;
    };
    (window.requestIdleCallback || setTimeout)(() => late.forEach(setBg), 150);
});
