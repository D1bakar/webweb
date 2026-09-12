const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const fine = !calm && !coarse;
if (calm) document.body.classList.add('calm');
const isNight = () => document.documentElement.dataset.theme === 'dark';

// loader — always clears, even if assets hang
(function loader() {
    const l = document.getElementById('loader');
    let done = false;
    const clear = () => {
        if (done || !l) return;
        done = true;
        l.classList.add('done');
        document.body.classList.add('ready');
        setTimeout(() => l.remove(), 900);
    };
    addEventListener('load', () => setTimeout(clear, 350));
    setTimeout(clear, 3200);
})();

let lenis = null;
if (!calm && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    const drive = t => { lenis.raf(t); requestAnimationFrame(drive); };
    requestAnimationFrame(drive);
}

// day / night — remembered, summer first
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('nihon-theme', next); } catch (e) { /* private mode */ }
});

const cinema = document.getElementById('journey');
const scenes = [...document.querySelectorAll('.scene')];
const jprog = document.getElementById('jprog');
const jcur = document.getElementById('jcur');
let curScene = -1;
const pad2 = n => (n < 10 ? '0' + n : '' + n);
function driveCinema(y) {
    if (!cinema || !scenes.length) return;
    if (calm) {
        if (curScene !== 0) { scenes.forEach(s => s.classList.add('on')); curScene = 0; }
        return;
    }
    const total = Math.max(1, cinema.offsetHeight - innerHeight);
    const r = cinema.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / total));
    const pos = p * scenes.length;
    let idx = Math.min(scenes.length - 1, Math.floor(pos));
    if (r.bottom < 0 || r.top > innerHeight) idx = curScene < 0 ? 0 : curScene;
    if (idx !== curScene) {
        scenes.forEach((s, i) => s.classList.toggle('on', i === idx));
        curScene = idx;
        if (jcur) jcur.textContent = pad2(idx + 1);
    }
    if (jprog) jprog.style.transform = `scaleX(${p.toFixed(4)})`;
}

document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    // scenes live inside the film — scroll the film to that moment
    if (el.classList && el.classList.contains('scene') && cinema && !calm) {
        const i = scenes.indexOf(el);
        const total = Math.max(1, cinema.offsetHeight - innerHeight);
        const y = cinema.offsetTop + (total * (i + 0.5)) / scenes.length;
        if (lenis) lenis.scrollTo(y);
        else scrollTo({ top: y, behavior: 'smooth' });
        return;
    }
    if (lenis) lenis.scrollTo(el, { offset: id === '#atlas' ? -70 : -60 });
    else el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
}));
const toTop = document.getElementById('toTop');
if (toTop) toTop.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0);
    else scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
});
const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();

// buttery image fade-in — opacity only, never blocks content
document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) img.classList.add('ok');
    else {
        img.addEventListener('load', () => img.classList.add('ok'), { once: true });
        img.addEventListener('error', () => img.classList.add('ok'), { once: true });
    }
});

// season stage — touch a season, the world becomes it; drifts alone until touched
const tabs = [...document.querySelectorAll('.stab')];
const bgs = [...document.querySelectorAll('.stage-bg')];
let curSeason = 0, seasonTouched = false, seasonTimer = 0;
function setSeason(i) {
    curSeason = (i + bgs.length) % bgs.length;
    bgs.forEach((b, k) => b.classList.toggle('on', k === curSeason));
    tabs.forEach((t, k) => {
        t.classList.toggle('on', k === curSeason);
        t.setAttribute('aria-selected', k === curSeason ? 'true' : 'false');
    });
}
tabs.forEach(t => t.addEventListener('click', () => {
    seasonTouched = true;
    clearInterval(seasonTimer);
    setSeason(parseInt(t.dataset.s || '0', 10));
}));
if (!calm && bgs.length > 1) {
    seasonTimer = setInterval(() => {
        if (document.hidden || seasonTouched) return;
        const r = document.getElementById('seasons').getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        setSeason(curSeason + 1);
    }, 5000);
}

