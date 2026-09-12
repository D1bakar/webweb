// NIHON: INK — living ink-water hero. Fails silent, photo hero stays.
try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('calm');
    const canvas = document.getElementById('ink');
    if (!canvas) throw new Error('no canvas');
    const hero = canvas.parentElement;

    const THREE = await import('three').catch(() => null);
    const lib = THREE || window.THREE;
    if (!lib) throw new Error('no three');
    if (!window.WebGLRenderingContext) throw new Error('no webgl');

    const renderer = new lib.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    const scene = new lib.Scene();
    const cam = new lib.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uni = {
        uT: { value: 0 },
        uRes: { value: new lib.Vector2(1, 1) },
        uPtr: { value: new lib.Vector2(0.5, 0.5) },
        uFade: { value: 1 }
    };
    const mat = new lib.ShaderMaterial({
        uniforms: uni,
        transparent: true,
        depthWrite: false,
        vertexShader: 'varying vec2 vP; void main(){ vP = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: [
            'precision highp float;',
            'varying vec2 vP;',
            'uniform float uT; uniform vec2 uRes; uniform vec2 uPtr; uniform float uFade;',
            'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
            'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
            '  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }',
            'float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }',
            'void main(){',
            '  vec2 uv = vP; vec2 ar = vec2(uRes.x / uRes.y, 1.0);',
            '  vec2 p = (uv - 0.5) * ar;',
            '  float t = uT * 0.05;',
            '  vec2 warp = vec2(fbm(p * 2.2 + t), fbm(p * 2.2 - t * 1.3));',
            '  float ink = fbm(p * 3.0 + warp * 1.6 - t * 0.7);',
            '  ink = smoothstep(0.32, 0.78, ink);',
            '  float d = length((uv - uPtr) * ar);',
            '  float glow = exp(-d * d * 9.0);',
            '  vec3 sakura = vec3(0.95, 0.55, 0.68);',
            '  vec3 aqua = vec3(0.55, 0.75, 1.0);',
            '  vec3 col = ink * mix(vec3(0.02, 0.02, 0.04), sakura * 0.5 + aqua * 0.25, glow);',
            '  col += glow * sakura * 0.16 * ink;',
            '  float vig = smoothstep(1.15, 0.25, length((uv - 0.5) * ar));',
            '  float a = ink * vig * 0.82 * uFade;',
            '  gl_FragColor = vec4(col, a);',
            '}'
        ].join('\n')
    });
    scene.add(new lib.Mesh(new lib.PlaneGeometry(2, 2), mat));

    // drifting spores
    const N = innerWidth < 700 ? 90 : 180;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * 2 - 1; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = 0; seed[i] = Math.random() * 100; }
    const pg = new lib.BufferGeometry();
    pg.setAttribute('position', new lib.BufferAttribute(pos, 3));
    const pm = new lib.PointsMaterial({ color: 0xf2a9c4, size: 0.008, transparent: true, opacity: 0.7, depthWrite: false, blending: lib.AdditiveBlending });
    const spores = new lib.Points(pg, pm);
    scene.add(spores);

    const size = () => {
        const r = hero.getBoundingClientRect();
        renderer.setSize(Math.round(r.width), Math.round(r.height), false);
        uni.uRes.value.set(r.width, r.height);
    };
    size();
    addEventListener('resize', size);

    let tx = 0.5, ty = 0.5, px = 0.5, py = 0.5;
    addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width;
        ty = 1 - (e.clientY - r.top) / r.height;
    }, { passive: true });

    const clock = new lib.Clock();
    let dead = false;
    const kill = () => { dead = true; };
    const tick = () => {
        if (dead) return;
        if (document.hidden) { requestAnimationFrame(tick); return; }
        const hr = hero.getBoundingClientRect();
        if (hr.bottom < -100 || hr.top > innerHeight + 100) { requestAnimationFrame(tick); return; }
        const y = scrollY || 0;
        uni.uT.value = clock.getElapsedTime();
        uni.uFade.value = Math.max(0, 1 - y / (innerHeight * 1.1));
        px += (tx - px) * 0.04; py += (ty - py) * 0.04;
        uni.uPtr.value.set(px, py);
        const arr = pg.attributes.position.array, tm = uni.uT.value;
        for (let i = 0; i < N; i++) {
            const s = seed[i];
            arr[i * 3] += Math.sin(tm * 0.3 + s) * 0.0006 + (px - 0.5) * 0.0008;
            arr[i * 3 + 1] += 0.0009 + Math.cos(tm * 0.22 + s) * 0.0004;
            if (arr[i * 3 + 1] > 1.05) { arr[i * 3 + 1] = -1.05; arr[i * 3] = Math.random() * 2 - 1; }
            if (arr[i * 3] > 1.05) arr[i * 3] = -1.05;
            if (arr[i * 3] < -1.05) arr[i * 3] = 1.05;
        }
        pg.attributes.position.needsUpdate = true;
        pm.opacity = 0.7 * uni.uFade.value;
        renderer.render(scene, cam);
        requestAnimationFrame(tick);
    };
    addEventListener('pagehide', kill);
    requestAnimationFrame(tick);
} catch (err) {
    document.body.classList.add('no-ink');
}
