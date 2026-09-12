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
    lenis = new Lenis({ duration: 1.65, smoothWheel: true, touchMultiplier: 1.15 });
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

// ——— CINEMATIC SOUND: drone + wind + pentatonic chimes, all synthesized live ———
let actx = null, master = null, delaySend = null, windBuf = null, soundOn = false;
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
function initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0;
    master.connect(actx.destination);
    // cathedral space
    const delay = actx.createDelay(1);
    delay.delayTime.value = 0.45;
    const fb = actx.createGain();
    fb.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(master);
    delaySend = delay;
    // low earth drone
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 280;
    const dg = actx.createGain(); dg.gain.value = 0.05;
    [55, 55.6, 65.41, 98, 110.4].forEach(f => {
        const o = actx.createOscillator();
        o.type = 'sine'; o.frequency.value = f;
        o.connect(lp); o.start();
    });
    lp.connect(dg); dg.connect(master);
    // wind through bamboo
    const len = actx.sampleRate * 2;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    windBuf = buf;
    const bp = actx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.45;
    const wg = actx.createGain(); wg.gain.value = 0.02;
    const lfo = actx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = actx.createGain(); lfoG.gain.value = 0.014;
    lfo.connect(lfoG); lfoG.connect(wg.gain); lfo.start();
    noise.connect(bp); bp.connect(wg); wg.connect(master);
    noise.start();
    return true;
}
function chime(i) {
    if (!soundOn || !actx) return;
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    const o = actx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length];
    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(g); g.connect(master); g.connect(delaySend);
    o.start(t); o.stop(t + 3);
}
// scene-cut swell — air rushing past the lens
function swell() {
    if (!soundOn || !actx || !windBuf) return;
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    const src = actx.createBufferSource();
    src.buffer = windBuf; src.loop = true;
    const bp = actx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(280, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.8);
    bp.frequency.exponentialRampToValueAtTime(320, t + 1.8);
    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 2.2);
}
// temple bell — once, when the finale arrives
function bell() {
    if (!soundOn || !actx) return;
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    [[174, 0.14], [351.5, 0.07], [511.6, 0.05], [690.8, 0.03]].forEach(([f, v]) => {
        const o = actx.createOscillator();
        o.type = 'sine'; o.frequency.value = f;
        const g = actx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
        o.connect(g); g.connect(master); g.connect(delaySend);
        o.start(t); o.stop(t + 7.2);
    });
}
const closingEl = document.querySelector('.closing');
if (closingEl) {
    const bio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { bell(); bio.disconnect(); }
    }), { threshold: 0.4 });
    bio.observe(closingEl);
}
const soundBtn = document.getElementById('soundBtn');
if (soundBtn) soundBtn.addEventListener('click', () => {
    if (!actx && !initAudio()) return;
    if (actx.state === 'suspended') actx.resume();
    soundOn = !soundOn;
    const t = actx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(soundOn ? 0.6 : 0, t + 1.2);
    soundBtn.classList.toggle('on', soundOn);
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    if (soundOn) chime(0);
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
tabs.forEach(t => t.addEventListener('click', () => {
    const i = parseInt(t.dataset.s || '0', 10);
    setSeason(i);
    chime(i + 2);
}));

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
    if (!calm && driftSet.size) {
        const vh = innerHeight;
        driftSet.forEach(o => {
            const r = o.img.getBoundingClientRect();
            const p = (r.top + r.height / 2 - vh / 2) / vh;
            o.img.style.translate = `0 ${(p * -44).toFixed(1)}px`;
            if (o.cap) o.cap.style.translate = `0 ${(p * 26).toFixed(1)}px`;
        });
    }
    tick = false;
}
addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } }, { passive: true });
if (lenis) lenis.on('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } });
frame();

const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// each shot entering frame plays its note
const clearings = [...document.querySelectorAll('.clearing')];
const sio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (!el.classList.contains('in')) {
        el.classList.add('in');
        chime(clearings.indexOf(el));
        swell();
    }
}), { threshold: 0.45 });
clearings.forEach(el => sio.observe(el));

// documentary drift — backgrounds sink slower than captions
const driftSet = new Set();
const vio = new IntersectionObserver(es => es.forEach(e => {
    const img = e.target.querySelector('.clearing-bg img');
    const cap = e.target.querySelector('.clearing-cap');
    if (!img) return;
    let found = null;
    driftSet.forEach(o => { if (o.img === img) found = o; });
    if (e.isIntersecting && !found) driftSet.add({ img, cap });
    if (!e.isIntersecting && found) driftSet.delete(found);
}), { rootMargin: '10% 0px 10% 0px', threshold: 0 });
clearings.forEach(el => vio.observe(el));

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
