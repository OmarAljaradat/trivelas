(function() {
  const savedCurrency = localStorage.getItem('trivela_currency') || 'SAR';
  
  const CURRENCIES = {
    SAR: { symbol: 'ر.س', rate: 3.75, dec: 2 },
    USD: { symbol: '$', rate: 1, dec: 2 },
    AED: { symbol: 'د.إ', rate: 3.67, dec: 2 },
    KWD: { symbol: 'د.ك', rate: 0.307, dec: 3 },
    BHD: { symbol: 'د.ب', rate: 0.376, dec: 3 },
    QAR: { symbol: 'ر.ق', rate: 3.64, dec: 2 },
    OMR: { symbol: 'ر.ع', rate: 0.385, dec: 3 },
    JOD: { symbol: 'د.أ', rate: 0.709, dec: 3 },
    EGP: { symbol: 'ج.م', rate: 49.5, dec: 1 }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('currencySelect');
    if (select) {
      select.value = savedCurrency;
      select.addEventListener('change', (e) => {
        localStorage.setItem('trivela_currency', e.target.value);
        if (typeof updatePriceAndSummary === 'function') {
          updatePriceAndSummary();
        }
        if (typeof renderCatalogGrid === 'function') {
          renderCatalogGrid();
        }
      });
    }
  });

  // Check and initialize Flash Deals if query parameter is set
  const urlParams = new URLSearchParams(window.location.search);
  const isFlashDeal = urlParams.get('flashDeal') === 'true';
  window.activeFlashDeal = null;

  if (isFlashDeal) {
    fetch('/api/public/content')
      .then(res => res.json())
      .then(data => {
        if (data && data.settings && data.settings.marketing && data.settings.marketing.flashDeals) {
          const flash = data.settings.marketing.flashDeals;
          if (flash.active) {
            window.activeFlashDeal = flash;
            renderFlashDealBanner(flash);
            setupFlashPriceOverride();
          }
        }
      })
      .catch(err => console.warn("Failed to load flash deal configuration:", err));
  }

  function renderFlashDealBanner(flash) {
    const target = document.getElementById('purchaseForm') || document.querySelector('.buy-card') || document.querySelector('.buy-main-container');
    if (!target) return;
    if (document.getElementById('trivelaFlashBanner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'trivelaFlashBanner';
    banner.style.cssText = `
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      color: white;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-family: Cairo, sans-serif;
      font-weight: 700;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 15px rgba(239,68,68,0.25);
      border: 1px solid rgba(255,255,255,0.1);
      direction: rtl;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-bolt fa-bounce" style="color: #f59e0b; font-size: 1.15rem;"></i>
        <span>عرض البرق الخاطف نشط: <strong>${flash.title}</strong> - خصم خاص تم تطبيقه تلقائياً!</span>
      </div>
      <div style="font-family: Montserrat; font-weight: 800; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 6px;">
        سعر العرض: ${flash.pricePromo} ر.س
      </div>
    `;
    target.parentNode.insertBefore(banner, target);
  }

  function applyFlashDealSelections() {
    const flash = window.activeFlashDeal;
    if (!flash) return;

    const path = window.location.pathname;

    // 1. Coins Page
    if (path.includes('buy-coins.html')) {
      let coinsAmount = 0;
      const titleClean = flash.title.toLowerCase();
      const numMatch = titleClean.match(/[\d\.]+/);
      if (numMatch) {
        const num = parseFloat(numMatch[0]);
        if (titleClean.includes('مليون') || titleClean.includes('million') || titleClean.includes('m')) {
          coinsAmount = num * 1000000;
        } else if (titleClean.includes('ألف') || titleClean.includes('k') || titleClean.includes('thousand')) {
          coinsAmount = num * 1000;
        } else {
          coinsAmount = num;
        }
      }

      if (coinsAmount > 0) {
        const slider = document.getElementById('coinsRange');
        const input = document.getElementById('coinsInput');
        if (slider) {
          slider.value = coinsAmount;
          slider.disabled = true;
          slider.style.opacity = '0.7';
          slider.style.pointerEvents = 'none';
        }
        if (input) {
          input.value = new Intl.NumberFormat('en-US').format(coinsAmount);
          input.disabled = true;
          input.style.opacity = '0.7';
          input.style.pointerEvents = 'none';
        }
        if (typeof window.currentCoins !== 'undefined') {
          window.currentCoins = coinsAmount;
        }
        
        document.querySelectorAll('.qa-btn').forEach(btn => {
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
        });
      }

      if (flash.btnLink.toLowerCase().includes('platform=')) {
        const platMatch = flash.btnLink.match(/platform=([^&]+)/i);
        if (platMatch && platMatch[1]) {
          const plat = platMatch[1].toLowerCase();
          if (plat === 'pc' && typeof window.selectPlatform === 'function') {
            window.selectPlatform('PC');
          } else if (typeof window.selectPlatform === 'function') {
            window.selectPlatform('Console');
          }
        }
      }
      
      const btnPC = document.getElementById('btnPC');
      const btnConsole = document.getElementById('btnConsole');
      if (btnPC) {
        btnPC.style.opacity = '0.7';
        btnPC.style.pointerEvents = 'none';
      }
      if (btnConsole) {
        btnConsole.style.opacity = '0.7';
        btnConsole.style.pointerEvents = 'none';
      }

      const rangeWrapper = document.getElementById('coinsRange')?.parentNode;
      if (rangeWrapper && !document.getElementById('flashLockMsg')) {
        const msg = document.createElement('div');
        msg.id = 'flashLockMsg';
        msg.style.cssText = 'color: #ef4444; font-size: 0.78rem; font-weight: 700; margin-top: 6px; text-align: center;';
        msg.innerHTML = '<i class="fas fa-lock"></i> تم قفل الكمية والمنصة لتناسب تفاصيل عرض البرق الخاطف المختار.';
        rangeWrapper.appendChild(msg);
      }
    }

    // 2. Objectives Page
    if (path.includes('buy-objectives.html')) {
      const checkBoxes = document.querySelectorAll('input[name="staticObjective"], input[name="dynamicObjective"]');
      checkBoxes.forEach(chk => {
        const val = chk.value.toLowerCase();
        const flashTitle = flash.title.toLowerCase();
        if (val.includes(flashTitle) || flashTitle.includes(val) || (chk.dataset.id && flash.btnLink.includes(chk.dataset.id))) {
          chk.checked = true;
          chk.style.pointerEvents = 'none';
          chk.parentNode.style.pointerEvents = 'none';
          chk.parentNode.style.opacity = '0.9';
        } else {
          chk.disabled = true;
          chk.parentNode.style.opacity = '0.5';
          chk.parentNode.style.pointerEvents = 'none';
        }
      });
    }

    // 3. Rivals / Champions / Coaching / Packages Page
    if (path.includes('buy-rivals.html') || path.includes('buy-champions.html') || path.includes('buy-coaching.html') || path.includes('buy-packages.html')) {
      const cards = document.querySelectorAll('.champions-card, .rivals-card, .coaching-card, .package-card, .objective-checkbox-card');
      cards.forEach(card => {
        const titleText = (card.querySelector('h3') || card.querySelector('.title') || card.querySelector('.obj-card-title') || card).textContent.toLowerCase();
        const flashTitle = flash.title.toLowerCase();
        
        if (titleText.includes(flashTitle) || flashTitle.includes(titleText)) {
          card.classList.add('selected');
          if (card.click) card.click();
          card.style.pointerEvents = 'none';
          card.style.border = '2px solid #ef4444';
        } else {
          card.style.opacity = '0.5';
          card.style.pointerEvents = 'none';
        }
      });
    }

    // 4. Main Page / index.html (Coaching & Packages Modal Deals)
    if (path === '/' || path.includes('index.html')) {
      if (flash.category === 'coaching') {
        let pkgName = 'برو';
        const titleClean = flash.title.toLowerCase();
        if (titleClean.includes('اساسي') || titleClean.includes('أساسي')) {
          pkgName = 'اساسي';
        } else if (titleClean.includes('برو بلس') || titleClean.includes('pro plus')) {
          pkgName = 'برو بلس';
        } else if (titleClean.includes('برو') || titleClean.includes('pro')) {
          pkgName = 'برو';
        }

        if (typeof window.openStaticCoachingBooking === 'function') {
          window.openStaticCoachingBooking(pkgName, parseFloat(flash.priceOriginal));
          
          const modalPrice = document.getElementById('modalCoachingPrice');
          if (modalPrice) {
            modalPrice.textContent = `${flash.pricePromo} ر.س`;
            modalPrice.style.color = '#ef4444';
            modalPrice.style.fontWeight = '900';
          }

          if (typeof window.getSelectedModalService === 'function' && typeof window.setSelectedModalService === 'function') {
            const currentService = window.getSelectedModalService();
            if (currentService) {
              currentService.priceSAR = parseFloat(flash.pricePromo);
              window.setSelectedModalService(currentService);
            }
          }

          const modalForm = document.getElementById('coachingModalForm');
          if (modalForm && !document.getElementById('trivelaModalFlashBanner')) {
            const banner = document.createElement('div');
            banner.id = 'trivelaModalFlashBanner';
            banner.style.cssText = `
              background: linear-gradient(135deg, #ef4444, #b91c1c);
              color: white;
              padding: 10px 14px;
              border-radius: 8px;
              margin-bottom: 15px;
              font-family: Cairo, sans-serif;
              font-weight: 700;
              font-size: 0.8rem;
              display: flex;
              align-items: center;
              gap: 8px;
              direction: rtl;
              box-shadow: 0 4px 10px rgba(239,68,68,0.2);
            `;
            banner.innerHTML = `<i class="fas fa-bolt fa-bounce" style="color: #f59e0b;"></i><span>تفعيل الخصم الخاص بعرض البرق: <strong>${flash.pricePromo} ر.س</strong> بدلاً من ${flash.priceOriginal} ر.س!</span>`;
            modalForm.insertBefore(banner, modalForm.firstChild);
          }
        }
      }
    }
  }

  function setupFlashPriceOverride() {
    setTimeout(() => {
      applyFlashDealSelections();

      if (typeof window.updatePriceAndSummary === 'function') {
        const originalUpdate = window.updatePriceAndSummary;
        window.updatePriceAndSummary = function() {
          originalUpdate.apply(this, arguments);
          
          if (window.activeFlashDeal && window.activeFlashDeal.pricePromo > 0) {
            const promo = parseFloat(window.activeFlashDeal.pricePromo);
            const currencySelect = document.getElementById('currencySelect');
            const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
            
            const cur = CURRENCIES[selectedCurrency] || { rate: 1, symbol: 'ر.س', dec: 2 };
            
            let promoConverted = promo;
            if (selectedCurrency !== 'SAR') {
              promoConverted = (promo / 3.75) * (cur.rate || 1);
            }
            
            const formatted = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: cur.dec !== undefined ? cur.dec : 2,
              maximumFractionDigits: cur.dec !== undefined ? cur.dec : 2
            }).format(promoConverted) + ' ' + (cur.symbol || 'SAR');
            
            const displayPrice = document.getElementById('displayPrice');
            const summaryPrice = document.getElementById('summaryPrice');
            const sidebarTotal = document.getElementById('sidebarTotalPrice');
            
            if (displayPrice) displayPrice.textContent = formatted;
            if (summaryPrice) summaryPrice.textContent = formatted;
            if (sidebarTotal) sidebarTotal.textContent = formatted;
            
            const sidebarBase = document.getElementById('sidebarBasePrice');
            if (sidebarBase) {
              const origConverted = (parseFloat(window.activeFlashDeal.priceOriginal) / 3.75) * (cur.rate || 1);
              const origFormatted = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: cur.dec !== undefined ? cur.dec : 2,
                maximumFractionDigits: cur.dec !== undefined ? cur.dec : 2
              }).format(origConverted) + ' ' + (cur.symbol || 'SAR');
              sidebarBase.textContent = origFormatted;
            }
            
            const sidebarDiscRow = document.getElementById('sidebarDiscountRow');
            const sidebarDiscAmt = document.getElementById('sidebarDiscountAmount');
            if (sidebarDiscRow) {
              sidebarDiscRow.style.display = 'flex';
              const discountValue = parseFloat(window.activeFlashDeal.priceOriginal) - promo;
              const discConverted = (discountValue / 3.75) * (cur.rate || 1);
              const discFormatted = '-' + new Intl.NumberFormat('en-US', {
                minimumFractionDigits: cur.dec !== undefined ? cur.dec : 2,
                maximumFractionDigits: cur.dec !== undefined ? cur.dec : 2
              }).format(discConverted) + ' ' + (cur.symbol || 'SAR');
              if (sidebarDiscAmt) sidebarDiscAmt.textContent = discFormatted;
            }
          }
        };
        window.updatePriceAndSummary();
      }
    }, 200);
  }

  // Fetch interceptor to automatically attach authorization header & override flash deal payload
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const token = localStorage.getItem('trivela_token');
    init = init || {};
    init.headers = init.headers || {};
    
    const url = typeof input === 'string' ? input : (input.url || '');
    
    if (url.includes('/api/')) {
      if (token) {
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) {
            init.headers.append('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          const hasAuth = init.headers.some(h => h[0]?.toLowerCase() === 'authorization');
          if (!hasAuth) {
            init.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          if (!init.headers['Authorization'] && !init.headers['authorization']) {
            init.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      }
      
      // Intercept and override /api/orders POST payload for active flash deals
      if (url.includes('/api/orders') && init.method === 'POST') {
        const urlParams = new URLSearchParams(window.location.search);
        const isFlashDeal = urlParams.get('flashDeal') === 'true';
        if (isFlashDeal && window.activeFlashDeal && window.activeFlashDeal.pricePromo > 0) {
          try {
            const body = JSON.parse(init.body);
            body.priceSAR = parseFloat(window.activeFlashDeal.pricePromo);
            body.service = `${body.service} (عرض البرق: ${window.activeFlashDeal.title})`;
            init.body = JSON.stringify(body);
          } catch (e) {
            console.error("Failed to apply flash deal price to order payload:", e);
          }
        }
      }
    }
    return originalFetch.call(this, input, init);
  };
})();
