// Dynamic In-Site Ad & Marketing Client Loader for Trivela Store
// Designed for absolute conversion rate optimization (CRO) and premium aesthetics

function loadMarketingOnPage() {
  fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data && data.settings) {
        initMarketingFeatures(data.settings, data.reviews || []);
      }
    })
    .catch(err => console.warn("Failed to load marketing content:", err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMarketingOnPage);
} else {
  loadMarketingOnPage();
}

function initMarketingFeatures(settings, reviews) {
  const m = settings.marketing || {};

  // Inject general styles needed for marketing popups
  injectMarketingStyles();

  // 1. Exit Intent Popup
  if (m.exitIntent && m.exitIntent.active) {
    initExitIntent(m.exitIntent);
  }

  // 2. Sticky CTA Bottom Bar
  if (m.stickyCta && m.stickyCta.active) {
    initStickyCta(m.stickyCta);
  }

  // 3. Flash Deals (Urgency Card)
  if (m.flashDeals && m.flashDeals.active) {
    initFlashDeals(m.flashDeals);
  }

  // 4. Scratch & Win Interactive Card
  if (m.scratchCard && m.scratchCard.active) {
    initScratchCard(m.scratchCard);
  }

  // 5. Live Activity Pulse (Visitor counter)
  if (m.livePulse && m.livePulse.active) {
    initLivePulse(m.livePulse);
  }

  // 6. Animated Trust Ticker (Reviews Carousel)
  if (m.trustTicker && m.trustTicker.active) {
    initTrustTicker(m.trustTicker, reviews);
  }

  // 7. Smart Welcome Back
  if (m.welcomeBack && m.welcomeBack.active) {
    initWelcomeBack(m.welcomeBack);
  }

  // 8. Abandoned Order Recovery
  if (m.abandonedOrder && m.abandonedOrder.active) {
    initAbandonedOrder(m.abandonedOrder);
  }

  // 9. Post-Purchase Reward Popup
  if (m.postPurchase && m.postPurchase.active) {
    initPostPurchase(m.postPurchase);
  }
}

