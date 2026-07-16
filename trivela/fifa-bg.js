/* ==========================================================
   TRIVELA — Cinematic Background & Motion Engine (vanilla)
   ========================================================== */
(function () {
  if (window.__TRIVELA_FX_LOADED__) return;
  window.__TRIVELA_FX_LOADED__ = true;

  const CARDS = [
    { rating: 92, pos: 'ST',  name: 'TRIVELA', ver: 'HERO',   cls: 'gold', icon: 'fa-futbol' },
    { rating: 95, pos: 'CAM', name: 'ICON',    ver: 'PRIME',  cls: 'icon', icon: 'fa-trophy' },
    { rating: 94, pos: 'GK',  name: 'TOTS',    ver: 'BEST',   cls: 'tots', icon: 'fa-shield-halved' },
    { rating: 91, pos: 'LW',  name: 'RARE',    ver: 'GOLD',   cls: 'rare', icon: 'fa-bolt' },
    { rating: 90, pos: 'CB',  name: 'TOTT',    ver: 'WEEK',   cls: 'tott', icon: 'fa-medal' },
    { rating: 89, pos: 'RW',  name: 'FUT27',   ver: 'RARE',   cls: 'gold', icon: 'fa-star' },
    { rating: 88, pos: 'CM',  name: 'SBC',     ver: 'CHAL',   cls: 'tots', icon: 'fa-crosshairs' },
    { rating: 93, pos: 'ST',  name: 'ELITE',   ver: 'CHAMP',  cls: 'icon', icon: 'fa-crown' },
  ];

  // ---------- 1. Build the scene ----------
  function buildScene() {
    if (document.querySelector('.fifa-scene')) return;

    const scene = document.createElement('div');
    scene.className = 'fifa-scene';
    scene.setAttribute('aria-hidden', 'true');

    scene.innerHTML = `
      <div class="fifa-pitch"></div>
      <div class="fifa-glow"></div>
      <div class="fifa-ring big r1"></div>
      <div class="fifa-ring med r2"></div>
      <div class="fifa-ring small r3"></div>
      <div class="fifa-ring med r4"></div>
      <div class="fifa-ring big r5"></div>
    `;

    CARDS.forEach(c => {
      const card = document.createElement('div');
      card.className = `fifa-card ${c.cls}`;
      card.innerHTML = `
        <div class="rating">${c.rating}</div>
        <div class="pos">${c.pos}</div>
        <div class="icon"><i class="fas ${c.icon}"></i></div>
        <div class="name">${c.name}</div>
        <div class="ver">${c.ver}</div>
      `;
      scene.appendChild(card);
    });

    document.body.insertBefore(scene, document.body.firstChild);

    // Spotlight orb that follows cursor
    if (window.matchMedia('(hover:hover)').matches) {
      const spot = document.createElement('div');
      spot.className = 'fifa-spotlight';
      document.body.appendChild(spot);
      let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
      let cx = tx, cy = ty;
      window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
      (function tick() {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        spot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
      })();
    }

    // Parallax on scroll
    const cards = scene.querySelectorAll('.fifa-card');
    const rings = scene.querySelectorAll('.fifa-ring');
    let latestY = 0, ticking = false;
    window.addEventListener('scroll', () => {
      latestY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(() => {
          cards.forEach((c, i) => {
            const speed = (i % 2 === 0 ? -1 : 1) * (0.04 + i * 0.008);
            c.style.setProperty('--py', (latestY * speed).toFixed(1) + 'px');
            c.style.translate = `0 ${(latestY * speed).toFixed(1)}px`;
          });
          rings.forEach((r, i) => {
            const speed = (i % 2 === 0 ? 0.06 : -0.05);
            r.style.translate = `0 ${(latestY * speed).toFixed(1)}px`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ---------- 2. Scroll reveal ----------
  function initReveals() {
    // Auto-tag common blocks if not already tagged
    const autoSelectors = [
      'section', 'h1', 'h2', 'h3',
      '.srv-card', '.service-card', '.bento-card', '.feature-card',
      '.platform-card', '.pkg-card', '.obj-card', '.coin-package',
      '.hero-title', '.hero-subtitle', '.stat', '.hero-stat',
      '.step', '.step-card', '.faq-item', '.review-card',
      '.hero-cta', '.cta-primary', '.section-title'
    ];
    autoSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.hasAttribute('data-reveal') && !el.closest('.fifa-scene')) {
          el.setAttribute('data-reveal', 'up');
        }
      });
    });

    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.revealDelay || '0', 10);
          setTimeout(() => el.classList.add('is-visible'),
            delay || Math.min(i * 60, 240));
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }

  // ---------- 3. Hero title word-by-word rise ----------
  function splitHeroTitles() {
    const targets = document.querySelectorAll(
      'h1, .hero-title, .page-title, .hero h2, [data-split-text]'
    );
    targets.forEach(el => {
      if (el.dataset.splitDone) return;
      // Skip elements that contain nested HTML we shouldn't destroy
      if (el.querySelector('img, svg, i, button, a, input')) return;
      const text = el.textContent.trim();
      if (!text || text.length > 120) return;
      const words = text.split(/(\s+)/);
      el.innerHTML = words.map((w, i) => {
        if (/^\s+$/.test(w)) return w;
        const delay = (i * 0.08).toFixed(2);
        return `<span class="split-word"><span style="animation-delay:${delay}s">${w}</span></span>`;
      }).join('');
      el.dataset.splitDone = '1';
    });
  }

  // ---------- 4. Boot ----------
  function boot() {
    // Skip admin & maintenance pages
    const p = location.pathname.toLowerCase();
    if (p.includes('/admin') || p.endsWith('admin.html') ||
        p.endsWith('admin-mobile.html') || p.endsWith('maintenance.html')) return;

    buildScene();
    splitHeroTitles();
    initReveals();

    // Re-scan after dynamic content mounts (landing UI lazy loads)
    let scans = 0;
    const rescan = () => {
      initReveals();
      if (++scans < 6) setTimeout(rescan, 700);
    };
    setTimeout(rescan, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