const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
const heroIn = document.querySelector('.hero-in');
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));
let tick = false, lastY = 0;
const heroEl = document.querySelector('.hero');
const heroStill = document.querySelector('.hero-still');
const depths = [...document.querySelectorAll('[data-depth]')];
const hero3d = document.querySelector('.hero-3d');
let mx = 0, my = 0;
if (fine && heroEl) {
    heroEl.addEventListener('pointermove', e => {
        const r = heroEl.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
        if (hero3d) hero3d.style.setProperty('--hy', (mx * 10).toFixed(2) + 'deg');
        if (hero3d) hero3d.style.setProperty('--hx', (-my * 8).toFixed(2) + 'deg');
        for (const d of depths) {
            const f = parseFloat(d.dataset.depth) || 20;
            d.style.translate = `${(-mx * f).toFixed(1)}px ${(-my * f).toFixed(1)}px`;
        }
    }, { passive: true });
    heroEl.addEventListener('pointerleave', () => {
        mx = my = 0;
        if (hero3d) { hero3d.style.setProperty('--hy', '0deg'); hero3d.style.setProperty('--hx', '0deg'); }
        for (const d of depths) d.style.translate = '0 0';
    });
}
function frame() {
    const y = scrollY || 0;
    const h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 40);
    if (y > 320 && y > lastY + 4) nav.classList.add('hide');
    else if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
    if (progress) progress.style.transform = `scaleX(${h > 0 ? (y / h).toFixed(4) : 0})`;
    driveCinema(y);
    // kana spy follows the film
    if (curScene >= 0) {
        const map = [['#p-lake', 0], ['#p-forest', 2], ['#p-road', 5], ['#p-miyajima', 9]];
        document.querySelectorAll('.kana .k').forEach(l => l.classList.remove('is-on'));
        let best = 0, bd = 99;
        map.forEach(([sel, si], k) => {
            const d = Math.abs(curScene - si);
            if (d < bd) { bd = d; best = k; }
        });
        const link = document.querySelector('.kana .k[href="' + map[best][0] + '"]');
        if (link) link.classList.add('is-on');
    }
    if (!calm && heroEl && heroStill && y < innerHeight * 1.15) {
        heroStill.style.transform = `translate3d(0,${(y * 0.18).toFixed(1)}px,0)`;
    }
    if (heroIn && y < innerHeight * 1.2) {
        heroIn.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.85)).toFixed(3);
        heroIn.style.translate = `0 ${(y * 0.12).toFixed(1)}px`;
    }
    tick = false;
}
addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } }, { passive: true });
if (lenis) lenis.on('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } });
addEventListener('resize', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } });
frame();

// hanabi — festival fireworks, night only, hero only
(function hanabi() {
    if (calm) return;
    const c = document.getElementById('hanabi');
    if (!c || !heroEl) return;
    const ctx = c.getContext('2d');
    let W, H, parts = [], rockets = [];
    const COLORS = ['#ffd166', '#f2a9c4', '#b4dcff', '#caffbf', '#ff8fa3', '#ffffff'];
    function size() {
        const r = heroEl.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        W = r.width; H = r.height;
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    const launch = () => ({
        x: W * (0.15 + Math.random() * 0.7), y: H + 6,
        vy: -(H * (0.011 + Math.random() * 0.006)),
        col: COLORS[(Math.random() * COLORS.length) | 0],
        target: H * (0.15 + Math.random() * 0.4)
    });
    const boom = r => {
        const n = 60 + ((Math.random() * 40) | 0);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
            const sp = 1 + Math.random() * 3.2;
            parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.008 + Math.random() * 0.012, col: r.col });
        }
    };
    (function tick() {
        if (document.hidden) { requestAnimationFrame(tick); return; }
        const hr = heroEl.getBoundingClientRect();
        const live = isNight() && hr.bottom > 0 && hr.top < innerHeight;
        ctx.clearRect(0, 0, W, H);
        if (live) {
            if (rockets.length < 3 && Math.random() < 0.03) rockets.push(launch());
            rockets = rockets.filter(r => {
                r.y += r.vy;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = r.col;
                ctx.fillRect(r.x, r.y, 2, 6);
                if (r.y <= r.target) { boom(r); return false; }
                return true;
            });
            parts = parts.filter(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vx *= 0.985; p.life -= p.decay;
                if (p.life <= 0) return false;
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.col;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });
            ctx.globalAlpha = 1;
        } else { rockets = []; parts = []; }
        requestAnimationFrame(tick);
    })();
})();