// Helper to inject beautiful CSS animations and variables dynamically
function injectMarketingStyles() {
  if (document.getElementById('trivela-marketing-styles')) return;

  const style = document.createElement('style');
  style.id = 'trivela-marketing-styles';
  style.innerHTML = `
    /* Exit Intent & General Modals */
    .trivela-modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(13, 30, 57, 0.65); backdrop-filter: blur(8px);
      z-index: 100000; display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.4s ease; direction: rtl;
    }
    .trivela-modal-card {
      background: #121b2d; border: 2px solid rgba(234, 179, 8, 0.25);
      box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(234,179,8,0.15);
      border-radius: 24px; padding: 30px; max-width: 450px; width: 90%;
      text-align: center; color: white; transform: scale(0.85); transition: transform 0.4s ease;
      position: relative;
    }
    .trivela-modal-overlay.active { opacity: 1; }
    .trivela-modal-overlay.active .trivela-modal-card { transform: scale(1); }
    .trivela-modal-close {
      position: absolute; top: 15px; left: 15px; font-size: 1.5rem;
      color: #94a3b8; cursor: pointer; transition: color 0.3s;
    }
    .trivela-modal-close:hover { color: #ffffff; }

    /* Buttons */
    .trivela-mkt-btn {
      background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
      color: #0d1e39; border: 0; padding: 12px 24px; font-family: 'Cairo', sans-serif;
      font-weight: 800; border-radius: 12px; cursor: pointer; transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3); display: inline-flex; align-items: center; gap: 8px;
    }
    .trivela-mkt-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(234, 179, 8, 0.4); }

    /* Sticky CTA bottom bar */
    .trivela-sticky-bar {
      position: fixed; bottom: 0; left: 0; width: 100%; padding: 14px 24px;
      z-index: 99999; display: flex; align-items: center; justify-content: space-between;
      box-sizing: border-box; direction: rtl; font-family: 'Cairo', sans-serif;
      transition: transform 0.4s ease; transform: translateY(100%);
    }
    .trivela-sticky-bar.active { transform: translateY(0); }
    .trivela-sticky-bar.gold-pulse {
      background: linear-gradient(90deg, #182a47 0%, #0d1e39 100%);
      border-top: 3px solid #eab308;
      box-shadow: 0 -4px 25px rgba(234, 179, 8, 0.15);
    }
    .trivela-sticky-bar.neon-glow {
      background: linear-gradient(90deg, #0d1e39 0%, #121b2d 100%);
      border-top: 3px solid #10b981;
      box-shadow: 0 -4px 25px rgba(16, 185, 129, 0.15);
    }
    .trivela-sticky-bar.dark-vip {
      background: linear-gradient(90deg, #050b14 0%, #0d1e39 100%);
      border-top: 3px solid #94a3b8;
      box-shadow: 0 -4px 25px rgba(0,0,0,0.5);
    }

    /* Live Activity Pulse */
    .trivela-pulse-bubble {
      position: fixed; bottom: 20px; z-index: 99998;
      background: #121b2d; border: 1.5px solid rgba(48, 83, 136, 0.3);
      padding: 10px 16px; border-radius: 50px; display: flex; align-items: center; gap: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: 'Cairo', sans-serif; font-size: 0.82rem;
      color: white; transform: translateY(150px); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .trivela-pulse-bubble.active { transform: translateY(0); }
    .trivela-pulse-indicator {
      width: 10px; height: 10px; background: #10b981; border-radius: 50%;
      animation: pulse-ring 1.8s infinite ease-in-out;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* Trust Ticker (Marquee) */
    .trivela-ticker-wrap {
      width: 100%; overflow: hidden; background: #121b2d; border-top: 1.5px solid var(--blue-100);
      border-bottom: 1.5px solid var(--blue-100); padding: 12px 0; direction: ltr;
    }
    .trivela-ticker-track {
      display: flex; gap: 30px; width: max-content;
      animation: ticker-slide var(--duration, 25s) linear infinite;
    }
    .trivela-ticker-item {
      display: flex; align-items: center; gap: 8px; color: #94a3b8; font-family: 'Cairo', sans-serif;
      font-size: 0.82rem; white-space: nowrap; direction: rtl;
    }
    @keyframes ticker-slide {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(-50%, 0, 0); }
    }

    /* Flash deals urgency */
    .trivela-flash-card {
      position: fixed; bottom: 85px; right: 20px; z-index: 99997;
      background: #121b2d; border: 2px solid #ef4444; border-radius: 20px;
      padding: 16px; width: 280px; color: white; direction: rtl; font-family: 'Cairo', sans-serif;
      box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);
      transform: translateX(350px); transition: transform 0.5s ease;
    }
    .trivela-flash-card.active { transform: translateX(0); }
    .trivela-flash-progress {
      height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin: 10px 0;
    }
    .trivela-flash-progress-bar {
      height: 100%; background: #ef4444; border-radius: 4px; transition: width 0.5s ease;
    }
  `;
  document.head.appendChild(style);
}

// 1. Exit Intent Popup
function initExitIntent(config) {
  if (sessionStorage.getItem('trivela_exit_shown')) return;

  document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 20) {
      if (sessionStorage.getItem('trivela_exit_shown')) return;
      sessionStorage.setItem('trivela_exit_shown', 'true');

      const overlay = document.createElement('div');
      overlay.className = 'trivela-modal-overlay';
      overlay.innerHTML = `
        <div class="trivela-modal-card">
          <span class="trivela-modal-close">&times;</span>
          <div style="font-size: 3rem; margin-bottom: 15px;">🎁</div>
          <h3 style="margin: 0 0 10px 0; font-family: Cairo; font-weight: 900; font-size: 1.4rem; color: #eab308;">${config.title}</h3>
          <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 0.9rem; line-height: 1.5;">${config.desc}</p>
          <div style="background: rgba(234, 179, 8, 0.1); border: 2.5px dashed #eab308; border-radius: 12px; padding: 12px; font-family: Montserrat; font-weight: 900; font-size: 1.6rem; color: #eab308; letter-spacing: 2px; margin-bottom: 20px; cursor: pointer;" id="exitIntentCouponBtn">
            ${config.coupon}
          </div>
          <button class="trivela-mkt-btn" id="exitIntentClaimBtn" style="width: 100%; justify-content: center;">
            <i class="fas fa-shopping-basket"></i> تفعيل العرض والشراء
          </button>
        </div>
      `;
      document.body.appendChild(overlay);

      // Animation entry
      setTimeout(() => overlay.classList.add('active'), 50);

      // Close handler
      const close = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 400);
      };
      overlay.querySelector('.trivela-modal-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

      // Copy coupon code
      overlay.querySelector('#exitIntentCouponBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(config.coupon).then(() => {
          alert("📋 تم نسخ كود الخصم الحصري بنجاح!");
        });
      });

      overlay.querySelector('#exitIntentClaimBtn').addEventListener('click', () => {
        close();
        window.location.href = 'buy-coins.html';
      });
    }
  });
}

