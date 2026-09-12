// NIHON 夏 — summer sky shader. Day azure + sun, night indigo + moon + stars.
// Fails silent, photo hero stays.
try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('calm');
    const canvas = document.getElementById('sky');
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
        uPtr: { value: new lib.Vector2(0.5, 0.6) },
        uNight: { value: document.documentElement.dataset.theme === 'dark' ? 1 : 0 },
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
            'uniform float uT; uniform vec2 uRes; uniform vec2 uPtr; uniform float uNight; uniform float uFade;',
            'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
            'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
            '  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }',
            'float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }',
            'void main(){',
            '  vec2 uv = vP;',
            '  float dayT = uT * 0.03;',
            '  float cl = fbm(uv * vec2(3.0, 5.0) + vec2(dayT, 0.0));',
            '  cl = smoothstep(0.45, 0.8, cl) * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.55, uv.y);',
            '  vec3 dayTop = vec3(0.35, 0.65, 0.9);',
            '  vec3 dayBot = vec3(1.0, 0.93, 0.78);',
            '  vec3 dayCol = mix(dayBot, dayTop, smoothstep(0.0, 1.0, uv.y)) + cl * 0.35;',
            '  vec2 sd = (uv - vec2(0.72, 0.68)) * vec2(uRes.x / uRes.y, 1.0);',
            '  dayCol += vec3(1.0, 0.75, 0.4) * exp(-dot(sd, sd) * 22.0) * 0.9;',
            '  dayCol += vec3(1.0, 0.9, 0.7) * exp(-dot(sd, sd) * 90.0) * 0.9;',
            '  vec3 nightTop = vec3(0.015, 0.02, 0.06);',
            '  vec3 nightBot = vec3(0.09, 0.07, 0.16);',
            '  vec3 nightCol = mix(nightBot, nightTop, smoothstep(0.0, 1.0, uv.y));',
            '  vec2 mp = (uv - vec2(0.28, 0.72)) * vec2(uRes.x / uRes.y, 1.0);',
            '  nightCol += vec3(0.95, 0.9, 0.75) * exp(-dot(mp, mp) * 160.0);',
            '  nightCol += vec3(0.6, 0.65, 0.9) * exp(-dot(mp, mp) * 18.0) * 0.35;',
            '  vec2 g = fract(uv * vec2(uRes.x / uRes.y * 60.0, 60.0)) - 0.5;',
            '  float star = step(0.985, hash(floor(uv * vec2(uRes.x / uRes.y * 60.0, 60.0))));',
            '  star *= smoothstep(0.2, 0.0, length(g)) * smoothstep(0.3, 0.8, uv.y);',
            '  star *= 0.6 + 0.4 * sin(uT * 2.0 + hash(floor(uv * 40.0)) * 40.0);',
            '  nightCol += vec3(star);',
            '  float d = length((uv - uPtr) * vec2(uRes.x / uRes.y, 1.0));',
            '  float shimmer = exp(-d * d * 7.0) * 0.12;',
            '  vec3 col = mix(dayCol, nightCol, uNight) + shimmer;',
            '  float a = mix(0.55, 0.88, uNight) * uFade;',
            '  gl_FragColor = vec4(col, a);',
            '}'
        ].join('\n')
    });
    scene.add(new lib.Mesh(new lib.PlaneGeometry(2, 2), mat));

    const size = () => {
        const r = hero.getBoundingClientRect();
        renderer.setSize(Math.round(r.width), Math.round(r.height), false);
        uni.uRes.value.set(r.width, r.height);
    };
    size();
    addEventListener('resize', size);

    let tx = 0.5, ty = 0.6, px = 0.5, py = 0.6, night = uni.uNight.value;
    addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width;
        ty = 1 - (e.clientY - r.top) / r.height;
    }, { passive: true });

    const clock = new lib.Clock();
    let dead = false;
    addEventListener('pagehide', () => { dead = true; });
    const tick = () => {
        if (dead) return;
        if (document.hidden) { requestAnimationFrame(tick); return; }
        const hr = hero.getBoundingClientRect();
        if (hr.bottom < -100 || hr.top > innerHeight + 100) { requestAnimationFrame(tick); return; }
        const wantNight = document.documentElement.dataset.theme === 'dark' ? 1 : 0;
        night += (wantNight - night) * 0.03;
        uni.uNight.value = night;
        uni.uT.value = clock.getElapsedTime();
        const y = scrollY || 0;
        uni.uFade.value = Math.max(0, 1 - y / (innerHeight * 1.1));
        px += (tx - px) * 0.04; py += (ty - py) * 0.04;
        uni.uPtr.value.set(px, py);
        renderer.render(scene, cam);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
} catch (err) {
    document.body.classList.add('no-sky');
}
