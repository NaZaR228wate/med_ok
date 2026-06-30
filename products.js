(function () {
    'use strict';

    const SITE_URL = 'https://medok.ink';

    const products = [
        {
            id: 'mixed',
            name: 'Різнотрав’я',
            fullName: 'Мед різнотрав’я',
            sku: 'honey-mixed-01',
            inStock: true,
            image: 'assets/prod-mixed.webp',
            alt: 'Банка меду різнотрав’я з сімейної пасіки Medok',
            description: 'Квітковий букет із лугів і гаїв Бориспільського району. Збалансований універсальний смак.',
            bullets: ['Квітковий букет із лугів і гаїв', 'Збалансований смак, універсальний'],
            prices: { '0.5': 140, '1': 240, '2': 440, '3': 630, '4': 800, '5': 960 },
            reviewCount: 24
        },
        {
            id: 'linden',
            name: 'Липовий',
            fullName: 'Липовий мед',
            sku: 'honey-linden-02',
            inStock: true,
            image: 'assets/prod-linden.webp',
            alt: 'Банка липового меду Medok',
            description: 'Запашний аромат липи. Добрий вибір для чаю та сезонної профілактики.',
            bullets: ['Запашний аромат липи', 'Добрий для чаю та профілактики'],
            prices: { '0.5': 150, '1': 260, '2': 480, '3': 690, '4': 880, '5': 1050 },
            reviewCount: 18
        },
        {
            id: 'acacia',
            name: 'Акація',
            fullName: 'Акацієвий мед',
            sku: 'honey-acacia-03',
            inStock: true,
            image: 'assets/prod-acacia.webp',
            alt: 'Банка акацієвого меду Medok',
            description: 'Ніжний акацієвий мед, який довго залишається рідким і добре смакує з чаєм.',
            bullets: ['Довго лишається рідким', 'Ніжний смак для щоденного чаю'],
            prices: { '0.5': 170, '1': 300, '2': 560, '3': 810, '4': 1040, '5': 1250 },
            reviewCount: 32
        },
        {
            id: 'sunflower',
            name: 'Соняшниковий',
            fullName: 'Соняшниковий мед',
            sku: 'honey-sun-04',
            inStock: true,
            image: 'assets/prod-sunflower.webp',
            alt: 'Банка соняшникового меду Medok',
            description: 'Насичений смак і швидка кристалізація. Добре підходить до тостів і випічки.',
            bullets: ['Виразний смак, швидка кристалізація', 'Круто до тостів і випічки'],
            prices: { '0.5': 130, '1': 220, '2': 400, '3': 570, '4': 720, '5': 860 },
            reviewCount: 15
        }
    ];

    const legacyNames = {
        'Різнотравʼя': 'mixed',
        'Різнотрав’я': 'mixed',
        'Липовий': 'linden',
        'Акація': 'acacia',
        'Акацієвий': 'acacia',
        'Соняшниковий': 'sunflower'
    };

    const byId = Object.fromEntries(products.map((product) => [product.id, product]));

    function getProduct(value) {
        if (!value) return null;
        const key = String(value).trim();
        return byId[key] || byId[legacyNames[key]] || products.find((product) => product.name === key || product.fullName === key) || null;
    }

    function getPrices(value) {
        return getProduct(value)?.prices || null;
    }

    function isAvailable(value) {
        return getProduct(value)?.inStock === true;
    }

    function minPrice(product) {
        const values = Object.values(product.prices).map(Number).filter(Boolean);
        return values.length ? Math.min(...values) : 0;
    }

    function itemKey(productId, qty) {
        return `${productId}|${qty}`;
    }

    function normalizeCartItem(item) {
        const product = getProduct(item.productId || item.id || item.type);
        const qty = String(item.qty || '1');
        if (!product || !product.inStock || !product.prices[qty]) return null;
        const count = Math.max(1, Number.parseInt(item.count, 10) || 1);
        return {
            key: itemKey(product.id, qty),
            productId: product.id,
            type: product.name,
            qty,
            price: Number(product.prices[qty]),
            count
        };
    }

    function normalizeCart(items) {
        const map = new Map();
        (Array.isArray(items) ? items : []).forEach((item) => {
            const normalized = normalizeCartItem(item);
            if (!normalized) return;
            const existing = map.get(normalized.key);
            if (existing) existing.count += normalized.count;
            else map.set(normalized.key, normalized);
        });
        return Array.from(map.values());
    }

    function hasCartChanged(original, normalized) {
        return JSON.stringify(original || []) !== JSON.stringify(normalized || []);
    }

    function productJsonLd() {
        return {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Натуральний мед з пасіки Medok',
            description: 'Свіжі сорти меду з сімейної пасіки в Бориспільському районі.',
            itemListElement: products.map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'Product',
                    name: product.fullName,
                    image: `${SITE_URL}/${product.image}`,
                    description: product.description,
                    brand: { '@type': 'Brand', name: 'Medok' },
                    sku: product.sku,
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: '5',
                        reviewCount: String(product.reviewCount)
                    },
                    offers: {
                        '@type': 'Offer',
                        price: String(minPrice(product)),
                        priceCurrency: 'UAH',
                        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        url: `${SITE_URL}/order.html`,
                        priceValidUntil: '2026-12-31'
                    }
                }
            }))
        };
    }

    window.MEDOK_CATALOG = {
        products,
        getProduct,
        getPrices,
        isAvailable,
        minPrice,
        itemKey,
        normalizeCart,
        normalizeCartItem,
        hasCartChanged,
        productJsonLd
    };
})();