// 2. Sticky CTA Bottom Bar
function initStickyCta(config) {
  const bar = document.createElement('div');
  bar.className = `trivela-sticky-bar ${config.style}`;
  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px; color: white;">
      <span style="font-weight: 800; font-size: 0.9rem;">${config.text}</span>
      ${config.endTime ? `<div style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 6px; font-family: Montserrat; font-weight: 700; font-size: 0.85rem;" id="stickyCtaTimer">00:00:00</div>` : ''}
    </div>
    <div style="display: flex; align-items: center; gap: 15px;">
      <a href="${config.btnLink}" class="trivela-mkt-btn" style="padding: 8px 18px; font-size: 0.82rem;">
        ${config.btnText} <i class="fas fa-chevron-left"></i>
      </a>
      <span id="stickyCtaClose" style="color: #94a3b8; cursor: pointer; font-size: 1.1rem; font-weight: bold; margin-right: 5px;">&times;</span>
    </div>
  `;
  document.body.appendChild(bar);

  // Animation entry
  setTimeout(() => bar.classList.add('active'), 1000);

  // Close trigger
  bar.querySelector('#stickyCtaClose').addEventListener('click', () => {
    bar.classList.remove('active');
    setTimeout(() => bar.remove(), 400);
  });

  // Urgency countdown timer
  if (config.endTime) {
    const timerEl = bar.querySelector('#stickyCtaTimer');
    const target = new Date(config.endTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        timerEl.textContent = "انتهى العرض!";
        clearInterval(timerInterval);
        return;
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
  }
}

// 3. Flash Deals (Urgency Card)
function initFlashDeals(config) {
  const card = document.createElement('div');
  card.className = 'trivela-flash-card';
  const percentSold = Math.round((config.quantitySold / config.quantityTotal) * 100);
  const remaining = config.quantityTotal - config.quantitySold;

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px dashed rgba(239, 68, 68, 0.3); padding-bottom: 6px;">
      <strong style="color: #ef4444; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
        <i class="fas fa-bolt"></i> ${config.title}
      </strong>
      <span style="font-family: Montserrat; font-weight: 800; font-size: 0.8rem; background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px;" id="flashTimer">00:00</span>
    </div>
    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px;">${config.subtitle}</div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 0.78rem; text-decoration: line-through; color: #64748b;">${config.priceOriginal} ر.س</span>
      <span style="font-size: 1.1rem; font-weight: 900; color: #ef4444;">${config.pricePromo} ر.س</span>
    </div>
    <div class="trivela-flash-progress">
      <div class="trivela-flash-progress-bar" style="width: ${percentSold}%"></div>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 12px; color: #94a3b8;">
      <span>تم حجز: ${percentSold}%</span>
      <strong style="color: #ef4444;">المتبقي: ${remaining} فقط!</strong>
    </div>
    <a href="${config.btnLink ? config.btnLink + (config.btnLink.includes('?') ? '&' : '?') + 'flashDeal=true' : '#'}" class="trivela-mkt-btn" style="width:100%; justify-content:center; background: #ef4444; box-shadow: 0 4px 15px rgba(239,68,68,0.3); padding: 8px 16px; font-size: 0.82rem;">
      احجز العرض فوراً
    </a>
  `;
  document.body.appendChild(card);

  // Animation entry
  setTimeout(() => card.classList.add('active'), 2500);

  // Flash Countdown
  let timeRemaining = config.durationMinutes * 60;
  const timerEl = card.querySelector('#flashTimer');

  const flashInterval = setInterval(() => {
    if (timeRemaining <= 0) {
      clearInterval(flashInterval);
      card.classList.remove('active');
      setTimeout(() => card.remove(), 500);
      return;
    }
    timeRemaining--;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

// 4. Scratch & Win Interactive Card
function initScratchCard(config) {
  if (sessionStorage.getItem('trivela_scratch_played')) return;

  setTimeout(() => {
    if (sessionStorage.getItem('trivela_scratch_played')) return;
    sessionStorage.setItem('trivela_scratch_played', 'true');

    const overlay = document.createElement('div');
    overlay.className = 'trivela-modal-overlay';
    overlay.innerHTML = `
      <div class="trivela-modal-card" style="max-width: 380px;">
        <span class="trivela-modal-close">&times;</span>
        <div style="font-size: 2.2rem; margin-bottom: 10px;">🎰</div>
        <h3 style="margin: 0 0 12px 0; font-family: Cairo; font-weight: 900; font-size: 1.15rem; color: #eab308; line-height: 1.4;">${config.title}</h3>
        <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 0.8rem;">امسح الطبقة الرمادية بالماوس أو إصبعك لكشف هديتك!</p>
        
        <div style="position: relative; width: 280px; height: 130px; margin: 0 auto 15px auto; user-select: none;">
          <!-- Hidden prize card content -->
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0d1e39; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px solid rgba(234, 179, 8, 0.25); box-sizing: border-box;">
            <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 700;">جائزتك الحصرية هي:</div>
            <div style="font-size: 1.4rem; font-weight: 900; color: #10b981; margin: 5px 0;" id="scratchPrizeLabel">
              ${config.prizeType === 'points' ? `🪙 +${config.prizeValue} نقطة ولاء` : `🎟️ كود خصم: ${config.prizeValue}`}
            </div>
            <div style="font-size: 0.72rem; color: #eab308;">مبروك لك يا بطل!</div>
          </div>
          
          <!-- Scratch canvas overlay -->
          <canvas id="scratchCanvas" width="280" height="130" style="position: absolute; top: 0; left: 0; cursor: pointer; border-radius: 12px; z-index: 10; touch-action: none;"></canvas>
        </div>
        
        <button class="trivela-mkt-btn" id="scratchClaimBtn" style="width: 100%; justify-content: center; display: none;">
          استلام الجائزة واستخدامها
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Fade in
    setTimeout(() => overlay.classList.add('active'), 50);

    const canvas = overlay.querySelector('#scratchCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let scratchedAmount = 0;

    // Draw gray covering
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw card textures
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let i=0; i<canvas.width; i+=12) {
      ctx.fillRect(i, 0, 4, canvas.height);
    }
    
    ctx.font = 'bold 15px Cairo';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('احك البطاقة هنا 🏆', canvas.width/2, canvas.height/2 + 5);

    // Erasing math logic
    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      checkScratched();
    };

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    // Listeners
    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('mousemove', (e) => { if (isDrawing) { const pos = getMousePos(e); scratch(pos.x, pos.y); } });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    
    canvas.addEventListener('touchstart', (e) => { isDrawing = true; e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { if (isDrawing) { const pos = getMousePos(e); scratch(pos.x, pos.y); } e.preventDefault(); });
    canvas.addEventListener('touchend', () => isDrawing = false);

    // Calculate scratched percentage
    const checkScratched = () => {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparent = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) transparent++;
      }
      const pct = (transparent / (pixels.length / 4)) * 100;
      if (pct > 55) {
        // Automatically clear canvas
        canvas.style.transition = 'opacity 0.4s ease';
        canvas.style.opacity = '0';
        setTimeout(() => {
          canvas.remove();
          overlay.querySelector('#scratchClaimBtn').style.display = 'inline-flex';
        }, 400);
      }
    };

    // Close triggers
    const close = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    };
    overlay.querySelector('.trivela-modal-close').addEventListener('click', close);
    
    overlay.querySelector('#scratchClaimBtn').addEventListener('click', () => {
      close();
      if (config.prizeType === 'points') {
        alert("🪙 تم إضافة نقاط الولاء المجانية لرصيدك بنجاح!");
      } else {
        navigator.clipboard.writeText(config.prizeValue).then(() => {
          alert(`📋 تم نسخ الكود: ${config.prizeValue} بنجاح لاستخدامه في إتمام الطلب!`);
        });
      }
    });

  }, config.delaySeconds * 1000);
}

// 5. Live Activity Pulse (Visitor counter)
function initLivePulse(config) {
  const bubble = document.createElement('div');
  bubble.className = 'trivela-pulse-bubble';
  bubble.style[config.position === 'bottom-left' ? 'left' : 'right'] = '20px';

  bubble.innerHTML = `
    <span class="trivela-pulse-indicator"></span>
    <span id="trivelaPulseText">جاري فحص حالة النشاط...</span>
  `;
  document.body.appendChild(bubble);

  // Entry animation
  setTimeout(() => bubble.classList.add('active'), 1500);

  const randomizeText = () => {
    const visits = Math.floor(Math.random() * (config.maxVisits - config.minVisits + 1)) + config.minVisits;
    const items = [
      `👀 يتصفح الموقع حالياً ${visits} عميل`,
      `🔥 طلبات نشطة في المتجر: ${visits}`
    ];
    if (config.showOrders) {
      const orderCount = Math.floor(Math.random() * 6) + 4;
      items.push(`📦 تم إنجاز ${orderCount} طلبات بنجاح في آخر ساعة!`);
    }

    const selected = items[Math.floor(Math.random() * items.length)];
    bubble.querySelector('#trivelaPulseText').textContent = selected;
  };

  randomizeText();
  setInterval(randomizeText, 25000); // Shift message every 25 seconds
}

// 6. Animated Trust Ticker (Reviews Carousel)
function initTrustTicker(config, reviews) {
  if (!reviews || reviews.length === 0) return;

  const wrap = document.createElement('div');
  wrap.className = 'trivela-ticker-wrap';
  
  // Clone reviews to guarantee infinite loop display
  const trackItems = [...reviews, ...reviews, ...reviews];
  
  const tickerHtml = trackItems.map(r => `
    <div class="trivela-ticker-item">
      <span style="color: #eab308; font-weight:bold;">★ ${r.rating || 5}</span>
      <span style="color: white; font-weight:700;">${r.customerName || "عميل موثق"}:</span>
      <span style="color: #94a3b8;">"${r.comment || "شحن سريع وممتاز"}"</span>
      <span style="color: #305388; font-size:0.72rem; font-weight:700; background:rgba(48,83,136,0.1); padding:2px 6px; border-radius:4px;">${r.serviceName || "شحن كوينز"}</span>
    </div>
  `).join('<div style="color: rgba(234,179,8,0.2); font-weight:900;">•</div>');

  wrap.innerHTML = `
    <div class="trivela-ticker-track" style="--duration: ${config.speed === 'fast' ? '15s' : config.speed === 'slow' ? '45s' : '28s'}">
      ${tickerHtml}
    </div>
  `;

  // Inject target position
  if (config.position === 'home-only') {
    // Only inject on landing page (index.html)
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '') {
      const catalogSection = document.getElementById('catalog-section') || document.querySelector('main');
      if (catalogSection) {
        catalogSection.parentNode.insertBefore(wrap, catalogSection);
      }
    }
  } else {
    // Insert globally at the top of footer on all pages
    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(wrap, footer);
    } else {
      document.body.appendChild(wrap);
    }
  }
}

// 7. Smart Welcome Back
function initWelcomeBack(config) {
  const token = localStorage.getItem('trivela_token');
  if (!token) return;

  // Attempt to read user email/phone from token storage or profiles
  let userName = localStorage.getItem('trivela_username') || "بطل تريفيلا";
  
  // Create welcome top alert bar
  const bar = document.createElement('div');
  bar.style.cssText = `
    background: linear-gradient(90deg, #121b2d 0%, #1e2a47 100%);
    border-bottom: 2px solid #eab308;
    color: white; padding: 10px 20px; font-family: 'Cairo', sans-serif;
    font-size: 0.8rem; text-align: center; direction: rtl; z-index: 99990;
    position: relative; display: flex; align-items: center; justify-content: center; gap: 10px;
  `;
  bar.innerHTML = `
    <span>👋 أهلاً بعودتك يا <strong>${userName}</strong>! ${config.promoText}</span>
    <button onclick="this.parentNode.remove()" style="background:none; border:0; color:#94a3b8; font-size:1.1rem; cursor:pointer; font-weight:bold;">&times;</button>
  `;
  
  // Append as first child of body to appear as top banner
  document.body.insertBefore(bar, document.body.firstChild);
}

// 8. Abandoned Order Recovery
function initAbandonedOrder(config) {
  // Check if form is partially filled but left in localStorage
  const savedData = localStorage.getItem('trivela_abandoned_order');
  if (!savedData) return;

  // Parse details
  try {
    const data = JSON.parse(savedData);
    // Don't show if older than 48 hours
    if (new Date().getTime() - data.timestamp > 48 * 60 * 60 * 1000) {
      localStorage.removeItem('trivela_abandoned_order');
      return;
    }

    if (sessionStorage.getItem('trivela_abandoned_prompted')) return;
    sessionStorage.setItem('trivela_abandoned_prompted', 'true');

    // Prompt user
    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.className = 'trivela-modal-overlay';
      overlay.innerHTML = `
        <div class="trivela-modal-card">
          <span class="trivela-modal-close">&times;</span>
          <div style="font-size: 3rem; margin-bottom: 15px;">🛒</div>
          <h3 style="margin: 0 0 10px 0; font-family: Cairo; font-weight: 900; font-size: 1.2rem; color: #eab308;">طلبك بانتظارك!</h3>
          <p style="margin: 0 0 15px 0; color: #e5e7eb; font-size: 0.88rem; line-height: 1.5;">${config.promoText}</p>
          <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px; text-align: right; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.82rem; color:#94a3b8;"><strong style="color:white;">الخدمة:</strong> ${data.service}</div>
            <div style="font-size:0.82rem; color:#94a3b8; margin-top: 5px;"><strong style="color:white;">المنصة:</strong> ${data.platform}</div>
          </div>
          <button class="trivela-mkt-btn" id="abandonedResumeBtn" style="width: 100%; justify-content: center;">
            إكمال طلبي الآن
          </button>
        </div>
      `;
      document.body.appendChild(overlay);
      setTimeout(() => overlay.classList.add('active'), 50);

      const close = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 400);
      };
      overlay.querySelector('.trivela-modal-close').addEventListener('click', close);
      overlay.querySelector('#abandonedResumeBtn').addEventListener('click', () => {
        close();
        window.location.href = data.url;
      });
    }, 4000);

  } catch(e) {
    localStorage.removeItem('trivela_abandoned_order');
  }
}

// 9. Post-Purchase Reward Popup
function initPostPurchase(config) {
  // Check if current URL contains success / post purchase signal
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('checkout_success') === 'true') {
    // Prevent double popup triggers
    if (sessionStorage.getItem('trivela_purchase_popup_shown')) return;
    sessionStorage.setItem('trivela_purchase_popup_shown', 'true');

    const overlay = document.createElement('div');
    overlay.className = 'trivela-modal-overlay';
    overlay.innerHTML = `
      <div class="trivela-modal-card">
        <span class="trivela-modal-close">&times;</span>
        <div style="font-size: 3rem; margin-bottom: 15px;">🎉</div>
        <h3 style="margin: 0 0 10px 0; font-family: Cairo; font-weight: 900; font-size: 1.4rem; color: #10b981;">طلبك تم تسجيله بنجاح!</h3>
        <p style="margin: 0 0 20px 0; color: #e5e7eb; font-size: 0.88rem; line-height: 1.6;">كهدية وتقديراً لثقتك بنا، تم إضافة المكافأة التالية لحسابك تلقائياً:</p>
        
        <div style="background: rgba(16, 185, 129, 0.05); border: 1.5px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: right; box-sizing: border-box;">
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#e5e7eb; margin-bottom: 8px;">
            <i class="fas fa-coins" style="color:#eab308;"></i>
            <span>+${config.bonusPoints} نقاط ولاء ترحيبية إضافية</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:#e5e7eb; margin-bottom: 8px;">
            <i class="fas fa-ticket" style="color:#10b981;"></i>
            <span>كود خصم 10% لطلبك القادم: <strong style="color:#10b981; font-family: Montserrat;">${config.couponCode}</strong> (صالح لـ ${config.couponExpiryDays} أيام)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#94a3b8;">
            <i class="fas fa-user-plus" style="color:#eab308;"></i>
            <span>رابط الإحالة الخاص بك جاهز بملفك الشخصي لدعوة أصدقائك!</span>
          </div>
        </div>

        <button class="trivela-mkt-btn" id="postPurchaseConfirmBtn" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
          رائع، شكراً لكم!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 50);

    const close = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    };
    overlay.querySelector('.trivela-modal-close').addEventListener('click', close);
    overlay.querySelector('#postPurchaseConfirmBtn').addEventListener('click', close);
  }
}
