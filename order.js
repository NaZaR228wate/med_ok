/* order.js — conversion + 1-click + NP */

const CART_KEY  = 'medok_cart_v1';
const API_BASE  = 'https://medok-proxy.veter010709.workers.dev';
const API_ORDER = `${API_BASE}/order`;

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const formatUAH = (n) => '₴' + Number(n||0).toLocaleString('uk-UA');
const debounce = (fn, ms=350) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

(function initYear(){
    const y = $('#y');
    if (y) y.textContent = new Date().getFullYear();
})();

function toast(msg='✅ Готово'){
    let el = document.querySelector('.toast');
    if (!el){
        el = document.createElement('div');
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 1700);
}

function loadCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}
function cartTotal(items){ return items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.count)||0), 0); }

function normalizePhone(raw){
    const d = String(raw||'').replace(/[^\d+]/g,'');
    if (/^0\d{9}$/.test(d)) return '+38' + d;
    if (/^\+?380\d{9}$/.test(d)) return d.startsWith('+') ? d : ('+'+d);
    return d;
}
function formatPhoneDisplay(raw){
    const digits = String(raw||'').replace(/\D/g,'');
    let d = digits;
    if (d.startsWith('380')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    const p = (i,j)=> d.slice(i,j);
    const out = `+380 (${p(0,2)}) ${p(2,5)} ${p(5,7)} ${p(7,9)}`.trim();
    return out.replace(/\s+/g,' ');
}

function applyPhoneMask(id){
    const phone = $('#'+id);
    if (!phone) return;

    phone.addEventListener('input', ()=>{
        const digits = phone.value.replace(/\D/g,'');
        if (digits.length >= 9) phone.value = formatPhoneDisplay(phone.value);
    });

    phone.addEventListener('blur', ()=>{
        phone.value = formatPhoneDisplay(phone.value);
    });
}

/* NP API */
async function fetchCities(q){
    if ((q||'').trim().length < 2) return [];
    const r = await fetch(`${API_BASE}/np/cities?q=${encodeURIComponent(q)}`);
    const j = await r.json().catch(()=>({}));
    return Array.isArray(j?.data) ? j.data : [];
}
async function fetchWarehousesByCityName(city){
    if (!city) return [];
    const r = await fetch(`${API_BASE}/np/warehouses?city=${encodeURIComponent(city)}`);
    const j = await r.json().catch(()=>({}));
    return Array.isArray(j?.data) ? j.data : [];
}

function initNovaPoshta(){
    const cityInput = $('#citySearch');
    const citySel   = $('#city');
    const whSel     = $('#warehouse');
    const whStatus  = $('#wh-status');
    if (!cityInput || !citySel || !whSel) return;

    cityInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') e.preventDefault(); });

    const SAVED_CITY_KEY = 'medok_np_city';
    const SAVED_WH_KEY   = 'medok_np_warehouse';

    const setEmptyCity = (text='Спочатку введіть 2+ літери')=>{
        citySel.innerHTML = `<option value="">— ${text} —</option>`;
        citySel.disabled = false;
    };
    const setEmptyWh = (text='Спочатку оберіть місто')=>{
        whSel.innerHTML = `<option value="">— ${text} —</option>`;
        whSel.disabled = false;
    };

    setEmptyCity();
    setEmptyWh();

    cityInput.addEventListener('input', debounce(async ()=>{
        const q = cityInput.value.trim();
        if (q.length < 2){
            setEmptyCity('Спочатку введіть 2+ літери');
            setEmptyWh('Спочатку оберіть місто');
            if (whStatus) whStatus.textContent = '';
            return;
        }

        setEmptyCity('Завантаження…');
        setEmptyWh('Спочатку оберіть місто');
        if (whStatus) whStatus.textContent = '';

        try{
            const cities = await fetchCities(q);
            if (!cities.length){
                setEmptyCity('Місто не знайдено');
                return;
            }
            citySel.innerHTML = [
                `<option value="">— Оберіть місто —</option>`,
                ...cities.map(c=>`<option value="${c.Description}">${c.Description}</option>`)
            ].join('');
            citySel.disabled = false;
        }catch{
            setEmptyCity('Помилка завантаження');
        }
    }, 320));

    citySel.addEventListener('change', async ()=>{
        const city = citySel.value;
        if (!city){ setEmptyWh('Спочатку оберіть місто'); return; }

        localStorage.setItem(SAVED_CITY_KEY, city);
        localStorage.removeItem(SAVED_WH_KEY);

        if (whStatus) whStatus.textContent = '🔄 Завантаження відділень…';
        setEmptyWh('Завантаження…');

        try{
            const list = await fetchWarehousesByCityName(city);
            if (!list.length){
                setEmptyWh('Немає відділень');
                if (whStatus) whStatus.textContent = '';
                return;
            }
            whSel.innerHTML = [
                `<option value="">— Оберіть відділення —</option>`,
                ...list.map(w=>`<option value="${w.Description}">${w.Description}</option>`)
            ].join('');
            whSel.disabled = false;

            const savedWh = localStorage.getItem(SAVED_WH_KEY);
            if (savedWh) whSel.value = savedWh;

            if (whStatus) whStatus.textContent = '';
        }catch{
            setEmptyWh('Помилка завантаження');
            if (whStatus) whStatus.textContent = 'Помилка завантаження';
        }
    });

    whSel.addEventListener('change', ()=>{
        const v = whSel.value;
        if (v) localStorage.setItem(SAVED_WH_KEY, v);
        else localStorage.removeItem(SAVED_WH_KEY);
    });

    (async ()=>{
        const savedCity = localStorage.getItem(SAVED_CITY_KEY);
        if (!savedCity) return;
        cityInput.value = savedCity;

        try{
            const cities = await fetchCities(savedCity);
            if (cities.length){
                citySel.innerHTML = [
                    `<option value="">— Оберіть місто —</option>`,
                    ...cities.map(c=>`<option value="${c.Description}">${c.Description}</option>`)
                ].join('');
                citySel.value = savedCity;
            }

            if (whStatus) whStatus.textContent = '🔄 Завантаження відділень…';
            const list = await fetchWarehousesByCityName(savedCity);
            whSel.innerHTML = [
                `<option value="">— Оберіть відділення —</option>`,
                ...list.map(w=>`<option value="${w.Description}">${w.Description}</option>`)
            ].join('');
            const savedWh = localStorage.getItem(SAVED_WH_KEY);
            if (savedWh) whSel.value = savedWh;
            if (whStatus) whStatus.textContent = '';
            whSel.disabled = false;
        }catch{
            if (whStatus) whStatus.textContent = '';
        }
    })();
}

async function sendOrder(payload){
    const r = await fetch(API_ORDER, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
}

/* 1-click */
function initOneClick(){
    const btn = $('#oneclickBtn');
    const input = $('#oneclickPhone');
    const hint = $('#oneclickHint');
    if (!btn || !input) return;

    applyPhoneMask('oneclickPhone');

    btn.addEventListener('click', async ()=>{
        const items = loadCart();
        if (!items.length){
            toast('🛒 Спочатку додайте товар у кошик');
            return;
        }

        const phoneRaw = input.value.trim();
        const phone = normalizePhone(phoneRaw);
        const digits = phone.replace(/\D/g,'');
        if (!(digits.length === 12 && digits.startsWith('380'))){
            toast('⚠️ Вкажіть телефон у форматі +380...');
            input.focus();
            navigator.vibrate?.(20);
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Надсилаємо…';
        if (hint) hint.textContent = 'Надсилаємо запит…';

        try{
            const payload = {
                from_cart: true,
                cart: items,
                cart_total: cartTotal(items),
                phone,
                name: '',
                pay: 'cod',
                comment: '⚡ Замовлення в 1 клік. Передзвоніть, щоб уточнити місто/відділення.'
            };

            const res = await sendOrder(payload);
            navigator.vibrate?.(50);
            toast('✅ Прийнято! Ми передзвонимо за 1–3 хв');

            if (hint) hint.textContent = '✅ Готово! Очікуйте дзвінок/повідомлення.';
            input.value = '';
            setTimeout(()=>{
                const orderId = res?.order_id || '';
                window.location.href = orderId ? `thank-you.html?order=${encodeURIComponent(orderId)}` : 'thank-you.html';
            }, 700);

        }catch(err){
            console.error(err);
            toast('❌ Помилка: ' + (err?.message || 'невідомо'));
            if (hint) hint.textContent = 'Спробуйте ще раз або оформіть через форму нижче.';
            btn.disabled = false;
            btn.textContent = 'Передзвоніть мені';
            navigator.vibrate?.(20);
        }
    });
}

/* Full form submit */
function initSubmit(){
    const form = $('#order');
    if (!form) return;

    applyPhoneMask('phone');

    form.addEventListener('submit', async (e)=>{
        e.preventDefault();

        const items = loadCart();
        if (!items.length){
            toast('🛒 Кошик порожній — додайте товари');
            return;
        }

        const name = $('#name')?.value.trim();
        const phone = normalizePhone($('#phone')?.value.trim());
        const city = $('#city')?.value.trim();
        const wh = $('#warehouse')?.value.trim();

        if (!name || !phone || !city || !wh){
            toast('⚠️ Заповніть усі обовʼязкові поля');
            navigator.vibrate?.(20);
            return;
        }

        const btn = $('#submitBtn');
        if (btn){ btn.disabled = true; btn.textContent = '⏳ Надсилаємо…'; }

        try{
            const payload = {
                from_cart: true,
                cart: items,
                cart_total: cartTotal(items),
                name,
                phone,
                pay: document.querySelector('input[name="pay"]:checked')?.value || 'cod',
                np_city: city,
                np_warehouse: wh,
                comment: $('#comment')?.value.trim()
            };

            const res = await sendOrder(payload);
            navigator.vibrate?.(50);
            toast('✅ Замовлення прийнято!');

            localStorage.removeItem(CART_KEY);

            setTimeout(()=>{
                const orderId = res?.order_id || '';
                window.location.href = orderId ? `thank-you.html?order=${encodeURIComponent(orderId)}` : 'thank-you.html';
            }, 650);

        }catch(err){
            console.error(err);
            toast('❌ Не вдалося надіслати: ' + (err?.message || 'помилка'));
            if (btn){ btn.disabled = false; btn.textContent = '✅ Підтвердити замовлення'; }
        }
    });
}

/* Mobile menu */
function initMobileMenu(){
    const burger = $('#burgerBtn');
    const menu   = $('#mobileMenu');
    const back   = $('#mobileBackdrop');
    const close  = $('#closeMenuBtn');
    if (!burger || !menu || !back || !close) return;

    const open = ()=>{ menu.classList.add('active'); back.classList.add('active'); document.body.style.overflow='hidden'; };
    const shut = ()=>{ menu.classList.remove('active'); back.classList.remove('active'); document.body.style.overflow=''; };

    burger.addEventListener('click', open);
    back.addEventListener('click', shut);
    close.addEventListener('click', shut);
}

/* Sticky CTA */
function initSticky(){
    const bar = $('#stickyBar');
    const btn = $('#stickyBtn');
    const total = $('#stickyTotal');
    if (!bar || !btn) return;

    const items = loadCart();
    if (total) total.textContent = formatUAH(cartTotal(items));

    btn.addEventListener('click', ()=>{
        $('#submitBtn')?.click();
        navigator.vibrate?.(20);
    });

    const onScroll = ()=>{
        const submit = $('#submitBtn');
        if (!submit) return;
        const r = submit.getBoundingClientRect();
        const near = r.top < window.innerHeight && r.bottom > 0;
        bar.style.display = near ? 'none' : '';
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
}

document.addEventListener('DOMContentLoaded', ()=>{
    initNovaPoshta();
    initOneClick();
    initSubmit();
    initMobileMenu();
    initSticky();
});
