        const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const coarse = matchMedia('(pointer: coarse)').matches;
        const fine = !calm && !coarse;

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
        document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const el = document.querySelector(id);
            if (!el) return;
            e.preventDefault();
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

        const nav = document.getElementById('nav');
        const progress = document.getElementById('progress');
        const heroIn = document.querySelector('.hero-in');
        const backs = [...document.querySelectorAll('.layer-back')];
        // only parallax images actually on screen — never layout-scan the whole page
        const visibleBacks = new Set();
        if ('IntersectionObserver' in window) {
            const vio = new IntersectionObserver(es => es.forEach(e => {
                const img = e.target.querySelector('.layer-back');
                if (!img) return;
                if (e.isIntersecting) visibleBacks.add(img);
                else visibleBacks.delete(img);
            }), { rootMargin: '20% 0px 20% 0px', threshold: 0 });
            document.querySelectorAll('.place figure').forEach(el => vio.observe(el));
        } else {
            backs.forEach(img => visibleBacks.add(img));
        }
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
            if (!calm && heroEl && heroStill && y < innerHeight * 1.15) {
                heroStill.style.transform = `translate3d(0,${(y * 0.18).toFixed(1)}px,0)`;
            }
            if (heroIn && y < innerHeight * 1.2) {
                heroIn.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.85)).toFixed(3);
                heroIn.style.translate = `0 ${(y * 0.12).toFixed(1)}px`;
            }
            if (!calm && visibleBacks.size) {
                const vh = innerHeight;
                for (const img of visibleBacks) {
                    const r = img.getBoundingClientRect();
                    const p = (r.top + r.height / 2 - vh / 2) / vh;
                    img.style.translate = `0 ${(p * -46).toFixed(1)}px`;
                }
            }
            tick = false;
        }
        addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } }, { passive: true });
        if (lenis) lenis.on('scroll', () => { if (!tick) { requestAnimationFrame(frame); tick = true; } });
        frame();

        // 3D tilt cards — pointer-fine devices only
        if (fine) {
            document.querySelectorAll('.tilt').forEach(card => {
                const inner = card.matches('.place') ? card.querySelector('figure') : card;
                if (!inner) return;
                let raf = 0, rx = 0, ry = 0, trx = 0, try_ = 0;
                const max = card.classList.contains('season-card') ? 12 : 7;
                const render = () => {
                    rx += (trx - rx) * 0.14;
                    ry += (try_ - ry) * 0.14;
                    inner.style.setProperty('--rx', rx.toFixed(2) + 'deg');
                    inner.style.setProperty('--ry', ry.toFixed(2) + 'deg');
                    if (Math.abs(trx - rx) > 0.02 || Math.abs(try_ - ry) > 0.02) raf = requestAnimationFrame(render);
                    else raf = 0;
                };
                const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
                card.addEventListener('pointermove', e => {
                    const r = inner.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width - 0.5;
                    const py = (e.clientY - r.top) / r.height - 0.5;
                    try_ = (px * max * 2).toFixed(2) * 1;
                    trx = (-py * max * 2).toFixed(2) * 1;
                    inner.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
                    inner.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
                    kick();
                }, { passive: true });
                card.addEventListener('pointerleave', () => { trx = try_ = 0; kick(); });
            });
        }

        // magnetic pull — small elements only
        if (fine) {
            document.querySelectorAll('.magnetic').forEach(el => {
                el.addEventListener('pointermove', e => {
                    const r = el.getBoundingClientRect();
                    const x = ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1);
                    const y = ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1);
                    el.style.translate = `${x}px ${y}px`;
                }, { passive: true });
                el.addEventListener('pointerleave', () => { el.style.translate = '0 0'; });
            });
        }

        // kana scroll-spy — highlight nearest chapter
        const spyMap = [['#p-lake', '.kana .k[href="#p-lake"]'], ['#p-forest', '.kana .k[href="#p-forest"]'], ['#p-road', '.kana .k[href="#p-road"]'], ['#p-miyajima', '.kana .k[href="#p-miyajima"]']];
        if ('IntersectionObserver' in window) {
            const links = new Map(spyMap.map(([sec, link]) => [sec, document.querySelector(link)]));
            const spy = new IntersectionObserver(es => es.forEach(e => {
                if (!e.isIntersecting) return;
                links.forEach(l => l && l.classList.remove('is-on'));
                const l = links.get('#' + e.target.id);
                if (l) l.classList.add('is-on');
            }), { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
            spyMap.forEach(([sec]) => { const el = document.querySelector(sec); if (el) spy.observe(el); });
        }

        const io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }), { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('.reveal').forEach(el => io.observe(el));
        const pio = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { e.target.closest('.place').classList.add('in'); pio.unobserve(e.target); }
        }), { threshold: 0.25 });
        document.querySelectorAll('.place figure').forEach(el => pio.observe(el));

        // animated counters
        const cio = new IntersectionObserver(es => es.forEach(e => {
            if (!e.isIntersecting) return;
            cio.unobserve(e.target);
            const el = e.target;
            const end = parseInt(el.dataset.count || '0', 10);
            if (calm || end <= 0) { el.textContent = end; return; }
            const t0 = performance.now(), dur = 1300;
            const step = t => {
                const p = Math.min(1, (t - t0) / dur);
                el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }), { threshold: 0.6 });
        document.querySelectorAll('.num[data-count]').forEach(el => cio.observe(el));

        // petals — sakura soft, calm
        (function petals() {
            if (calm) return;
            const c = document.getElementById('petals');
            if (!c) return;
            const ctx = c.getContext('2d');
            let W, H, ps = [];
            function size() {
                const r = c.parentElement.getBoundingClientRect();
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
                    for (let p of ps) {
                        p.y += p.v; p.ph += 0.008; p.x += Math.sin(p.ph) * p.sw * 0.4;
                        if (p.y > H + 14) Object.assign(p, spawn(false));
                        ctx.globalAlpha = p.o;
                        ctx.fillStyle = '#f2c4cd';
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y, p.s, p.s * 0.62, p.ph, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
                requestAnimationFrame(tick);
            })();
        })();

        // liquid glass — clean fluid physics: spring glare + tilt + ripple
        if (!calm) {
            const glass = document.querySelector('.nav-in');
            if (glass) {
                let tx = 50, gx = 50, vx = 0, press = 0, vpress = 0, tpress = 0;
                let running = false;
                const settled = () => Math.abs(tx - gx) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(tpress - press) < 0.002 && Math.abs(vpress) < 0.002;
                const loop = () => {
                    if (document.hidden) { running = false; return; }
                    if (!glass.matches(':hover')) tx = 50;
                    // water-drop spring — loose and wobbly, overshoots like fluid
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
            document.querySelectorAll('a, button, .nippon, .tiny-line, .season-min > div, .place').forEach(el => {
                el.addEventListener('pointerenter', () => document.body.classList.add('link-hot'));
                el.addEventListener('pointerleave', () => document.body.classList.remove('link-hot'));
            });
        }