// summer pollen — golden drift by day, spores by night
(function petals() {
    if (calm) return;
    const c = document.getElementById('petals');
    if (!c || !heroEl) return;
    const ctx = c.getContext('2d');
    let W, H, ps = [];
    function size() {
        const r = heroEl.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        W = r.width; H = r.height;
        c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < N; i++) ps.push(spawn(true));
    function spawn(any) {
        return { x: Math.random() * W, y: any ? Math.random() * H : -12, s: 2 + Math.random() * 4.5, v: 0.22 + Math.random() * 0.5, ph: Math.random() * Math.PI * 2, sw: 0.4 + Math.random() * 0.9, o: 0.22 + Math.random() * 0.4 };
    }
    (function tick() {
        if (document.hidden) { requestAnimationFrame(tick); return; }
        if (scrollY < innerHeight * 1.3) {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = isNight() ? '#f2a9c4' : '#ffe9b8';
            for (let p of ps) {
                p.y += p.v; p.ph += 0.008; p.x += Math.sin(p.ph) * p.sw * 0.4;
                if (p.y > H + 14) Object.assign(p, spawn(false));
                ctx.globalAlpha = p.o;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.s, p.s * 0.62, p.ph, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        requestAnimationFrame(tick);
    })();
})();

// liquid glass lens — water-drop spring, sleeps when idle
if (!calm) {
    const glass = document.querySelector('.nav-in');
    if (glass) {
        let tx = 50, gx = 50, vx = 0, press = 0, vpress = 0, tpress = 0;
        let running = false;
        const settled = () => Math.abs(tx - gx) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(tpress - press) < 0.002 && Math.abs(vpress) < 0.002;
        const loop = () => {
            if (document.hidden) { running = false; return; }
            if (!glass.matches(':hover')) tx = 50;
            vx = (vx + (tx - gx) * 0.075) * 0.78;
            gx += vx;
            vpress = (vpress + (tpress - press) * 0.22) * 0.65; press += vpress;
            glass.style.setProperty('--mx', `${gx.toFixed(2)}%`);
            const nx = gx / 100 - 0.5;
            glass.style.setProperty('--ry', `${(nx * 8 + vx * 0.6).toFixed(2)}deg`);
            glass.style.setProperty('--rx', '0deg');
            glass.style.setProperty('--gi', (1 + Math.min(0.5, Math.abs(nx) + Math.abs(vx) * 0.015)).toFixed(2));
            glass.style.setProperty('--press', press.toFixed(3));
            if (settled() && !glass.matches(':hover')) { running = false; return; }
            requestAnimationFrame(loop);
        };
        const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
        kick();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
        glass.addEventListener('pointerenter', kick);
        glass.addEventListener('pointermove', e => {
            const r = glass.getBoundingClientRect();
            tx = ((e.clientX - r.left) / r.width) * 100;
            kick();
        }, { passive: true });
        glass.addEventListener('pointerdown', e => {
            tpress = 1; kick();
            const r = glass.getBoundingClientRect();
            const s = document.createElement('span');
            s.className = 'ripple';
            s.style.setProperty('--rx-px', `${(e.clientX - r.left).toFixed(1)}px`);
            s.style.setProperty('--ry-px', `${(e.clientY - r.top).toFixed(1)}px`);
            glass.appendChild(s);
            setTimeout(() => s.remove(), 850);
        });
        addEventListener('pointerup', () => { tpress = 0; kick(); });
    }
}

if (fine) {
    const dot = document.getElementById('dot');
    addEventListener('pointermove', e => {
        dot.style.opacity = '1';
        dot.style.transform = `translate3d(${(e.clientX - 3.5).toFixed(1)}px,${(e.clientY - 3.5).toFixed(1)}px,0) scale(${document.body.classList.contains('link-hot') ? 2.1 : 1})`;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; });
    document.querySelectorAll('a, button, .nippon, .stab').forEach(el => {
        el.addEventListener('pointerenter', () => document.body.classList.add('link-hot'));
        el.addEventListener('pointerleave', () => document.body.classList.remove('link-hot'));
    });
}
