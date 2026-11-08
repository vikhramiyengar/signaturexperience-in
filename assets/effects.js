/* Signature Xperience — full-screen effect simulator.
 *
 * Self-contained: injects its own styles, canvas, trigger button and picker.
 * Exposes window.SXEffects = { play(id), list(), open(), close() }.
 *
 * Each effect simulates one of the company's real services rather than a
 * generic celebration animation — the picker doubles as the catalogue.
 */
(function () {
  'use strict';
  console.info('SXEffects build v2.4');

  /* Effects always play — full motion is the point of this business. */

  /* id, label, the cue it maps to, and the accent used on its picker chip */
  const EFFECTS = [
    { id: 'fireworks', label: 'Synchronised Fireworks', cue: 'Finale',      accent: '#ff9f1c', ms: 4600 },
    { id: 'gerbs',     label: 'Gerbs & Fountains',      cue: 'Aisle',       accent: '#ffd27a' },
    { id: 'flame',     label: 'Flame FX',               cue: 'Stage',       accent: '#ff6b2c' },
    { id: 'confetti',  label: 'Confetti Blast',         cue: 'Peak moment', accent: '#e23e57' },
    { id: 'petals',    label: 'Flower Shower',          cue: 'Varmala',     accent: '#ff7aa2' },
    { id: 'co2',       label: 'CO₂ Jets',               cue: 'Dance floor', accent: '#cfe8ff' },
    { id: 'fog',       label: 'Dancing on Clouds',      cue: 'First dance', accent: '#b9c6d6' },
    { id: 'balloons',  label: 'Helium Balloons',        cue: 'Reveal',      accent: '#8bd3ff' },
    { id: 'colour',    label: 'Colour Dayout',          cue: 'Haldi',       accent: '#ffd93d' },
    { id: 'bubbles',   label: 'Smoke Bubbles',          cue: 'Daytime',     accent: '#c8b6ff' }
    /* The burn-rig effect (detonations → fire → ashfall) is built and still in
       this file, but it is not listed here, so no chip renders and play() will
       refuse the id. To bring it back, add a line like the one below with a
       label you're happy for clients to read:
       { id: 'inferno', label: 'Inferno & Ashfall', cue: 'Burn rig', accent: '#ff4d1a', ms: 4600 } */
  ];

  const PLAY_MS  = 4200;   // emit window — effects run 4-5s total
  const CLEAR_MS = 7000;   // hard stop, so nothing can run forever

  /* ---------------------------------------------------------------- styles */
  const css = `
  /* opacity is the guard rail: whatever an effect does internally, the page
     underneath stays legible. Raise only if content still reads. */
  #sx-fx{position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;pointer-events:none;display:block;opacity:.94;
    /* width/height MUST be explicit: a canvas is a replaced element, so
       inset:0 alone does not stretch it on WebKit — it stays at its buffer
       size (2x the viewport on retina) and the whole scene lands below the
       screen. This bug hid every bottom-anchored effect on iPhones. */
    /* lift saturation so colour reads as vivid against dark video, not washed */
    filter:saturate(1.22) contrast(1.06)}
  #sx-open{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:190;
    display:inline-flex;align-items:center;gap:9px;padding:13px 24px;border:0;cursor:pointer;
    border-radius:100px;font:inherit;font-size:12px;letter-spacing:.16em;text-transform:uppercase;
    font-weight:600;color:#1a0d00;background:linear-gradient(100deg,#ff6b2c,#ff9f1c);
    box-shadow:0 10px 34px rgba(255,107,44,.42);transition:transform .25s,box-shadow .25s}
  #sx-open:hover{transform:translateX(-50%) translateY(-2px);box-shadow:0 16px 44px rgba(255,107,44,.55)}
  #sx-open:focus-visible{outline:2px solid #fff;outline-offset:3px}
  #sx-open .dot{width:7px;height:7px;border-radius:50%;background:#1a0d00;opacity:.55}

  #sx-picker{position:fixed;inset:0;z-index:210;display:none;align-items:center;justify-content:center;
    padding:24px;background:rgba(8,7,10,.82);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
  #sx-picker.on{display:flex}
  .sx-panel{width:min(760px,100%);max-height:86vh;overflow:auto}
  .sx-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:18px}
  .sx-head h3{margin:0;font-family:'Sora','Helvetica Neue',sans-serif;font-weight:700;
    font-size:clamp(20px,3.4vw,28px);letter-spacing:-.03em;color:#f7f2e9}
  .sx-head p{margin:6px 0 0;font-size:13px;color:rgba(247,242,233,.56)}
  .sx-sound{background:transparent;border:1px solid rgba(247,242,233,.2);color:#f7f2e9;cursor:pointer;
    height:36px;padding:0 14px;border-radius:100px;font:inherit;font-size:11px;letter-spacing:.1em;
    text-transform:uppercase;flex:0 0 auto;margin-right:8px}
  .sx-sound:hover{background:rgba(247,242,233,.1)}
  .sx-sound[aria-pressed="false"]{opacity:.5}
  .sx-close{background:transparent;border:1px solid rgba(247,242,233,.2);color:#f7f2e9;cursor:pointer;
    width:36px;height:36px;border-radius:50%;font-size:16px;line-height:1;flex:0 0 auto}
  .sx-close:hover{background:rgba(247,242,233,.1)}
  .sx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}
  .sx-chip{position:relative;text-align:left;padding:15px 14px 14px;border-radius:10px;cursor:pointer;
    background:rgba(255,255,255,.045);border:1px solid rgba(247,242,233,.14);color:#f7f2e9;
    font:inherit;transition:transform .2s,border-color .2s,background .2s}
  .sx-chip:hover{transform:translateY(-3px);background:rgba(255,255,255,.08)}
  .sx-chip:focus-visible{outline:2px solid #ff9f1c;outline-offset:2px}
  .sx-chip .sw{width:26px;height:4px;border-radius:3px;display:block;margin-bottom:11px}
  .sx-chip b{display:block;font-family:'Sora','Helvetica Neue',sans-serif;font-weight:600;
    font-size:14px;letter-spacing:-.02em;line-height:1.25}
  .sx-chip span{display:block;margin-top:5px;font-size:10px;letter-spacing:.14em;
    text-transform:uppercase;color:rgba(247,242,233,.42)}
  @media(max-width:560px){
    #sx-open{bottom:16px;padding:12px 20px;font-size:11px}
    .sx-grid{grid-template-columns:1fr 1fr;gap:8px}
  }
`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- canvas */
  const cvs = document.createElement('canvas');
  cvs.id = 'sx-fx';
  cvs.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  /* Bloom: the scene is downscaled into this buffer, blurred, and added back
     over the top. It's what separates "particles on a canvas" from something
     that looks lit. Quarter-res keeps it cheap even at full particle load. */
  const bloom = document.createElement('canvas');
  const bctx = bloom.getContext('2d');

  let W = 0, H = 0, vs = 1;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cvs.width = W * d; cvs.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    bloom.width = Math.max(1, (W / 4) | 0);
    bloom.height = Math.max(1, (H / 4) | 0);
    /* Smoke, fire and fog are volumes filling a scene — their size has to track
       the frame. Fixed pixel radii looked right in a small window and shrank to
       nothing on a full screen. Discrete objects (petals, confetti, balloons)
       stay in real pixels: a petal is a petal at any resolution. */
    vs = H / 320;
  }
  addEventListener('resize', size); size();

  /* ----------------------------------------------------------------- audio
     Synthesised, not sampled: no files to licence or download, nothing for the
     CSP to block, and each cue can be shaped to the visual it accompanies.
     Everything is gated behind a user click (playing an effect), so no browser
     autoplay policy is being fought. */
  const SFX = (function () {
    let ctx = null, master = null, bed = null, bedGain = null, enabled = true;

    function ac() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = .5;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    /* a couple of seconds of white noise, reused as the source for everything
       percussive or hissy */
    let nb = null;
    function noiseBuf() {
      if (nb) return nb;
      const c = ac(); if (!c) return null;
      nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return nb;
    }

    /* one-shot filtered noise — the basis of bangs, hisses and pops */
    function hit(o) {
      if (!enabled) return;
      const c = ac(); if (!c) return;
      const src = c.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
      const f = c.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.value = o.freq || 1000;
      f.Q.value = o.q == null ? 1 : o.q;
      const g = c.createGain();
      const t = c.currentTime, dur = o.dur || .3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.gain == null ? .3 : o.gain, t + (o.attack || .006));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      if (pan) { pan.pan.value = o.pan || 0; src.connect(f); f.connect(g); g.connect(pan); pan.connect(master); }
      else { src.connect(f); f.connect(g); g.connect(master); }
      src.start(t); src.stop(t + dur + .05);
    }

    /* low sine thump — the body of a shell break or a detonation */
    function thump(o) {
      if (!enabled) return;
      const c = ac(); if (!c) return;
      const osc = c.createOscillator(), g = c.createGain();
      const t = c.currentTime, dur = o.dur || .5;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(o.freq || 90, t);
      osc.frequency.exponentialRampToValueAtTime(o.to || 34, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.gain == null ? .5 : o.gain, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + .05);
    }

    /* rising whistle as a shell climbs */
    function whistle(pan) {
      if (!enabled) return;
      const c = ac(); if (!c) return;
      const osc = c.createOscillator(), g = c.createGain();
      const t = c.currentTime, dur = .85;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(1500, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.06, t + .1);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + .05);
    }

    /* continuous layer for effects that are a sustained sound rather than events */
    const BEDS = {
      gerbs:   { type: 'bandpass', freq: 3400, q: .8,  gain: .16 },
      flame:   { type: 'lowpass',  freq: 620,  q: 2.4, gain: .26 },
      inferno: { type: 'lowpass',  freq: 480,  q: 2.0, gain: .30 },
      co2:     { type: 'highpass', freq: 3800, q: .7,  gain: .24 },
      fog:     { type: 'lowpass',  freq: 260,  q: .7,  gain: .07 },
      petals:  { type: 'highpass', freq: 5200, q: .5,  gain: .045 },
      colour:  { type: 'bandpass', freq: 1400, q: .6,  gain: .08 },
      bubbles: { type: 'highpass', freq: 4200, q: .5,  gain: .04 },
      balloons:{ type: 'lowpass',  freq: 900,  q: .6,  gain: .035 }
    };

    function startBed(id, ms) {
      stopBed();
      const spec = BEDS[id]; if (!spec || !enabled) return;
      const c = ac(); if (!c) return;
      const src = c.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
      const f = c.createBiquadFilter();
      f.type = spec.type; f.frequency.value = spec.freq; f.Q.value = spec.q;
      const g = c.createGain();
      const t = c.currentTime, dur = ms / 1000;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(spec.gain, t + .18);
      g.gain.setValueAtTime(spec.gain, t + dur - .6);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      /* slow wobble so a sustained bed doesn't sit dead flat */
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = id === 'flame' || id === 'inferno' ? 7.5 : 2.2;
      lg.gain.value = spec.gain * .45;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); lfo.start(t);
      src.stop(t + dur + .1); lfo.stop(t + dur + .1);
      bed = src; bedGain = g;
    }
    function stopBed() {
      if (!bed) return;
      try { bed.stop(); } catch (e) {}
      bed = null; bedGain = null;
    }

    return {
      begin(id, ms) {
        if (!enabled) return;
        ac();
        startBed(id, ms);
        if (id === 'confetti') { hit({ type: 'lowpass', freq: 2600, dur: .5, gain: .42, sweep: 500 }); thump({ freq: 130, to: 50, dur: .3, gain: .3 }); }
        if (id === 'balloons') hit({ type: 'bandpass', freq: 900, dur: .35, gain: .15 });
        if (id === 'colour')   hit({ type: 'lowpass', freq: 1800, dur: .6, gain: .3, sweep: 400 });
        if (id === 'co2')      hit({ type: 'highpass', freq: 5000, dur: .45, gain: .34 });
        if (id === 'fog')      hit({ type: 'lowpass', freq: 400, dur: .9, gain: .12 });
      },
      end: stopBed,
      shell(pan) { whistle(pan); },
      burst(big, pan) {
        thump({ freq: big ? 110 : 78, to: big ? 30 : 38, dur: big ? .75 : .5, gain: big ? .6 : .42 });
        hit({ type: 'bandpass', freq: big ? 1500 : 2100, q: .7, dur: big ? .55 : .38,
              gain: big ? .38 : .28, sweep: 320, pan: pan || 0 });
        /* crackle tail */
        setTimeout(() => hit({ type: 'highpass', freq: 5200, dur: .5, gain: .13 }), 90);
      },
      blast(pan) {
        thump({ freq: 140, to: 26, dur: 1.0, gain: .72 });
        hit({ type: 'lowpass', freq: 900, q: .6, dur: .8, gain: .5, sweep: 180, pan: pan || 0 });
      },
      pop() { hit({ type: 'bandpass', freq: rnd(1400, 3200), q: 4, dur: .09, gain: .12 }); },
      toggle() { enabled = !enabled; if (!enabled) stopBed(); return enabled; },
      get enabled() { return enabled; }
    };
  })();

  /* ------------------------------------------------------------- particles */
  let parts = [], shells = [], flashes = [], glows = [], shocks = [];
  let running = false, stopAt = 0, emitUntil = 0, startedAt = 0, current = null, raf = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];

  const PAL = {
    fireworks: ['#ff9f1c', '#ffd27a', '#e23e57', '#8bd3ff', '#fff2c2', '#ffffff'],
    /* fully saturated primaries — muted mid-tones disappear against video */
    confetti:  ['#ff1e3c', '#ff8a00', '#ffd400', '#3dff6e', '#00e5ff', '#2b7bff',
                '#b64cff', '#ff2ea6', '#00ffa3', '#ff5e00', '#ff0080',
                '#7cff00', '#00c8ff', '#ffe600', '#ff3d9a'],
    petals:    ['#ff0a54', '#ff2e88', '#ff5c9e', '#e00040', '#ff8fb8', '#fff0f5',
                '#ff7a1c', '#c9004f', '#ffb3d1'],
    colour:    ['#ffd400', '#ff5e00', '#ff0a54', '#3dff6e', '#00c8ff', '#ff2ea6',
                '#b64cff', '#00ffa3'],
    balloons:  ['#00b4ff', '#ff2e6a', '#ffd400', '#25e07a', '#ff6b00',
                '#a24cff', '#00e0c8', '#ff008c', '#7cff2e', '#ff3d3d']
  };

  /* ---------------------------------------------------------- sprite cache
     createRadialGradient() per particle per frame was the single biggest cost
     in the whole simulation — thousands of gradient objects allocated and
     thrown away every frame. Each distinct look is now rasterised once into a
     small offscreen canvas and blitted, which is a plain memcpy by comparison. */
  const SPRITES = new Map();
  function softSprite(stops, q) {
    const key = stops + '|' + q;
    let c = SPRITES.get(key);
    if (c) return c;
    const R = 64;
    c = document.createElement('canvas');
    c.width = c.height = R * 2;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(R * .82, R * .82, R * .04, R, R, R);
    JSON.parse(stops).forEach(([off, col]) => grad.addColorStop(off, col));
    g.fillStyle = grad;
    /* fill a circle, not the rect: gradients whose last stop isn't transparent
       (bubble film, smoke) otherwise paint their corners and blit as squares */
    g.beginPath(); g.arc(R, R, R, 0, 6.284); g.fill();
    SPRITES.set(key, c);
    return c;
  }
  /* blit a cached sprite centred at x,y with radius r */
  function blit(sp, x, y, r, alpha, rot, stretch) {
    if (r <= 0 || alpha <= .004) return;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    if (rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      if (stretch && stretch !== 1) ctx.scale(stretch, 1);
      ctx.drawImage(sp, -r, -r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
    }
  }

  /* ---- emitters. each pushes particles; `kind` drives update + draw ----
     Most carry a depth `z` in 0..1: near particles are larger, faster and
     brighter than far ones. That parallax is what sells these as volumes of
     stuff in space rather than sprites on a flat plane. */

  /* shell break types — dropped this in an earlier refactor and it broke every
     firework launch; keep it next to launchShell so that can't recur */
  const BREAKS = ['peony', 'peony', 'ring', 'willow', 'palm', 'crossette'];

  /* Emitters run every frame (~60fps). Anything with a multi-second lifetime
     must be gated by a real per-second rate or it accumulates into a wall:
     10 balloons/frame is 600/sec, which filled the screen solid. */
  let rateAcc = {};
  function atRate(key, perSec, fn) {
    rateAcc[key] = (rateAcc[key] || 0) + perSec / 60;
    while (rateAcc[key] >= 1) { rateAcc[key] -= 1; fn(); }
  }

  const depth = () => Math.pow(Math.random(), .7);        // biased toward far
  const zScale = z => .45 + z * 1.25;

  function launchShell(opts) {
    opts = opts || {};
    const x = opts.x != null ? opts.x : rnd(W * .08, W * .92);
    const y = opts.y != null ? opts.y : rnd(H * .08, H * .44);
    SFX.shell((x / W) * 2 - 1);
    shells.push({ x, y: H + 6, vx: rnd(-.4, .4), vy: -Math.sqrt(2 * .09 * Math.max(60, H - y)),
                  px: x, py: H + 6, color: pick(PAL.fireworks),
                  type: opts.type || pick(BREAKS), big: !!opts.big });
  }

  const MAX_PARTS = 7000;                 // audience is on good hardware — be generous
  function burst(s) {
    if (parts.length > MAX_PARTS) return;
    SFX.burst(!!s.big, (s.x / W) * 2 - 1);          // pan follows the break
    const type = s.type || 'peony';
    const big  = !!s.big;
    const c2   = pick(PAL.fireworks);

    let n, spd, life, grav, drag, wide;
    if (type === 'willow')        { n = 150; spd = rnd(3.2, 5); life = rnd(190, 300); grav = .085; drag = .996; wide = 1.5; }
    else if (type === 'palm')     { n = 70;  spd = rnd(5, 8);   life = rnd(150, 240); grav = .075; drag = .994; wide = 3;   }
    else if (type === 'ring')     { n = 190; spd = rnd(5.5, 8); life = rnd(80, 130);  grav = .036; drag = .982; wide = 1.3; }
    else if (type === 'crossette'){ n = 90;  spd = rnd(4.5, 7); life = rnd(70, 110);  grav = .04;  drag = .984; wide = 1.6; }
    else                          { n = 230; spd = rnd(4.5, 8.5); life = rnd(80, 150); grav = .038; drag = .983; wide = 1.4; }
    if (big) { n = (n * 1.5) | 0; spd *= 1.25; }

    glows.push({ x: s.x, y: s.y, life: 20, max: 20,
                 power: (big ? .16 : .10) * (spd / 7), color: s.color });
    flashes.push({ x: s.x, y: s.y, r: spd * (big ? 26 : 19), life: 16, max: 16, color: s.color });

    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const v = (type === 'ring') ? spd * rnd(.9, 1)
              : (type === 'palm') ? spd * rnd(.7, 1)
              : spd * Math.pow(Math.random(), .4);
      const L = life * rnd(.75, 1.25);
      parts.push({ kind: 'spark', x: s.x, y: s.y, px: s.x, py: s.y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: L, max: L,
        color: type === 'willow' ? (Math.random() < .8 ? '#ffd27a' : '#fff0c4')
             : (Math.random() < .72 ? s.color : c2),
        w: (Math.random() < .16 ? 2.3 : 1.25) * wide,
        tw: Math.random() < .26, g: grav, drag: drag, cool: true,
        split: type === 'crossette' && Math.random() < .4 ? (18 + Math.random() * 14) | 0 : 0 });
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.283, v = spd * rnd(.15, .55), life2 = rnd(14, 30);
      parts.push({ kind: 'spark', x: s.x, y: s.y, px: s.x, py: s.y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life2, max: life2,
        color: '#fff8e2', w: 1, tw: true, g: .02, drag: .96, cool: false,
        delay: (Math.random() * 26) | 0 });
    }
    for (let i = 0; i < 5; i++) {
      parts.push({ kind: 'vapour', x: s.x + rnd(-24, 24), y: s.y + rnd(-18, 18),
        vx: rnd(-.35, .35), vy: rnd(-.5, -.1), life: rnd(90, 150), max: 150,
        size: rnd(14, 32) * vs, grow: rnd(.5, 1.3) * vs, drag: .985, tint: '120,110,105', z: .5 });
    }
  }

  /* ---------- GERBS: dense spark fountains, base flare, falling embers ------- */
  function gerb() {
    if (parts.length > MAX_PARTS) return;
    const cols = 7;
    for (let c = 0; c < cols; c++) {
      const x = W * (c + .5) / cols, z = depth(), sc = zScale(z);
      /* white-hot core of the fountain */
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + rnd(-.22, .22), v = rnd(11, 23) * sc;
        const L = rnd(52, 104);
        parts.push({ kind: 'spark', x: x + rnd(-6, 6), y: H - 2, px: x, py: H - 2,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: L, max: L, z,
          color: Math.random() < .5 ? '#fffdf2' : (Math.random() < .7 ? '#ffd88a' : '#ffb545'),
          w: (Math.random() < .3 ? 2.4 : 1.4) * sc, tw: Math.random() < .55,
          g: .19, drag: .996, cool: true,
          split: Math.random() < .12 ? (14 + Math.random() * 16) | 0 : 0 });
      }
      /* the nozzle itself glows */
      if (Math.random() < .5)
        flashes.push({ x, y: H - 6, r: rnd(50, 95) * sc, life: 9, max: 9, color: '#ffcf7a' });
      /* embers that arc out and drift down */
      if (Math.random() < .7) {
        const a = -Math.PI / 2 + rnd(-.7, .7), v = rnd(6, 13) * sc, L = rnd(120, 210);
        parts.push({ kind: 'spark', x, y: H - 2, px: x, py: H - 2,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: L, max: L, z,
          color: '#ff9d3c', w: 1.7 * sc, tw: true, g: .12, drag: .998, cool: true });
      }
    }
    /* fountains light their surroundings, not the whole frame */
  }

  /* ---------- FLAME FX: stage jets. Bright, gold, celebratory ---------------
     Rhythmic bursts firing in sequence like flame bars on a stage, with gold
     sparkle thrown off the top. Deliberately clean — no black smoke, that's
     what makes fire read as a hazard rather than a celebration. */
  let flameBeat = 0;
  function flameJet() {
    if (parts.length > MAX_PARTS) return;
    flameBeat += 1;
    /* Reference footage: two rigs flanking the stage in the bottom corners,
       firing tall and slightly inward — not a row spread across the width. */
    /* the true corners — 3% in, leaning hard toward centre so the two columns
       read as a gate of fire framing the page */
    const rigs = [
      { x: W * .03, lean:  1 },
      { x: W * .97, lean: -1 }
    ];
    rigs.forEach((rig, ri) => {
        /* Floor matters: at the old 0.2 minimum the out-of-phase rig rose at a
           fifth speed and never cleared the nozzle, so one side looked dead. */
        const pulse = .88 + Math.sin(flameBeat * .13 + ri * 1.7) * .12;
      for (let i = 0; i < 26; i++) {
        const z = depth(), sc = zScale(z);
        const L = rnd(16, 32);
        /* the lean is a fraction of the rise speed, so the columns cut the same
           ~20 degree diagonal toward centre on a phone as on a monitor */
        const vmag = H / rnd(14, 27) * sc * pulse;
        /* on a portrait phone a fixed lean makes the two columns cross and
           merge into what reads as ONE central fire — scale it by aspect so
           narrow screens keep two distinct corner flames */
        const leanK = Math.min(.3, (W / H) * .18);
        parts.push({ kind: 'flame', x: rig.x + rnd(-22, 22), y: H + 4,
          vx: rig.lean * vmag * leanK * rnd(.8, 1.25) + rnd(-.3, .3),
          vy: -vmag, life: L, max: L, z,
          size: rnd(13, 28) * sc * vs, g: .07, drag: .984,
          wob: rnd(.18, .34), phase: rnd(0, 6.3), amp: rnd(1.1, 2.8),
          happy: true });
      }
      /* silver sparkle thrown off the jet, like the gerbs in the video */
      for (let i = 0; i < 7; i++) {
        const z = depth(), sc = zScale(z);
        const ang = -Math.PI / 2 + rnd(-.26, .26) + rig.lean * .38;
        const v = rnd(12, 22) * sc, L = rnd(45, 100);
        parts.push({ kind: 'spark', x: rig.x, y: H - rnd(0, 30), px: rig.x, py: H,
          vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: L, max: L, z,
          color: Math.random() < .5 ? '#fffdf4' : (Math.random() < .6 ? '#ffe9a8' : '#ffc247'),
          w: rnd(1, 2.3) * sc, tw: Math.random() < .5, g: .16, drag: .995, cool: true });
      }
      if (Math.random() < .35)
        flashes.push({ x: rig.x, y: H - 8, r: rnd(70, 135), life: 7, max: 7, color: '#ffc46a' });
    });
  }

  /* ---------- CO2: high-pressure white plumes, fast and turbulent ----------- */
  function co2Jet() {
    if (parts.length > MAX_PARTS) return;
    /* Reference footage: two tall white columns fired straight up from stage
       level at either side, mushrooming out as they lose pressure near the top. */
    const nozzles = [{ x: W * .16 }, { x: W * .84 }];
    nozzles.forEach(nz => {
      for (let i = 0; i < 11; i++) {
        const z = depth(), sc = zScale(z);
        /* speed scaled to the screen: a fixed 30-50px/frame crossed this frame
           in 8 frames and spent the rest of its life off-screen */
        const vy = -H / rnd(38, 78) * (.8 + z * .4);
        parts.push({ kind: 'plume', x: nz.x + rnd(-9, 9), y: H - rnd(0, 20),
          vx: rnd(-1.6, 1.6),
          vy: vy,
          life: rnd(70, 120), max: 120, z,
          size: rnd(11, 24) * sc * vs, grow: rnd(1.5, 2.9) * vs, drag: .992,
          turb: rnd(1.1, 3.2), phase: rnd(0, 6.3), tint: '250,253,255', thick: true });
      }
      if (Math.random() < .35)
        flashes.push({ x: nz.x, y: H - 14, r: rnd(50, 100), life: 7, max: 7, color: '#dff1ff' });
    });
  }

  /* ---------- FOG: a dense dry-ice blanket that rolls and layers ------------ */
  function groundFog() {
    if (parts.length > MAX_PARTS) return;
    for (let i = 0; i < 5; i++) {
      const z = depth(), sc = zScale(z);
      /* anchored to the bottom third — dry ice sits on the floor, it doesn't
         fill the room to the ceiling */
      parts.push({ kind: 'plume', x: rnd(-120, W + 120), y: H - rnd(-30, H * .08),
        vx: rnd(-2.4, 2.4) * sc, vy: rnd(-.10, .05),
        life: rnd(190, 330), max: 330, z,
        size: rnd(26, 62) * sc * vs, grow: rnd(.25, .6) * vs, drag: .997,
        turb: rnd(.35, 1.1), phase: rnd(0, 6.3), tint: '226,234,244' });
    }
    /* wisps lifting off the top of the blanket */
    for (let i = 0; i < 3; i++) {
      const z = depth();
      parts.push({ kind: 'plume', x: rnd(0, W), y: H - rnd(H * .04, H * .12),
        vx: rnd(-1, 1), vy: -rnd(.15, .5), life: rnd(90, 150), max: 150, z,
        size: rnd(30, 70) * vs, grow: rnd(.6, 1.2) * vs, drag: .995,
        turb: rnd(.6, 1.6), phase: rnd(0, 6.3), tint: '214,224,238' });
    }
  }

  /* ---------- COLOUR DAYOUT: holi powder — clouds plus falling grains ------- */
  /* Reference footage: a battery of vertical coloured-smoke columns fired
     upward in a fan behind the couple — each column its own solid colour,
     dissolving into a drifting rainbow mass at the top. */
  const SMOKE_FAN = ['255,94,0', '226,62,87', '255,212,0', '61,224,110',
                     '49,216,192', '43,123,255', '182,76,255', '255,46,166'];
  function colourPuff() {
    if (parts.length > MAX_PARTS) return;
    const cols = SMOKE_FAN.length;
    for (let c = 0; c < cols; c++) {
      /* nozzles clustered mid-stage, columns fanning outward like the footage */
      const nx = W * (.5 + (c - (cols - 1) / 2) * .105);
      const lean = (c - (cols - 1) / 2) * .22;           // outward fan angle
      const z = depth(), sc = zScale(z);
      const rise = H / rnd(26, 44) * sc;
      for (let i = 0; i < 3; i++) {
        parts.push({ kind: 'plume', x: nx + rnd(-6, 6), y: H + rnd(0, 14),
          vx: Math.sin(lean) * rise * .5 + rnd(-.4, .4),
          vy: -Math.cos(lean) * rise,
          life: rnd(110, 170), max: 170, z,
          size: rnd(10, 20) * sc * vs, grow: rnd(.5, 1.1) * vs, drag: .993,
          turb: rnd(.3, .9), phase: rnd(0, 6.3),
          tint: SMOKE_FAN[c], dense: true });
      }
      /* dissolving mass where the columns top out */
      if (Math.random() < .2)
        parts.push({ kind: 'plume', x: rnd(W * .05, W * .95),
          y: rnd(H * .08, H * .3),
          vx: rnd(-1.2, 1.2), vy: -rnd(.2, .9),
          life: rnd(90, 160), max: 160, z,
          size: rnd(16, 34) * sc * vs, grow: rnd(1.2, 2.4) * vs, drag: .99,
          turb: rnd(.6, 1.6), phase: rnd(0, 6.3),
          tint: pick(SMOKE_FAN), dense: true });
    }
  }

  /* ---------- BALLOONS: teardrop bodies with real parallax ------------------ */
  function balloonRise() {
    if (parts.length > MAX_PARTS) return;
    atRate('balloon', 9, () => {
      const z = depth(), sc = zScale(z);
      const y0 = H + rnd(30, 260), vy = -rnd(2.8, 5.4) * sc;
      const L = (y0 + H * .35) / -vy * 1.1;
      parts.push({ kind: 'balloon', x: rnd(-30, W + 30), y: y0,
        vx: rnd(-.4, .4), vy: vy,
        life: L, max: L, z,
        color: pick(PAL.balloons), size: rnd(18, 46) * sc,
        sway: rnd(.006, .02), phase: rnd(0, 6.3), tilt: rnd(-.22, .22) });
    });
  }

  /* ---------- SMOKE BUBBLES: filled with smoke, and they pop ---------------- */
  function smokeBubble() {
    if (parts.length > MAX_PARTS) return;
    atRate('bubble', 8, () => {
      const z = depth(), sc = zScale(z);
      const y0 = H + rnd(10, 160), vy = -rnd(1.8, 3.8) * sc;
      const L = (y0 + H * .3) / -vy * 1.1;
      if (Math.random() < .25) SFX.pop();
      parts.push({ kind: 'bubble', x: rnd(-20, W + 20), y: y0,
        vx: rnd(-.9, .9), vy: vy,
        life: L, max: L, z,
        size: rnd(20, 66) * sc, sway: rnd(.008, .028), phase: rnd(0, 6.3),
        spin: rnd(-.02, .02), swirl: rnd(0, 6.3),
        hueA: pick(['190,225,255', '210,255,225', '255,225,180', '225,200,255']),
        hueB: pick(['255,190,235', '190,200,255', '255,240,190', '190,255,235']) });
    });
  }

  /* ---------- CONFETTI: foil that catches the light as it tumbles ---------- */
  function confettiBurst() {
    if (parts.length > MAX_PARTS) return;
    for (let i = 0; i < 13; i++) {
      const z = depth(), sc = zScale(z);
      /* mixed sizes: mostly small flecks, a few large statement pieces */
      const big = Math.random() < .18, tiny = Math.random() < .4;
      const base = big ? rnd(13, 22) : tiny ? rnd(3.5, 6.5) : rnd(7, 12);
      const cc = pick(PAL.confetti);
      parts.push({ kind: 'confetti', x: rnd(-30, W + 30), y: rnd(-80, H * .2),
        vx: rnd(-2.2, 2.2) * sc, vy: rnd(1, 3.6) * sc,
        life: rnd(170, 300), max: 300, z,
        color: cc, hi: lighten(cc, .5), foil: Math.random() < .45,
        w: base * sc, h: base * rnd(1.2, 1.7) * sc,
        rot: rnd(0, 6.3), vr: rnd(-.26, .26),
        sway: rnd(.01, .05), phase: rnd(0, 6.3) });
    }
  }

  /* ---------- PETALS: a dense flower shower, two-tone, fluttering ---------- */
  function petalFall() {
    if (parts.length > MAX_PARTS) return;
    atRate('petal', 720, () => {
      const z = depth(), sc = zScale(z);
      const y0 = rnd(-220, -10);
      /* speed scaled to the screen so a petal always crosses in 1.6-3.2s,
         whatever the display — a fixed px/frame is far too slow on a tall one */
      const vy = (H - y0) / rnd(95, 190) * (.75 + z * .5);
      /* lifetime derived from the distance it must actually travel — a fixed
         frame count crosses a 300px pane but dies halfway down a 1400px screen */
      const L = (H - y0) / vy * 1.15;
      /* five species falling together — every highlight is the flower's own
         hue lightened, so nothing ever reads as white */
      const kind = Math.random();
      let col, pw, ph;
      if (kind < .32) {           // rose — broad, deep pinks and reds
        col = pick(['#ff0a54', '#ff2e88', '#e00040', '#c9004f', '#ff5c9e']);
        pw = rnd(13, 26); ph = rnd(9, 16);
      } else if (kind < .58) {    // marigold — slim, saffron and gold
        col = pick(['#ff9f1c', '#ffb200', '#ff7a00', '#ffd400', '#ff8a00']);
        pw = rnd(7, 13); ph = rnd(14, 24);
      } else if (kind < .76) {    // orchid — violets and purples
        col = pick(['#b64cff', '#8e2de2', '#d16bff', '#7a2bd6']);
        pw = rnd(10, 19); ph = rnd(12, 20);
      } else if (kind < .9) {     // lily — coral and peach
        col = pick(['#ff8e6b', '#ffb28a', '#ff6f52', '#ff9e7d']);
        pw = rnd(11, 20); ph = rnd(8, 13);
      } else {                    // blossom — small, blush pink
        col = pick(['#ffb3d1', '#ff8fb8', '#ff9ec4']);
        pw = rnd(6, 11); ph = rnd(5, 9);
      }
      const shade = lighten(col, .38);
      parts.push({ kind: 'petal', x: rnd(-30, W + 30), y: y0,
        vx: rnd(-.8, .8), vy: vy, vmax: vy * 1.25,
        life: L, max: L, z,
        color: col, shade: shade,
        w: pw * sc, h: ph * sc,
        rot: rnd(0, 6.3), vr: rnd(-.06, .06),
        sway: rnd(.012, .034), phase: rnd(0, 6.3) });
    });
  }

  /* ---------- INFERNO: detonation, the screen burns, then ash falls --------
     Three acts. Blasts and shockwaves first, then fire takes the whole frame,
     then it burns down to drifting embers and grey ash. */
  function detonate(x, y, big) {
    SFX.blast((x / W) * 2 - 1);
    glows.push({ x, y, life: 26, max: 26, power: big ? .30 : .18, color: '#ffb257' });
    flashes.push({ x, y, r: big ? rnd(260, 420) : rnd(120, 240), life: 20, max: 20, color: '#fff0c8' });
    shocks.push({ x, y, r: 10, vr: big ? rnd(15, 26) : rnd(8, 15), life: 34, max: 34 });
    const n = big ? 190 : 110;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), v = rnd(3, big ? 20 : 13), L = rnd(50, 130);
      parts.push({ kind: 'spark', x, y, px: x, py: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(0, 3),
        life: L, max: L, color: Math.random() < .5 ? '#fff3cf' : (Math.random() < .6 ? '#ff9d34' : '#ff5416'),
        w: rnd(1.1, 3.2), tw: Math.random() < .4, g: .13, drag: .984, cool: true });
    }
    for (let i = 0; i < 14; i++) {
      parts.push({ kind: 'vapour', x: x + rnd(-70, 70), y: y + rnd(-60, 60),
        vx: rnd(-1.4, 1.4), vy: rnd(-2.2, -.4), life: rnd(120, 240), max: 240,
        size: rnd(50, 150) * vs, grow: rnd(1.4, 3.2) * vs, drag: .985, tint: '46,40,38', z: .6 });
    }
  }

  function inferno(elapsed) {
    if (parts.length > MAX_PARTS) return;
    const t = elapsed / 4600;

    if (t < .22) {                                  // opening detonations
      if (Math.random() < .6) detonate(rnd(W * .05, W * .95), rnd(H * .25, H * .9), Math.random() < .5);
    }
    /* the heavy, smoky fire that used to be Flame FX — right at home here */
    if (t < .85) {
      const cols = 9;
      for (let c = 0; c < cols; c++) {
        if (Math.random() > .5) continue;
        const x = W * (c + .5) / cols, z = depth(), sc = zScale(z);
        for (let i = 0; i < 4; i++) {
          const L = rnd(48, 92);
          parts.push({ kind: 'flame', x: x + rnd(-26, 26), y: H + rnd(0, 26),
            vx: rnd(-1.1, 1.1), vy: -rnd(12, 21) * sc, life: L, max: L, z,
            size: rnd(26, 58) * sc * vs, g: .10, drag: .987,
            wob: rnd(.05, .13), phase: rnd(0, 6.3), amp: rnd(.8, 2.6) });
        }
      }
      if (Math.random() < .5)
        parts.push({ kind: 'vapour', x: rnd(0, W), y: rnd(H * .1, H * .65),
          vx: rnd(-.8, .8), vy: -rnd(.5, 1.8), life: rnd(120, 210), max: 210,
          size: rnd(50, 130) * vs, grow: rnd(1.1, 2.3) * vs, drag: .99, tint: '40,35,33', z: depth() });
      if (Math.random() < .12) detonate(rnd(0, W), rnd(H * .3, H), false);
    }
    if (t > .25) {                                  // ashfall
      for (let i = 0; i < 6; i++) {
        const z = depth(), sc = zScale(z);
        parts.push({ kind: 'ash', x: rnd(-30, W + 30), y: rnd(-70, H * .1),
          vx: rnd(-.9, .9), vy: rnd(.6, 2.3) * sc,
          life: rnd(180, 320), max: 320, z, ember: Math.random() < .22,
          w: rnd(3, 9) * sc, h: rnd(2, 6) * sc,
          rot: rnd(0, 6.3), vr: rnd(-.09, .09),
          sway: rnd(.014, .04), phase: rnd(0, 6.3) });
      }
    }
    if (t < .85 && Math.random() < .35)
      glows.push({ x: rnd(0, W), y: H * .8, life: 12, max: 12, power: .05, color: '#ff6a22' });
  }

  /* ---------- CONFETTI: foil that catches the light as it tumbles ---------- */
  function confettiBurst() {
    if (parts.length > MAX_PARTS) return;
    for (let i = 0; i < 13; i++) {
      const z = depth(), sc = zScale(z);
      /* mixed sizes: mostly small flecks, a few large statement pieces */
      const big = Math.random() < .18, tiny = Math.random() < .4;
      const base = big ? rnd(13, 22) : tiny ? rnd(3.5, 6.5) : rnd(7, 12);
      const cc = pick(PAL.confetti);
      parts.push({ kind: 'confetti', x: rnd(-30, W + 30), y: rnd(-80, H * .2),
        vx: rnd(-2.2, 2.2) * sc, vy: rnd(1, 3.6) * sc,
        life: rnd(170, 300), max: 300, z,
        color: cc, hi: lighten(cc, .5), foil: Math.random() < .45,
        w: base * sc, h: base * rnd(1.2, 1.7) * sc,
        rot: rnd(0, 6.3), vr: rnd(-.26, .26),
        sway: rnd(.01, .05), phase: rnd(0, 6.3) });
    }
  }

  /* ---------- PETALS: a dense flower shower, two-tone, fluttering ---------- */
  function petalFall() {
    if (parts.length > MAX_PARTS) return;
    atRate('petal', 720, () => {
      const z = depth(), sc = zScale(z);
      const y0 = rnd(-220, -10);
      /* speed scaled to the screen so a petal always crosses in 1.6-3.2s,
         whatever the display — a fixed px/frame is far too slow on a tall one */
      const vy = (H - y0) / rnd(95, 190) * (.75 + z * .5);
      /* lifetime derived from the distance it must actually travel — a fixed
         frame count crosses a 300px pane but dies halfway down a 1400px screen */
      const L = (H - y0) / vy * 1.15;
      /* five species falling together — every highlight is the flower's own
         hue lightened, so nothing ever reads as white */
      const kind = Math.random();
      let col, pw, ph;
      if (kind < .32) {           // rose — broad, deep pinks and reds
        col = pick(['#ff0a54', '#ff2e88', '#e00040', '#c9004f', '#ff5c9e']);
        pw = rnd(13, 26); ph = rnd(9, 16);
      } else if (kind < .58) {    // marigold — slim, saffron and gold
        col = pick(['#ff9f1c', '#ffb200', '#ff7a00', '#ffd400', '#ff8a00']);
        pw = rnd(7, 13); ph = rnd(14, 24);
      } else if (kind < .76) {    // orchid — violets and purples
        col = pick(['#b64cff', '#8e2de2', '#d16bff', '#7a2bd6']);
        pw = rnd(10, 19); ph = rnd(12, 20);
      } else if (kind < .9) {     // lily — coral and peach
        col = pick(['#ff8e6b', '#ffb28a', '#ff6f52', '#ff9e7d']);
        pw = rnd(11, 20); ph = rnd(8, 13);
      } else {                    // blossom — small, blush pink
        col = pick(['#ffb3d1', '#ff8fb8', '#ff9ec4']);
        pw = rnd(6, 11); ph = rnd(5, 9);
      }
      const shade = lighten(col, .38);
      parts.push({ kind: 'petal', x: rnd(-30, W + 30), y: y0,
        vx: rnd(-.8, .8), vy: vy, vmax: vy * 1.25,
        life: L, max: L, z,
        color: col, shade: shade,
        w: pw * sc, h: ph * sc,
        rot: rnd(0, 6.3), vr: rnd(-.06, .06),
        sway: rnd(.012, .034), phase: rnd(0, 6.3) });
    });
  }

  /* ---------- INFERNO: detonation, the screen burns, then ash falls --------
     Three acts. Blasts and shockwaves first, then fire takes the whole frame,
     then it burns down to drifting embers and grey ash. */
  function detonate(x, y, big) {
    SFX.blast((x / W) * 2 - 1);
    glows.push({ x, y, life: 26, max: 26, power: big ? .30 : .18, color: '#ffb257' });
    flashes.push({ x, y, r: big ? rnd(260, 420) : rnd(120, 240), life: 20, max: 20, color: '#fff0c8' });
    shocks.push({ x, y, r: 10, vr: big ? rnd(15, 26) : rnd(8, 15), life: 34, max: 34 });
    const n = big ? 190 : 110;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), v = rnd(3, big ? 20 : 13), L = rnd(50, 130);
      parts.push({ kind: 'spark', x, y, px: x, py: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(0, 3),
        life: L, max: L, color: Math.random() < .5 ? '#fff3cf' : (Math.random() < .6 ? '#ff9d34' : '#ff5416'),
        w: rnd(1.1, 3.2), tw: Math.random() < .4, g: .13, drag: .984, cool: true });
    }
    for (let i = 0; i < 14; i++) {
      parts.push({ kind: 'vapour', x: x + rnd(-70, 70), y: y + rnd(-60, 60),
        vx: rnd(-1.4, 1.4), vy: rnd(-2.2, -.4), life: rnd(120, 240), max: 240,
        size: rnd(50, 150) * vs, grow: rnd(1.4, 3.2) * vs, drag: .985, tint: '46,40,38', z: .6 });
    }
  }

  function inferno(elapsed) {
    if (parts.length > MAX_PARTS) return;
    const t = elapsed / 4600;

    if (t < .16) {                                  // ACT 1 — detonations
      if (Math.random() < .5) detonate(rnd(W * .05, W * .95), rnd(H * .2, H * .9), Math.random() < .45);
    }
    if (t > .05 && t < .72) {                       // ACT 2 — the frame burns
      const cols = 9;
      for (let c = 0; c < cols; c++) {
        if (Math.random() > .42) continue;
        const x = W * (c + .5) / cols, z = depth(), sc = zScale(z);
        for (let i = 0; i < 3; i++) {
          const L = rnd(46, 92);
          parts.push({ kind: 'flame', x: x + rnd(-30, 30), y: H + rnd(0, 30),
            vx: rnd(-1.1, 1.1), vy: -rnd(12, 22) * sc, life: L, max: L, z,
            size: rnd(22, 52) * sc, g: .10, drag: .987,
            wob: rnd(.05, .13), phase: rnd(0, 6.3), amp: rnd(.8, 2.6) });
        }
      }
      if (Math.random() < .5)
        parts.push({ kind: 'vapour', x: rnd(0, W), y: rnd(H * .05, H * .6),
          vx: rnd(-.8, .8), vy: -rnd(.5, 1.8), life: rnd(150, 280), max: 280,
          size: rnd(50, 130) * vs, grow: rnd(1.1, 2.3) * vs, drag: .99, tint: '40,35,33', z: depth() });
      if (Math.random() < .10) detonate(rnd(0, W), rnd(H * .3, H), false);
    }
    if (t > .18) {                                  // ACT 3 — ashfall
      for (let i = 0; i < 7; i++) {
        const z = depth(), sc = zScale(z), ember = Math.random() < .22;
        parts.push({ kind: 'ash', x: rnd(-30, W + 30), y: rnd(-70, H * .1),
          vx: rnd(-.9, .9), vy: rnd(.5, 2.1) * sc,
          life: rnd(230, 420), max: 420, z, ember,
          w: rnd(3, 9) * sc, h: rnd(2, 6) * sc,
          rot: rnd(0, 6.3), vr: rnd(-.09, .09),
          sway: rnd(.014, .04), phase: rnd(0, 6.3) });
      }
      if (Math.random() < .35) {                     // embers lifting off the fire
        const z = depth();
        parts.push({ kind: 'spark', x: rnd(0, W), y: H - rnd(0, H * .2), px: 0, py: 0,
          vx: rnd(-1.4, 1.4), vy: -rnd(1.6, 4.2), life: rnd(120, 240), max: 240,
          color: '#ff7a24', w: rnd(1.2, 2.6), tw: true, g: -.008, drag: .995, cool: true, z });
      }
    }
    if (t > .05 && t < .74 && Math.random() < .35)
      glows.push({ x: rnd(0, W), y: H * .8, life: 12, max: 12, power: .05, color: '#ff6a22' });
  }

  /* ---------- interactive: bubbles pop when touched ------------------------
     The canvas ignores pointer events (the page stays usable), so hits are
     taken from document-level listeners and tested against live bubbles. Page
     coordinates equal canvas coordinates: the canvas is fixed at inset 0 and
     drawn in CSS pixels. */
  function burstBubble(p) {
    SFX.pop();
    const n = 12 + ((p.size / 4) | 0);
    for (let k = 0; k < n; k++) {           // the film shatters into droplets
      const a = Math.random() * 6.283, v = rnd(1.6, 4.6) * (p.size / 34 + .5);
      const L = rnd(18, 42);
      parts.push({ kind: 'spark',
        x: p.x + Math.cos(a) * p.size * .9, y: p.y + Math.sin(a) * p.size * .9,
        px: p.x, py: p.y,
        vx: Math.cos(a) * v + p.vx, vy: Math.sin(a) * v + p.vy - .6,
        life: L, max: L,
        color: Math.random() < .5 ? '#ffffff'
             : 'rgb(' + (Math.random() < .5 ? p.hueA : p.hueB) + ')',
        w: rnd(.8, 1.7), tw: false, g: .12, drag: .97, cool: false, z: p.z });
    }
    /* the smoke it was holding escapes upward */
    parts.push({ kind: 'vapour', x: p.x, y: p.y, vx: p.vx * .4, vy: -rnd(.3, .9),
      life: rnd(50, 90), max: 90, size: p.size * .8, grow: rnd(1.2, 2.2) * (vs || 1),
      drag: .98, tint: '192,192,202', z: p.z });
    shocks.push({ x: p.x, y: p.y, r: p.size * .5, vr: rnd(2, 4.5),
                  life: 15, max: 15, color: '#cfe8ff' });
  }
  function popBubblesAt(cx, cy) {
    if (!running) return;
    let popped = 0;
    for (let i = parts.length - 1; i >= 0 && popped < 6; i--) {
      const p = parts[i];
      if (p.kind !== 'bubble') continue;
      /* a fingertip is ~40px — anything smaller makes taps feel broken on a
         phone even though the code "works" */
      const dx = cx - p.x, dy = cy - p.y, r = Math.max(p.size * 1.2, 42);
      if (dx * dx + dy * dy <= r * r) { parts.splice(i, 1); burstBubble(p); popped++; }
    }
  }
  let lastPopAt = 0;
  function popGuarded(cx, cy) {              // pointerdown + touchstart both fire
    const now = performance.now();
    if (now - lastPopAt < 60) return;
    lastPopAt = now;
    popBubblesAt(cx, cy);
  }
  addEventListener('pointerdown', e => popGuarded(e.clientX, e.clientY), { passive: true });
  addEventListener('touchstart', e => {      // in-app browsers with flaky pointer events
    const t = e.changedTouches && e.changedTouches[0];
    if (t) popGuarded(t.clientX, t.clientY);
  }, { passive: true });
  let lastPopScan = 0;
  addEventListener('pointermove', e => {     // brushing through them pops too
    const now = performance.now();
    if (now - lastPopScan < 50) return;
    lastPopScan = now;
    popBubblesAt(e.clientX, e.clientY);
  }, { passive: true });

  /* brighten within the hue — highlights tint toward the colour's own light
     version instead of washing to white */
  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const L = c => Math.round(c + (255 - c) * k);
    return 'rgb(' + L(r) + ',' + L(g) + ',' + L(b) + ')';
  }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  const EMIT = {
    fireworks: (elapsed) => {
      /* A finale is choreographed, not uniform: it opens, builds, then empties
         the racks. Rate and shell size both ramp with elapsed time. */
      const t = elapsed / 4600;                       // 0 -> 1 across the run
      if (t > .62) {                                  // FINALE — empty the racks
        if (Math.random() < .55) launchShell({ big: Math.random() < .5 });
        if (Math.random() < .30) launchShell({ y: rnd(H * .05, H * .25), big: true });
        if (Math.random() < .22) gerb();               // ground fountains join in
      } else if (t > .3) {                            // build
        if (Math.random() < .28) launchShell();
        if (Math.random() < .08) launchShell({ big: true });
      } else {                                        // opening
        if (Math.random() < .16) launchShell();
      }
    },
    gerbs:     gerb,
    flame:     (el) => flameJet(el),
    confetti:  confettiBurst,
    petals:    petalFall,
    co2:       () => { if (Math.random() < .5) co2Jet(); },
    fog:       groundFog,
    balloons:  balloonRise,
    colour:    colourPuff,
    bubbles:   smokeBubble,
    inferno:   inferno
  };

  /* -------------------------------------------------------------- the loop */
  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    if (running && t < emitUntil && EMIT[current]) EMIT[current](t - startedAt);

    /* Every break briefly lifts the whole screen, the way a real shell lights
       up a field. Warm and low-alpha on purpose — not a white strobe. */
    let wash = 0, washR = 0, washG = 0, washB = 0;
    for (let i = glows.length - 1; i >= 0; i--) {
      const gl = glows[i]; gl.life--;
      if (gl.life <= 0) { glows.splice(i, 1); continue; }
      const k = gl.life / gl.max, amt = gl.power * k * k;
      wash += amt;
      const c = gl.color.length === 7 ? gl.color : '#ffb060';
      washR += parseInt(c.slice(1, 3), 16) * amt;
      washG += parseInt(c.slice(3, 5), 16) * amt;
      washB += parseInt(c.slice(5, 7), 16) * amt;
    }
    if (wash > .002) {
      const a = Math.min(wash, .13);            // hard ceiling — never a strobe
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${(washR / wash) | 0},${(washG / wash) | 0},${(washB / wash) | 0},${a})`;
      ctx.fillRect(0, 0, W, H);
    }

    /* shells (fireworks only) */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.px = s.x; s.py = s.y; s.vy += .09; s.x += s.vx; s.y += s.vy;
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
      if (s.vy >= 0) { burst(s); shells.splice(i, 1); }
    }
    /* blast shockwaves — a thin ring racing outward and thinning as it goes */
    for (let i = shocks.length - 1; i >= 0; i--) {
      const sh = shocks[i]; sh.life--; sh.r += sh.vr; sh.vr *= .955;
      if (sh.life <= 0) { shocks.splice(i, 1); continue; }
      const k = sh.life / sh.max;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k * k * .55;
      ctx.strokeStyle = sh.color || '#ffd9a0'; ctx.lineWidth = Math.max(.5, 7 * k);
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, 6.284); ctx.stroke();
      ctx.globalAlpha = k * k * .22; ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(.4, 2.5 * k);
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r * .92, 0, 6.284); ctx.stroke();
    }

    /* detonation flashes */
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life--;
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      const k = f.life / f.max, r = f.r * (1.6 - k * .6);
const fk = f.color.length === 7 ? f.color : '#ffd9a0';
      blit(softSprite('[[0,"' + fk + '"],[0.45,"' + fk + '"],[1,"rgba(255,255,255,0)"]]', 0),
           f.x, f.y, r, k * k * .5, 0, 1);
    }

    /* Sparks are batched by colour+width+alpha bucket and stroked as one path
       each. Per-particle beginPath/stroke was costing ~2/3 of the frame. */
    const batch = new Map();

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life--;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const a = p.life / p.max;

      if (p.kind === 'spark') {
        if (p.delay && p.delay-- > 0) { p.life++; continue; }   // crackle pops late
        if (p.split && --p.split <= 0) {                        // crossette break
          p.split = 0;
          for (let k = 0; k < 4; k++) {
            const a2 = k * 1.5708 + rnd(-.3, .3), v2 = rnd(1.6, 3.2), L2 = rnd(30, 60);
            parts.push({ kind: 'spark', x: p.x, y: p.y, px: p.x, py: p.y,
              vx: p.vx * .3 + Math.cos(a2) * v2, vy: p.vy * .3 + Math.sin(a2) * v2,
              life: L2, max: L2, color: p.color, w: 1.1, tw: false,
              g: .05, drag: .98, cool: true });
          }
        }
        p.px = p.x; p.py = p.y;
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy;
        if (p.y > H + 40) { parts.splice(i, 1); continue; }
        const al = Math.pow(a, 1.3);
        /* real sparks cool as they fall: white-hot, then the shell's colour,
           then a dull ember before they go out */
        const col = !p.cool ? p.color
                  : a > .84 ? '#fff4dc'
                  : a < .26 ? '#a33a10'
                  : p.color;
        const alpha = p.tw ? al * rnd(.4, 1) : al;
        const q = Math.max(1, Math.round(alpha * 7));            // 7 alpha buckets
        const key = col + '|' + p.w.toFixed(1) + '|' + q;
        let seg = batch.get(key);
        if (!seg) { seg = { col, w: p.w, a: q / 7, pts: [] }; batch.set(key, seg); }
        seg.pts.push(p.px, p.py, p.x, p.y);

      } else if (p.kind === 'flame') {
        /* Fire is turbulent and it cools as it climbs: white core, yellow,
           orange, deep red, then it stops emitting and becomes smoke. */
        p.phase += p.wob;
        p.vx += Math.sin(p.phase) * p.amp * .25;
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
        p.x += p.vx; p.y += p.vy;
        const heat = a;                        // 1 at the nozzle, 0 at the top
        const r = p.size * (.40 + (1 - a) * .45);
        let stops;
        if (p.happy) {                         // stage jets: warm the whole way up
          stops = heat > .6
            ? '[[0,"rgba(255,246,205,.95)"],[0.3,"rgba(255,186,66,.62)"],[0.66,"rgba(255,110,24,.3)"],[1,"rgba(150,40,8,0)"]]'
            : '[[0,"rgba(255,214,120,.72)"],[0.34,"rgba(255,150,44,.5)"],[0.7,"rgba(226,72,16,.22)"],[1,"rgba(120,30,6,0)"]]';
        } else if (heat > .72) {
          stops = '[[0,"rgba(255,252,232,.98)"],[0.32,"rgba(255,214,120,.8)"],[0.7,"rgba(255,132,36,.34)"],[1,"rgba(20,12,10,0)"]]';
        } else if (heat > .4) {
          stops = '[[0,"rgba(255,196,92,.72)"],[0.45,"rgba(255,110,30,.42)"],[0.8,"rgba(174,48,14,.18)"],[1,"rgba(20,12,10,0)"]]';
        } else {
          stops = '[[0,"rgba(196,72,22,.34)"],[0.5,"rgba(96,38,18,.18)"],[0.85,"rgba(40,26,22,.08)"],[1,"rgba(20,12,10,0)"]]';
        }
        ctx.globalCompositeOperation = heat > .35 ? 'lighter' : 'source-over';
        /* blit() stretches along X, so rotate X onto the direction of travel and
           elongate — rotating a quarter-turn squeezed the tongues instead. */
        blit(softSprite(stops, 0), p.x, p.y, r * .9,
             Math.min(.9, a * 1.15),
             Math.atan2(p.vy, p.vx),
             1.5 + (1 - a) * 1.1);

      } else if (p.kind === 'plume') {
        /* CO2, fog and powder: a turbulent volume. Drift wanders with its own
           phase so the mass churns instead of expanding as tidy circles. */
        p.phase += .05;
        p.vx += Math.sin(p.phase * 1.3) * p.turb * .35;
        p.vy += Math.cos(p.phase * .9) * p.turb * .16;
        p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx; p.y += p.vy;
        p.size += p.grow;
        const fade = a < .3 ? a / .3 : 1;                 // dissipate, don't blink out
        const core = (p.dense ? .17 : (p.thick ? .17 : .10)) * fade * (.55 + p.z * .6);
        const spd = Math.hypot(p.vx, p.vy);
        const stops = JSON.stringify([[0, 'rgba(' + p.tint + ',1)'],
                                      [.55, 'rgba(' + p.tint + ',.5)'],
                                      [1, 'rgba(' + p.tint + ',0)']]);
        ctx.globalCompositeOperation = 'source-over';
        blit(softSprite(stops, 0), p.x, p.y, p.size, core,
             spd > 2.5 ? Math.atan2(p.vy, p.vx) : 0,
             spd > 2.5 ? Math.min(3.2, 1 + spd * .09) : 1);

      } else if (p.kind === 'vapour') {
        p.vx *= p.drag; p.vy = p.vy * p.drag; p.x += p.vx; p.y += p.vy;
        p.size += p.grow;
        ctx.globalCompositeOperation = 'source-over';
        blit(softSprite('[[0,"rgba(' + p.tint + ',1)"],[1,"rgba(' + p.tint + ',0)"]]', 0),
             p.x, p.y, p.size, .30 * a, 0, 1);

      } else if (p.kind === 'confetti' || p.kind === 'petal') {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * (p.kind === 'petal' ? 1.5 : .9);
        /* terminal velocity is per-particle: a fixed 2.4 cap silently overrode
           the emitter's screen-scaled speed, so petals died mid-fall */
        p.vy = Math.min(p.vy + (p.kind === 'petal' ? .012 : .05),
                        p.vmax || (p.kind === 'petal' ? 2.4 : 6));
        p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 40) { parts.splice(i, 1); continue; }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = p.kind === 'petal' ? Math.min(1, .55 + a * 1.6) : Math.min(1, a * 2.2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);

        /* face turns toward and away from the viewer as it tumbles; when it's
           edge-on it's dark, when flat it catches the light. That flicker is
           what makes foil read as foil. */
        const face = Math.cos(p.phase * 1.6);
        const lit  = Math.abs(face);

        if (p.kind === 'petal') {
          ctx.scale(1, Math.max(.25, lit));
          /* a touch of additive light on the lit face makes saturated colour
             read as vivid rather than flat-printed */
          const g = ctx.createLinearGradient(-p.w / 2, 0, p.w / 2, 0);
          g.addColorStop(0, p.color);
          g.addColorStop(.5, p.shade || p.color);
          g.addColorStop(1, p.color);
          ctx.fillStyle = g;
          /* rose petal: broad rounded top tapering to a point at the stem */
          const pw = p.w / 2, ph = p.h / 2;
          ctx.beginPath();
          ctx.moveTo(-pw, 0);
          ctx.bezierCurveTo(-pw * .95, -ph * 1.5, pw * .95, -ph * 1.5, pw, 0);
          ctx.bezierCurveTo(pw * .6, ph * 1.35, -pw * .6, ph * 1.35, -pw, 0);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha *= .5;                       // soft centre vein
          ctx.strokeStyle = p.color; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(-p.w / 2, 0); ctx.lineTo(p.w / 2, 0); ctx.stroke();
        } else {
          const h = p.h * Math.max(.12, lit);
          if (p.foil) {
            const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
            g.addColorStop(0, p.color);
            g.addColorStop(.45, p.hi || p.color);   // shine in its own hue
            g.addColorStop(1, p.color);
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = p.color;
          }
          ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
          if (p.foil && lit > .82) {                   // specular pop, flat-on only
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha *= (lit - .82) * 2;
            ctx.fillStyle = p.hi || p.color;
            ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
          }
        }
        ctx.restore();

      } else if (p.kind === 'ash') {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * 1.4;
        p.vy = Math.min(p.vy + .004, 2.6);            // flakes hit terminal velocity fast
        p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) { parts.splice(i, 1); continue; }
        const face = Math.abs(Math.cos(p.phase * 1.4));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, a * 2.4) * (.5 + p.z * .5);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.ember ? '#4a2a1c' : (Math.random() < .5 ? '#3a3632' : '#2a2724');
        ctx.fillRect(-p.w / 2, -p.h / 2 * Math.max(.2, face), p.w, p.h * Math.max(.2, face));
        if (p.ember) {                                 // still-burning edge
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha *= .55 + Math.sin(p.phase * 3) * .35;
          ctx.fillStyle = '#ff6a1e';
          ctx.fillRect(-p.w / 2, -p.h / 2 * Math.max(.2, face), p.w * .45, p.h * .5 * Math.max(.2, face));
        }
        ctx.restore();

      } else if (p.kind === 'balloon') {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * (.5 + p.z);
        p.y += p.vy;
        if (p.y < -p.size * 4) { parts.splice(i, 1); continue; }
        const S = p.size, tilt = p.tilt + Math.sin(p.phase) * .09;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, a * 3) * (.75 + p.z * .25);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(tilt);

        /* string, hanging and curling rather than ruler-straight */
        ctx.strokeStyle = 'rgba(247,242,233,.34)'; ctx.lineWidth = Math.max(.6, S * .028);
        ctx.beginPath(); ctx.moveTo(0, S * 1.16);
        ctx.bezierCurveTo(Math.sin(p.phase) * S * .5, S * 1.9,
                          -Math.sin(p.phase) * S * .4, S * 2.6, Math.sin(p.phase) * S * .2, S * 3.4);
        ctx.stroke();

        /* teardrop body: circle on top tapering to the knot */
        ctx.beginPath();
        ctx.moveTo(0, S * 1.06);
        ctx.bezierCurveTo(S * .86, S * .32, S * .84, -S * .78, 0, -S);
        ctx.bezierCurveTo(-S * .84, -S * .78, -S * .86, S * .32, 0, S * 1.06);
        ctx.closePath();
        ctx.fillStyle = p.color; ctx.fill();
        /* gloss + rim shading, pre-rendered per colour rather than per frame */
        ctx.save(); ctx.clip();
        blit(softSprite('[[0,"rgba(255,255,255,.32)"],[0.26,"rgba(255,255,255,.05)"],[0.82,"rgba(0,0,0,.14)"],[1,"rgba(0,0,0,.3)"]]', 0),
             0, 0, S * 1.25, 1, 0, 1);
        ctx.restore();

        ctx.fillStyle = p.color;                                   // knot
        ctx.beginPath(); ctx.moveTo(-S * .12, S * 1.04);
        ctx.lineTo(S * .12, S * 1.04); ctx.lineTo(0, S * 1.24);
        ctx.closePath(); ctx.fill();

        ctx.globalCompositeOperation = 'lighter';                  // specular
        ctx.globalAlpha *= .55; ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-S * .32, -S * .42, S * .10, S * .18, -.5, 0, 6.284); ctx.fill();
        ctx.globalAlpha *= .5;                                     // rim light
        ctx.beginPath(); ctx.ellipse(S * .40, S * .18, S * .1, S * .3, .35, 0, 6.284); ctx.fill();
        ctx.restore();

      } else if (p.kind === 'bubble') {
        p.phase += p.sway; p.swirl += p.spin;
        p.x += p.vx + Math.sin(p.phase) * (.6 + p.z);
        p.y += p.vy;
        if (p.y < -p.size * 2) { parts.splice(i, 1); continue; }
        const S2 = p.size, al = Math.min(1, a * 2.4) * (.55 + p.z * .45);
        ctx.globalCompositeOperation = 'source-over';

        /* smoke churning inside the film */
        ctx.globalAlpha = al * .85;
        /* real smoke bubbles hold dense milky smoke that churns — three lobes
           counter-rotating inside the film, fading to nothing at the edge so
           the rim stays glassy */
        for (let li = 0; li < 3; li++) {
          const a2 = p.swirl * (li % 2 ? -1.3 : 1) + li * 2.09;
          const ox = Math.cos(a2) * S2 * .24, oy = Math.sin(a2) * S2 * .2;
          blit(softSprite('[[0,"rgba(242,242,246,.66)"],[0.5,"rgba(200,200,210,.28)"],[1,"rgba(150,150,160,0)"]]', 0),
               p.x + ox, p.y + oy, S2 * (.48 + li * .17), al * .62, 0, 1);
        }

        /* iridescent film over the top */
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = al;
        blit(softSprite('[[0,"rgba(255,255,255,.34)"],[0.55,"rgba(' + p.hueA + ',.2)"],'
                      + '[0.85,"rgba(' + p.hueB + ',.3)"],[1,"rgba(255,255,255,.55)"]]', 0),
             p.x, p.y, S2, al, 0, 1);

        ctx.globalAlpha = al * .75;                                // rim
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(.7, S2 * .022);
        ctx.beginPath(); ctx.arc(p.x, p.y, S2 * .97, 0, 6.284); ctx.stroke();
        ctx.globalAlpha = al;                                      // specular
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(p.x - S2 * .34, p.y - S2 * .36, S2 * .14, S2 * .09, -.6, 0, 6.284); ctx.fill();
      }
    }

    /* one stroke() per colour/width/alpha bucket instead of per particle */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    batch.forEach(seg => {
      ctx.strokeStyle = seg.col; ctx.lineWidth = seg.w; ctx.globalAlpha = seg.a;
      ctx.beginPath();
      const q = seg.pts;
      for (let k = 0; k < q.length; k += 4) { ctx.moveTo(q[k], q[k + 1]); ctx.lineTo(q[k + 2], q[k + 3]); }
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* ---- bloom pass ---- */
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, bloom.width, bloom.height);
    bctx.drawImage(cvs, 0, 0, bloom.width, bloom.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(8px)';
    ctx.globalAlpha = .42;
    ctx.drawImage(bloom, 0, 0, W, H);
    ctx.restore();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const alive = parts.length || shells.length || flashes.length || shocks.length;
    if (running && (t < stopAt || alive)) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false; current = null;
      parts = []; shells = []; flashes = []; glows = []; shocks = [];
      SFX.end();
      ctx.clearRect(0, 0, W, H);
    }
  }

  /* ----------------------------------------------------------------- public */
  function play(id) {
    if (!EFFECTS.some(e => e.id === id)) return;
    size();
    current = id;
    parts = []; shells = []; flashes = []; glows = []; shocks = []; rateAcc = {};
    const now = performance.now();
    const spec = EFFECTS.find(e => e.id === id);
    const ms = spec.ms || PLAY_MS;
    startedAt = now;
    SFX.begin(id, ms);
    emitUntil = now + ms;
    stopAt    = now + ms + 2600;
    if (id === 'fireworks') {
      /* A shell needs ~2s to reach apex, which reads as "nothing happened".
         Detonate one immediately at height, then let real shells follow. */
      burst({ x: rnd(W * .3, W * .7), y: rnd(H * .22, H * .38), color: pick(PAL.fireworks) });
      /* open across the full width immediately — no dead first second */
      [.18, .5, .82].forEach((fx, i) => setTimeout(() => {
        if (current !== 'fireworks') return;
        burst({ x: W * fx + rnd(-40, 40), y: rnd(H * .16, H * .36),
                color: pick(PAL.fireworks), type: pick(BREAKS), big: i === 1 });
      }, i * 110));
      [260, 620, 1050, 1500].forEach(ms => setTimeout(() => {
        if (current === 'fireworks')
          burst({ x: rnd(W * .1, W * .9), y: rnd(H * .12, H * .42),
                  color: pick(PAL.fireworks), type: pick(BREAKS), big: Math.random() < .4 });
      }, ms));
      launchShell(); launchShell(); setTimeout(launchShell, 260);
    }
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }

  /* --------------------------------------------------------------- picker UI */
  const openBtn = document.createElement('button');
  openBtn.id = 'sx-open'; openBtn.type = 'button';
  openBtn.innerHTML = '<span class="dot"></span> Try effects';
  openBtn.setAttribute('aria-haspopup', 'dialog');

  const picker = document.createElement('div');
  picker.id = 'sx-picker'; picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-modal', 'true'); picker.setAttribute('aria-label', 'Try an effect');
  picker.innerHTML = `
    <div class="sx-panel">
      <div class="sx-head">
        <div>
          <h3>Try an effect</h3>
          <p>Pick one and it plays across the whole screen — the same cues we fire on the night.
            <span style="opacity:.45;font-size:10px;letter-spacing:.12em"> · FX v2.4</span></p>
        </div>
        <div style="display:flex;align-items:center;flex:0 0 auto">
          <button class="sx-sound" type="button" aria-pressed="true"
                  aria-label="Toggle sound">🔊 Sound</button>
          <button class="sx-close" type="button" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="sx-grid">
        ${EFFECTS.map(e => `
          <button class="sx-chip" type="button" data-fx="${e.id}">
            <span class="sw" style="background:${e.accent}"></span>
            <b>${e.label}</b><span>${e.cue}</span>
          </button>`).join('')}
      </div>
    </div>`;

  document.body.append(openBtn, picker);

  const soundBtn = picker.querySelector('.sx-sound');
  soundBtn.addEventListener('click', () => {
    const on = SFX.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? '🔊 Sound' : '🔇 Muted';
  });

  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    picker.classList.add('on');
    picker.querySelector('.sx-chip').focus();
  }
  function close() {
    picker.classList.remove('on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  openBtn.addEventListener('click', open);
  picker.querySelector('.sx-close').addEventListener('click', close);
  picker.addEventListener('click', e => { if (e.target === picker) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && picker.classList.contains('on')) close(); });
  picker.addEventListener('click', e => {
    const chip = e.target.closest('.sx-chip');
    if (!chip) return;
    close();
    play(chip.dataset.fx);
  });

  window.SXEffects = { play, open, close, list: () => EFFECTS.map(e => e.id) };
})();
