/* Shared page behaviour. Deliberately small and dependency-free — it only does
   what CSS can't: scroll position, viewport entry, and counting.

   Everything here is progressive. The `js` class is what arms the reveal
   styles, so with JS off the content is simply visible rather than blank. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ---- nav: solid once you leave the top, plus a scroll-progress bar ---- */
  const nav = document.querySelector('nav');
  const prog = document.getElementById('prog');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (nav) nav.classList.toggle('solid', y > 24);
      if (prog) {
        const max = document.documentElement.scrollHeight - innerHeight;
        prog.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- reveal on entry, with a stagger between siblings ---- */
  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const sibs = [...(e.target.parentElement ? e.target.parentElement.children : [])]
          .filter(n => n.classList && n.classList.contains('reveal'));
        const i = Math.max(0, sibs.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---- count-up for stat blocks, once they're on screen ---- */
  const stats = [...document.querySelectorAll('[data-count]')];
  if ('IntersectionObserver' in window && stats.length) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1100, t0 = performance.now();
        (function tick(now) {
          const k = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);          // ease-out cubic
          el.textContent = Math.round(target * eased).toLocaleString('en-IN') + suffix;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
        io2.unobserve(el);
      });
    }, { threshold: .5 });
    stats.forEach(el => io2.observe(el));
  }

  /* ---- hover-to-play on card video, so the grid isn't 12 clips at once ---- */
  document.querySelectorAll('.card .media video').forEach(v => {
    v.muted = true; v.loop = true; v.playsInline = true;
    const card = v.closest('.card');
    if (!card) return;
    card.addEventListener('mouseenter', () => { v.play().catch(() => {}); });
    card.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
  });

  /* ---- mark the current page in the nav ---- */
  const here = location.pathname.replace(/\/$/, '').split('/').pop() || 'index.html';
  document.querySelectorAll('.nl a[href]').forEach(a => {
    const target = a.getAttribute('href').split('#')[0].replace(/^\.\//, '');
    if (target && (target === here || (here === 'index.html' && target === 'index.html'))) {
      a.classList.add('here');
    }
  });
  /* ---- mobile menu ---------------------------------------------------- */
  const navBtn = document.querySelector('.navbtn');
  const menu = document.getElementById('menu');
  if (navBtn && menu) {
    const setOpen = (open) => {
      menu.classList.toggle('on', open);
      navBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('locked', open);
    };
    navBtn.addEventListener('click', () => setOpen(menu.className.indexOf('on') === -1));
    menu.addEventListener('click', e => { if (e.target.tagName === 'A') setOpen(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    /* a resize past the breakpoint must not leave the page scroll-locked */
    addEventListener('resize', () => { if (innerWidth > 940) setOpen(false); });
  }

  /* ---- hero parallax: copy drifts up and fades as it leaves ------------ */
  const para = document.querySelectorAll('.parallax');
  if (para.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let pTick = false;
    const runPara = () => {
      if (pTick) return;
      pTick = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        para.forEach(el => {
          const speed = parseFloat(el.dataset.speed || '.18');
          el.style.transform = 'translate3d(0,' + (y * speed).toFixed(1) + 'px,0)';
          const fade = parseFloat(el.dataset.fade || '0');
          if (fade) el.style.opacity = String(Math.max(0, 1 - (y / (innerHeight * fade))));
        });
        pTick = false;
      });
    };
    addEventListener('scroll', runPara, { passive: true });
    runPara();
  }

  /* ---- slide + line-draw share the reveal observer's behaviour --------- */
  const motion = [...document.querySelectorAll('.slide,.drawline')];
  if ('IntersectionObserver' in window && motion.length) {
    const io3 = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io3.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .1 });
    motion.forEach(el => io3.observe(el));
  } else {
    motion.forEach(el => el.classList.add('in'));
  }

})();
