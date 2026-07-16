/* ==========================================================
   TRIVELA — Cinematic Background & Motion Engine (vanilla)
   ========================================================== */
(function () {
  if (window.__TRIVELA_FX_LOADED__) return;
  window.__TRIVELA_FX_LOADED__ = true;

  const CARDS = [
    // Left side (2 cards)
    { rating: 92, pos: 'ST',  name: 'TRIVELA', ver: 'HERO',   cls: 'indigo',  icon: 'fa-futbol',  slot: 'slot-l1' },
    { rating: 91, pos: 'LW',  name: 'RARE',    ver: 'GOLD',   cls: 'emerald', icon: 'fa-bolt',    slot: 'slot-l2' },
    // Right side (2 cards)
    { rating: 95, pos: 'CAM', name: 'ICON',    ver: 'PRIME',  cls: 'teal',    icon: 'fa-trophy',  slot: 'slot-r1' },
    { rating: 93, pos: 'ST',  name: 'ELITE',   ver: 'CHAMP',  cls: 'gold',    icon: 'fa-crown',   slot: 'slot-r2' },
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
    `;

    CARDS.forEach(c => {
      const card = document.createElement('div');
      card.className = `fifa-card ${c.cls} ${c.slot}`;
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

    // Parallax on scroll — subtle, side-only cards drift slightly
    const cards = scene.querySelectorAll('.fifa-card');
    const rings = scene.querySelectorAll('.fifa-ring');
    let latestY = 0, ticking = false;
    window.addEventListener('scroll', () => {
      latestY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(() => {
          cards.forEach((c, i) => {
            const dir = c.classList.contains('slot-l1') ||
                        c.classList.contains('slot-l2') ||
                        c.classList.contains('slot-l3') ||
                        c.classList.contains('slot-l4') ? -1 : 1;
            const speed = dir * (0.02 + (i % 4) * 0.008);
            c.style.translate = `0 ${(latestY * speed).toFixed(1)}px`;
          });
          rings.forEach((r, i) => {
            const speed = (i % 2 === 0 ? 0.04 : -0.035);
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

  // ---------- 4. Add Floating Scroll-to-Top Button ----------
  function addScrollToTopButton() {
    if (document.getElementById('scroll-to-top')) return;

    const btn = document.createElement('button');
    btn.id = 'scroll-to-top';
    btn.className = 'scroll-to-top-btn';
    btn.setAttribute('aria-label', 'العودة للأعلى');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ---------- 5. Boot ----------
  function boot() {
    // Skip admin & maintenance pages
    const p = location.pathname.toLowerCase();
    if (p.includes('/admin') || p.endsWith('admin.html') ||
        p.endsWith('admin-mobile.html') || p.endsWith('maintenance.html')) return;

    buildScene();
    splitHeroTitles();
    initReveals();
    addScrollToTopButton();

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
