const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const fine = !calm && !coarse;
const isNight = () => document.documentElement.dataset.theme === 'dark';

// loader — always clears
(function loader() {
    const l = document.getElementById('loader');
    let done = false;
    const clear = () => {
        if (done || !l) return;
        done = true;
        l.classList.add('done');
        document.body.classList.add('ready');
        setTimeout(() => l.remove(), 1000);
    };
    addEventListener('load', () => setTimeout(clear, 300));
    setTimeout(clear, 3000);
})();

let lenis = null;
if (!calm && window.Lenis) {
    lenis = new Lenis({ duration: 1.4, smoothWheel: true });
    const drive = t => { lenis.raf(t); requestAnimationFrame(drive); };
    requestAnimationFrame(drive);
}

// day / night — remembered
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('nihon-theme', next); } catch (e) { /* private mode */ }
});

document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: -70 });
    else el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
}));
const toTop = document.getElementById('toTop');
if (toTop) toTop.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0);
    else scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
});
const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();

// quiet image fade-in
document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) img.classList.add('ok');
    else {
        img.addEventListener('load', () => img.classList.add('ok'), { once: true });
        img.addEventListener('error', () => img.classList.add('ok'), { once: true });
    }
});

// seasons — one stone, four moss words
const tabs = [...document.querySelectorAll('.sbtn')];
const bgs = [...document.querySelectorAll('.stage-bg')];
function setSeason(i) {
    const n = (i + bgs.length) % bgs.length;
    bgs.forEach((b, k) => b.classList.toggle('on', k === n));
    tabs.forEach((t, k) => {
        t.classList.toggle('on', k === n);
        t.setAttribute('aria-selected', k === n ? 'true' : 'false');
    });
}
tabs.forEach(t => t.addEventListener('click', () => setSeason(parseInt(t.dataset.s || '0', 10))));

const nav = document.getElementById('nav');
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));
let tick = false, lastY = 0;
function frame() {
    const y = scrollY || 0;
    if (y > 300 && y > lastY + 4) nav.classList.add('hide');
    else if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
    // kana follows the walk
    const ids = ['#p-lake', '#p-forest', '#p-road', '#p-miyajima'];
    let best = 0, bd = 1e9;
    ids.forEach((sel, k) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const d = Math.abs(el.getBoundingClientRect().top + el.offsetHeight / 2 - innerHeight / 2);
        if (d < bd) { bd = d; best = k; }
    });
    document.querySelectorAll('.kana .k').forEach(l => l.classList.remove('is-on'));
    const link = document.querySelector('.kana .k[href="' + ids[best] + '"]');
    if (link) link.classList.add('is-on');
    tick = false;
}
addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } }, { passive: true });
if (lenis) lenis.on('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } });
frame();

const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// drifting leaves by day, fireflies by night
(function drift() {
    if (calm) return;
    const c = document.getElementById('petals');
    const heroEl = document.querySelector('.hero');
    if (!c || !heroEl) return;
    const ctx = c.getContext('2d');
    let W, H, ps = [];
    function size() {
        const r = heroEl.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        W = r.width; H = r.height;
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 7 : 13;
    for (let i = 0; i < N; i++) ps.push(spawn(true));
    function spawn(any) {
        return { x: Math.random() * W, y: any ? Math.random() * H : -10, s: 1.5 + Math.random() * 3, v: 0.18 + Math.random() * 0.4, ph: Math.random() * Math.PI * 2, sw: 0.3 + Math.random() * 0.7, o: 0.2 + Math.random() * 0.35, tw: Math.random() * Math.PI * 2 };
    }
    (function tick() {
        if (document.hidden) { requestAnimationFrame(tick); return; }
        if (scrollY < innerHeight * 1.2) {
            const night = isNight();
            ctx.clearRect(0, 0, W, H);
            for (let p of ps) {
                p.y += p.v; p.ph += 0.007; p.tw += 0.03; p.x += Math.sin(p.ph) * p.sw * 0.35;
                if (p.y > H + 12) Object.assign(p, spawn(false));
                ctx.globalAlpha = night ? p.o * (0.45 + 0.55 * Math.abs(Math.sin(p.tw))) : p.o;
                ctx.fillStyle = night ? '#ffe9a3' : '#fffdf4';
                ctx.beginPath();
                ctx.arc(p.x, p.y, night ? p.s * 0.8 : p.s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        requestAnimationFrame(tick);
    })();
})();

if (fine) {
    const dot = document.getElementById('dot');
    addEventListener('pointermove', e => {
        dot.style.opacity = '1';
        dot.style.transform = `translate3d(${(e.clientX - 3).toFixed(1)}px,${(e.clientY - 3).toFixed(1)}px,0)`;
    }, { passive: true });
}
