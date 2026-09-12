// NIHON film — dust motes drifting through the projector light. Silent fail.
try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('calm');
    const canvas = document.getElementById('dust');
    if (!canvas) throw new Error('no canvas');

    const THREE = await import('three').catch(() => null);
    const lib = THREE || window.THREE;
    if (!lib) throw new Error('no three');
    if (!window.WebGLRenderingContext) throw new Error('no webgl');

    const renderer = new lib.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
    const scene = new lib.Scene();
    const cam = new lib.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const aspect = () => innerWidth / innerHeight;

    const N = innerWidth < 700 ? 70 : 140;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * aspect();
        pos[i * 3 + 1] = Math.random() * 2 - 1;
        pos[i * 3 + 2] = 0;
        seed[i] = Math.random() * 100;
    }
    const g = new lib.BufferGeometry();
    g.setAttribute('position', new lib.BufferAttribute(pos, 3));
    const m = new lib.PointsMaterial({ color: 0xfff6e0, size: 0.0075, transparent: true, opacity: 0.45, depthWrite: false, blending: lib.AdditiveBlending });
    scene.add(new lib.Points(g, m));

    addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight, false));
    let px = 0, tx = 0;
    addEventListener('pointermove', e => { tx = e.clientX / innerWidth - 0.5; }, { passive: true });

    const clock = new lib.Clock();
    let dead = false;
    addEventListener('pagehide', () => { dead = true; });
    const tick = () => {
        if (dead) return;
        if (document.hidden) { requestAnimationFrame(tick); return; }
        const t = clock.getElapsedTime();
        px += (tx - px) * 0.02;
        const a = aspect(), arr = g.attributes.position.array;
        for (let i = 0; i < N; i++) {
            const s = seed[i];
            arr[i * 3] += Math.sin(t * 0.12 + s) * 0.00035 + px * 0.0006;
            arr[i * 3 + 1] += 0.00045 + Math.cos(t * 0.1 + s) * 0.0002;
            if (arr[i * 3 + 1] > 1.05) { arr[i * 3 + 1] = -1.05; arr[i * 3] = (Math.random() * 2 - 1) * a; }
            if (arr[i * 3] > a + 0.05) arr[i * 3] = -a - 0.05;
            if (arr[i * 3] < -a - 0.05) arr[i * 3] = a + 0.05;
        }
        g.attributes.position.needsUpdate = true;
        renderer.render(scene, cam);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
} catch (err) {
    document.body.classList.add('no-dust');
}
