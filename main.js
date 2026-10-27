(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);

  // Blueprint drawings: GPU card, chip, fan and board, in thin blue lines
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  const fanBlades = cx => rep(7, i => {
    const a = i * Math.PI * 2 / 7, pt = (r, d) => `${(cx + Math.cos(a + d) * r).toFixed(1)} ${(105 + Math.sin(a + d) * r).toFixed(1)}`;
    return `<path d="M${pt(12, 0)} Q${pt(34, .5)} ${pt(52, .2)}"/>`;
  });
  const FIGS = {
    card: `<svg viewBox="0 0 560 270" fill="none" stroke="currentColor" stroke-width="1">
      <text x="20" y="14">FIG. 1 · GPU CARD</text>
      <rect x="20" y="30" width="440" height="150" rx="6"/>
      <rect x="28" y="38" width="424" height="134" rx="4" stroke-dasharray="3 4"/>
      ${[150, 330].map(cx => `<circle cx="${cx}" cy="105" r="56"/><circle cx="${cx}" cy="105" r="44" stroke-dasharray="2 4"/><circle cx="${cx}" cy="105" r="12"/>${fanBlades(cx)}`).join('')}
      <rect x="460" y="18" width="16" height="190"/><rect x="464" y="60" width="8" height="30"/><rect x="464" y="110" width="8" height="30"/>
      ${rep(26, i => `<rect x="${130 + i * 9}" y="182" width="5" height="14"/>`)}
      <path d="M20 232H460M20 226V238M460 226V238"/><text x="236" y="254">A</text>
      <path d="M6 30V180M0 30H12M0 180H12"/><text x="-14" y="109">B</text>
    </svg>`,
    chip: `<svg viewBox="0 0 300 300" fill="none" stroke="currentColor" stroke-width="1">
      <text x="60" y="30">FIG. 2 · CHIP</text>
      <rect x="70" y="70" width="160" height="160" rx="8"/>
      <rect x="110" y="110" width="80" height="80" rx="3"/>
      <path d="M110 110L190 190M190 110L110 190" stroke-dasharray="2 4"/>
      <circle cx="86" cy="86" r="4"/>
      ${rep(10, i => { const p = (84 + i * 14.6).toFixed(1); return `<path d="M${p} 70V52M${p} 230V248M70 ${p}H52M230 ${p}H248"/>`; })}
      <path d="M70 272H230M70 266V278M230 266V278"/><text x="146" y="294">C</text>
    </svg>`,
    fan: `<svg viewBox="0 0 260 270" fill="none" stroke="currentColor" stroke-width="1">
      <path d="M130 4V256M4 130H256" stroke-dasharray="6 6"/>
      <circle cx="130" cy="130" r="104"/><circle cx="130" cy="130" r="92" stroke-dasharray="2 4"/><circle cx="130" cy="130" r="22"/>
      ${rep(7, i => `<path d="M130 108C146 86 160 64 164 42" transform="rotate(${(i * 51.43).toFixed(1)} 130 130)"/>`)}
      <text x="24" y="268">FIG. 3 · FAN</text>
    </svg>`,
    board: `<svg viewBox="0 0 380 170" fill="none" stroke="currentColor" stroke-width="1">
      <text x="10" y="12">FIG. 4 · BOARD</text>
      <rect x="10" y="24" width="360" height="110" rx="4"/>
      <rect x="160" y="44" width="60" height="60" rx="3"/><rect x="176" y="60" width="28" height="28"/>
      <path d="M160 60H110L90 40H40M160 88H120L100 108H40M220 60H270L290 40H340M220 88H280L300 108H340M190 104V124"/>
      <circle cx="40" cy="40" r="3"/><circle cx="40" cy="108" r="3"/><circle cx="340" cy="40" r="3"/><circle cx="340" cy="108" r="3"/>
      ${rep(30, i => `<rect x="${60 + i * 9}" y="134" width="5" height="16"/>`)}
    </svg>`
  };
  document.querySelectorAll('[data-fig]').forEach(el => { el.innerHTML = FIGS[el.dataset.fig]; });

  // Footer name: scale it so it always fits the width exactly
  const wm = document.querySelector('.wordmark');
  const wmText = wm.querySelector('span');
  const fitWordmark = () => {
    wm.style.fontSize = '100px';
    wm.style.fontSize = Math.floor(100 * wm.clientWidth / wmText.offsetWidth * 0.98) + 'px';
  };
  fitWordmark();
  addEventListener('resize', fitWordmark);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);

  // GPU faces
  const blade = 'M50 50 C52 35 59 22 68 15 C65 29 60 40 50 50Z';
  const fan = `<div class="fan"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#18283F" stroke="#DCEAF5" stroke-opacity=".5" stroke-width="1.5"/><g class="blades" fill="#DCEAF5">${[0,1,2,3,4,5,6].map(i => `<path d="${blade}" transform="rotate(${(i * 51.43).toFixed(2)} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="11" fill="#FAF8F2"/><circle cx="50" cy="50" r="3" fill="#4267AB"/></svg></div>`;
  const gpuHTML = `
    <div class="f front">${fan}${fan}</div>
    <div class="f back"><span>OpenCompute Lab</span></div>
    <div class="f top"><b></b></div>
    <div class="f bottom"><div class="pins">${'<span></span>'.repeat(22)}</div></div>
    <div class="f left">${'<span></span>'.repeat(9)}</div>
    <div class="f right"><span></span><span></span><span></span></div>`;

  // A handful of cards for the banner
  const crowd = document.getElementById('crowd');
  [[6, 14, -18, 30, 8], [34, 62, 30, -30, -6], [62, 8, -8, 150, 12], [84, 54, 20, 200, -10], [18, 78, 40, -50, 4], [92, 6, -30, 240, 14]]
    .forEach(([x, y, rx, ry, rz], i) => {
      const m = document.createElement('div');
      m.className = 'mini';
      m.style.left = x + '%'; m.style.top = y + '%';
      m.dataset.base = [rx, ry, rz, i % 2 ? 0.55 : 0.7].join(',');
      m.innerHTML = '<div class="gpu" data-gpu></div>';
      crowd.appendChild(m);
    });
  document.querySelectorAll('[data-gpu]').forEach(g => { g.innerHTML = gpuHTML; });

  // Digits picture
  const digits = document.querySelector('.pic.digits');
  if (digits) digits.innerHTML = '72104149590690159734966540740131347271211742351244635560'.split('').map(d => `<span>${d}</span>`).join('');

  // Echo headlines: one faint copy
  const echoes = [...document.querySelectorAll('[data-echo]')];
  echoes.forEach(el => {
    const text = el.innerHTML;
    el.innerHTML = `<span class="echo-ghost" aria-hidden="true">${text}</span><span class="echo-main">${text}</span>`;
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .3 });
    echoes.forEach(el => io.observe(el));
  } else echoes.forEach(el => el.classList.add('in'));
  requestAnimationFrame(() => document.querySelector('#heroTitle .echo').classList.add('in'));

  // Hero keyframes: p, y(vh), scale, rx, ry, rz (smaller turns than before)
  // In the last phase the card passes lower so "A new perspective on training." stays readable
  const K = [
    [0.00, 30, 1.00, -10, -20, 3],
    [0.16, 4, 1.00, 6, -30, -5],
    [0.34, 0, 1.04, 52, -14, -14],
    [0.58, 0, 1.06, 6, 152, 8],
    [0.82, 21, 1.00, -56, 186, -6],
    [1.00, 6, 0.94, -6, 342, 0]
  ];
  // Phones: the card starts higher so the intro box doesn't cover it
  const KDESK = K;
  const KP = K.map((row, i) => i === 0 ? [0.00, 9, ...row.slice(2)] : i === 4 ? [0.82, 23, ...row.slice(2)] : row);
  const at = p => {
    const K = innerWidth < 600 ? KP : KDESK;
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1];
    const t = smooth(clamp((p - a[0]) / (b[0] - a[0])));
    return a.map((v, j) => v + (b[j] - v) * t);
  };

  const track = document.getElementById('hero');
  const heroGpu = document.getElementById('heroGpu');
  const heroTitle = document.getElementById('heroTitle');
  const heroCopy = document.getElementById('heroCopy');
  const stageBg = document.getElementById('stageBg');
  const sweeps = [...document.querySelectorAll('.sweep')];
  const dots = [...document.querySelectorAll('#dots i')];
  const speedEls = [...document.querySelectorAll('[data-speed]')];
  const spinEls = [...document.querySelectorAll('[data-spin]')];
  const curtains = [...document.querySelectorAll('.curtain')];
  const crowdEls = [...crowd.querySelectorAll('.mini')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const navTargets = navLinks.map(a => document.getElementById(a.dataset.nav));
  const figs = [...document.querySelectorAll('#backdrop .fig')];
  const bpGrid = document.getElementById('bpGrid');

  let cur = at(0).slice(1);
  let lastY = scrollY, vel = 0;
  const baseScale = () => innerWidth < 520 ? 0.6 : innerWidth < 900 ? 0.8 : innerWidth < 1400 ? 1.05 : 1.2;

  function frame() {
    const vh = innerHeight;

    // Scroll speed -> echo gap, never beyond 4px, settles quickly
    const dy = scrollY - lastY; lastY = scrollY;
    vel += (dy - vel) * 0.25;
    if (Math.abs(vel) < 0.05) vel = 0;
    root.style.setProperty('--lag', reduce ? '0px' : clamp(vel * 0.15, -4, 4).toFixed(2) + 'px');

    // Hero
    const r = track.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - vh));
    const tgt = reduce ? [10, 1, 6, -22, 0] : at(p).slice(1);
    cur = cur.map((v, i) => reduce ? tgt[i] : v + (tgt[i] - v) * 0.08);
    const [y, s, rx, ry, rz] = cur;
    heroGpu.style.transform = `translate(-50%,-50%) translateY(${y.toFixed(2)}vh) scale(${(s * baseScale()).toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;

    if (!reduce) {
      const out = smooth(clamp(p / 0.18));
      heroTitle.style.transform = `translateY(${-out * 70}vh)`;
      heroCopy.style.transform = `translateY(${out * 24}px)`;
      heroCopy.style.opacity = 1 - out;
      stageBg.style.transform = `translateY(${-p * 25}vh)`;
      sweeps.forEach(el => {
        const d = (parseFloat(el.dataset.c) - p) / 0.2;
        el.style.visibility = Math.abs(d) < 1.25 ? 'visible' : 'hidden';
        el.style.transform = `translateY(calc(-50% + ${(d * 60).toFixed(2)}vh))`;
      });

      // Blueprint drifts slowly with the scroll; the drawings stay on screen
      const sy = scrollY;
      bpGrid.style.transform = `translate3d(0, ${(-(sy * 0.06) % 120).toFixed(1)}px, 0)`;
      figs.forEach((el, i) => {
        const ph = i * 1.9;
        const x = Math.cos(sy / 1500 + ph) * 40;
        const yy = Math.sin(sy / 1200 + ph) * 70;
        const rot = Math.sin(sy / 2000 + ph) * 4;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      });

      // Curtains rise a short distance as they enter
      curtains.forEach(el => {
        const prev = parseFloat(el.dataset.y || 0);
        const top = el.getBoundingClientRect().top - prev;
        const t = smooth(clamp((vh - top) / (vh * 0.55)));
        const yy = (1 - t) * 36;
        el.dataset.y = yy;
        el.style.transform = `translateY(${yy.toFixed(1)}px)`;
      });

      // Picture panels: subtle parallax, capped at 20px each way
      speedEls.forEach(el => {
        const sr = el.closest('section').getBoundingClientRect();
        const off = clamp((sr.top + sr.height / 2 - vh / 2) * parseFloat(el.dataset.speed), -20, 20);
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      });

      spinEls.forEach(el => {
        const sr = el.parentElement.getBoundingClientRect();
        const q = clamp((vh - sr.top) / (vh + sr.height));
        const sc = innerWidth < 520 ? 0.7 : innerWidth < 900 ? 0.85 : 1;
        el.style.transform = `scale(${sc}) rotateX(${(-12 + q * 20).toFixed(2)}deg) rotateY(${(-34 + q * 64).toFixed(2)}deg) rotateZ(${(-6 + q * 8).toFixed(2)}deg)`;
      });

      const br = crowd.getBoundingClientRect();
      const bq = clamp((vh - br.top) / (vh + br.height));
      crowdEls.forEach((el, i) => {
        const [bx, by, bz, sc] = el.dataset.base.split(',').map(Number);
        el.style.transform = `translateY(${((bq - .5) * (i % 3 + 1) * -24).toFixed(1)}px) scale(${sc * (innerWidth < 600 ? .6 : 1)}) rotateX(${bx}deg) rotateY(${(by + bq * 30).toFixed(1)}deg) rotateZ(${bz}deg)`;
      });
    }

    const phase = p < 0.2 ? 0 : p < 0.46 ? 1 : p < 0.7 ? 2 : 3;
    dots.forEach((d, i) => d.classList.toggle('on', i === phase));

    // Active nav item
    let active = -1;
    navTargets.forEach((t, i) => { const tr = t.getBoundingClientRect(); if (tr.top < vh * 0.45 && tr.bottom > vh * 0.45) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === active));

    requestAnimationFrame(frame);
  }

  if (reduce) {
    sweeps.forEach(el => { el.style.display = 'none'; });
    spinEls.forEach(el => { el.style.transform = 'rotateX(-10deg) rotateY(-26deg)'; });
    crowdEls.forEach(el => { const [bx, by, bz, sc] = el.dataset.base.split(',').map(Number); el.style.transform = `scale(${sc}) rotateX(${bx}deg) rotateY(${by}deg) rotateZ(${bz}deg)`; });
  }
  requestAnimationFrame(frame);
})();
