let dynamicSettings = {
  whatsappPhone: "962775585112",
  instagramUrl: "https://www.instagram.com/shopcoin15",
  maintenanceMode: false,
  baseRateConsole: 2.80,
  baseRatePC: 2.40,
  pointsDiscountRate: 37.5
};

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

let currentPlatform = 'console';
let currentChallenge = null;

// Coupon State
let dynamicCoupons = {};
let activeCoupon = null;

// Fetch configs
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data && data.settings) {
        dynamicSettings = Object.assign(dynamicSettings, data.settings);
        if (dynamicSettings.customExchangeRates) {
          for (const code in dynamicSettings.customExchangeRates) {
            if (CURRENCIES[code]) {
              CURRENCIES[code].rate = parseFloat(dynamicSettings.customExchangeRates[code]);
            }
          }
        }
      }
    })
    .catch(err => console.warn("Could not fetch settings dynamically:", err));
}

function fetchDynamicCoupons() {
  return fetch('/api/public/coupons')
    .then(res => res.json())
    .then(coupons => {
      dynamicCoupons = {};
      (coupons || []).forEach(c => {
        const isExpired = new Date(c.expiryDate) < new Date();
        const isLimitReached = (c.usedCount || 0) >= (c.maxUses || 999);
        if (!isExpired && !isLimitReached) {
          dynamicCoupons[c.code.toUpperCase()] = c.percent;
        }
      });
      window.couponsLoaded = true;
    })
    .catch(err => console.warn("Could not fetch coupons dynamically:", err));
}

let savedUserEA = null;
let loggedInName = "";
let loggedInPhone = "";

function loadUserData() {
  const token = localStorage.getItem('shopcoin_token');
  if (!token) return;

  fetch('/api/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(user => {
    if (user) {
      loggedInName = user.name || "";
      loggedInPhone = user.phone || "";
      
      const nameInput = document.getElementById('customerName');
      const phoneInput = document.getElementById('customerPhone');
      if (nameInput && loggedInName) nameInput.value = loggedInName;
      if (phoneInput && loggedInPhone) phoneInput.value = loggedInPhone;

      if (user.savedEA && user.savedEA.email) {
        savedUserEA = user.savedEA;
        const banner = document.getElementById('savedEaAccountBanner');
        const info = document.getElementById('lblSavedEaInfo');
        if (banner) banner.style.display = 'flex';
        if (info) info.innerHTML = `الحساب المحفوظ: <strong>${user.savedEA.email}</strong> (${user.savedEA.platform || 'Console'}) — انقر للتعبئة الفورية.`;
      }
    }
  })
  .catch(() => {});
}

function fillSavedEaAccount() {
  if (!savedUserEA) return;

  const emailInput = document.getElementById('eaEmail');
  const code1 = document.getElementById('backup1');
  const code2 = document.getElementById('backup2');
  const code3 = document.getElementById('backup3');

  if (emailInput && savedUserEA.email) emailInput.value = savedUserEA.email;
  if (savedUserEA.backupCodes && savedUserEA.backupCodes.length > 0) {
    if (code1) code1.value = savedUserEA.backupCodes[0] || '';
    if (code2) code2.value = savedUserEA.backupCodes[1] || '';
    if (code3) code3.value = savedUserEA.backupCodes[2] || '';
  }

  const banner = document.getElementById('savedEaAccountBanner');
  if (banner) {
    banner.style.borderColor = '#10b981';
    banner.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(13, 21, 39, 0.95) 100%)';
    const btn = banner.querySelector('button');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> تم تعبئة الحساب بنجاح ✓';
      btn.style.background = '#10b981';
      btn.style.color = '#ffffff';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([fetchSettings(), fetchDynamicCoupons()]).then(() => {
    // Read platform from URL if passed from catalog
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      currentPlatform = 'pc';
    } else {
      currentPlatform = 'console';
    }
    
    updatePlatformUI();
    loadChallengeDetails();
    loadUserData();
  });
});

// Tab Switcher between Options and Details
window.switchTab = function(tabName) {
  const btnOptions = document.getElementById('btnTabOptions');
  const btnDetails = document.getElementById('btnTabDetails');
  const panelOptions = document.getElementById('panelOptions');
  const panelDetails = document.getElementById('panelDetails');

  if (tabName === 'details') {
    if (btnDetails) btnDetails.classList.add('active');
    if (btnOptions) btnOptions.classList.remove('active');
    if (panelDetails) panelDetails.classList.add('active');
    if (panelOptions) panelOptions.classList.remove('active');
  } else {
    if (btnOptions) btnOptions.classList.add('active');
    if (btnDetails) btnDetails.classList.remove('active');
    if (panelOptions) panelOptions.classList.add('active');
    if (panelDetails) panelDetails.classList.remove('active');
  }
};

// Load details for the specific player challenge ID
function loadChallengeDetails() {
  const params = new URLSearchParams(window.location.search);
  const challengeId = params.get('id');
  if (!challengeId) {
    window.location.href = 'buy-sbc.html';
    return;
  }
  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      currentChallenge = data.find(p => p.id === challengeId && p.category === 'sbc');
      if (!currentChallenge) {
        alert("التحدي المطلوب غير موجود أو تم إيقافه.");
        window.location.href = 'buy-sbc.html';
        return;
      }
      
      renderChallengeUI();
    })
    .catch(err => {
      console.error("Error loading challenge:", err);
      alert("حدث خطأ أثناء تحميل بيانات التحدي.");
      window.location.href = 'buy-sbc.html';
    });
}

function renderChallengeUI() {
  if (!currentChallenge) return;

  const titleEl = document.getElementById('detailChallengeTitle');
  const imgEl = document.getElementById('detailPlayerImage');
  const deliveryEl = document.getElementById('lblEstimatedDelivery');
  const summaryTitleEl = document.getElementById('summaryChallengeTitle');
  const tabTitleEl = document.getElementById('detailTabChallengeTitle');
  const tabDescEl = document.getElementById('detailTabChallengeDesc');

  if (titleEl) titleEl.textContent = currentChallenge.name;
  if (imgEl) imgEl.src = currentChallenge.image;
  if (summaryTitleEl) summaryTitleEl.textContent = currentChallenge.name;
  if (tabTitleEl) tabTitleEl.textContent = currentChallenge.name;
  if (tabDescEl) {
    tabDescEl.textContent = currentChallenge.description || `إنهاء كافة تشكيلات التحدي المطلوبة لـ (${currentChallenge.name}) بأعلى سرعة وأقل استهلاك لكوينز الحساب.`;
  }
  
  if (deliveryEl) {
    deliveryEl.textContent = (currentChallenge.estimatedDelivery && currentChallenge.estimatedDelivery.trim() && currentChallenge.estimatedDelivery !== 'من الصعب التحديد') 
      ? currentChallenge.estimatedDelivery.trim() 
      : "⚡ 20 - 45 دقيقة";
  }

  updatePriceAndSummary();
}

function selectPlatform(platform) {
  if (platform === 'PC' || platform === 'pc') {
    currentPlatform = 'pc';
  } else {
    currentPlatform = 'console';
  }
  updatePlatformUI();
  updatePriceAndSummary();
}
window.selectPlatform = selectPlatform;

function updatePlatformUI() {
  const btnConsole = document.getElementById('btnPlatformConsole');
  const btnPC = document.getElementById('btnPlatformPC');
  const pillIcon = document.getElementById('pillPlatformIcon');
  const pillText = document.getElementById('pillPlatformText');
  const heroPlatformIcon = document.getElementById('heroPlatformIcon');
  const heroPlatformLabel = document.getElementById('heroPlatformLabel');

  if (currentPlatform === 'pc') {
    if (btnPC) btnPC.classList.add('active');
    if (btnConsole) btnConsole.classList.remove('active');
    if (pillIcon) pillIcon.className = 'fas fa-desktop';
    if (pillText) pillText.textContent = 'الكمبيوتر (PC)';
    if (heroPlatformIcon) heroPlatformIcon.innerHTML = '<i class="fas fa-desktop"></i>';
    if (heroPlatformLabel) heroPlatformLabel.textContent = 'سعر التحدي (الكمبيوتر PC)';
  } else {
    if (btnConsole) btnConsole.classList.add('active');
    if (btnPC) btnPC.classList.remove('active');
    if (pillIcon) pillIcon.className = 'fab fa-playstation';
    if (pillText) pillText.textContent = 'سوني / إكس بوكس (Console)';
    if (heroPlatformIcon) heroPlatformIcon.innerHTML = '<i class="fab fa-playstation"></i>';
    if (heroPlatformLabel) heroPlatformLabel.textContent = 'سعر التحدي (سوني & إكس بوكس)';
  }
}

function updatePriceAndSummary() {
  if (!currentChallenge) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const priceConsoleSAR = currentChallenge.priceSAR;
  const priceConsoleUSD = currentChallenge.priceUSD;
  const pricePCSAR = currentChallenge.pricePCSAR || (priceConsoleSAR + 10);
  const pricePCUSD = currentChallenge.pricePCUSD || (priceConsoleUSD + 3);

  let rawPriceVal = currentPlatform === 'pc' ? pricePCSAR : priceConsoleSAR;
  if (selectedCurrency !== 'SAR') {
    rawPriceVal = (currentPlatform === 'pc' ? pricePCUSD : priceConsoleUSD) * cur.rate;
  }

  // Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = rawPriceVal * (activeCoupon.percent / 100);
    rawPriceVal -= couponDiscountValue;
  }

  const formattedFinal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(rawPriceVal) + ' ' + cur.symbol;

  const priceBadgeActive = document.getElementById('priceBadgeActive');
  const finalPriceText = document.getElementById('finalPriceText');
  const summaryChallengeTitle = document.getElementById('summaryChallengeTitle');
  const platName = currentPlatform === 'pc' ? 'PC' : 'سوني / إكس بوكس';

  if (priceBadgeActive) priceBadgeActive.textContent = formattedFinal;
  if (finalPriceText) finalPriceText.textContent = formattedFinal;
  if (summaryChallengeTitle) summaryChallengeTitle.textContent = `${currentChallenge.name} (${platName})`;
}

// ══════════ COUPON HELPERS ══════════
window.toggleCompactCoupon = function(btn) {
  const wrapper = document.getElementById('couponInputWrapper');
  const chevron = btn ? btn.querySelector('.toggle-chevron') : document.getElementById('couponChevron');
  if (!wrapper) return;
  const isHidden = wrapper.style.display === 'none' || wrapper.style.display === '';
  wrapper.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.classList.toggle('open', isHidden);
  if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  if (isHidden) {
    const inp = document.getElementById('couponCodeInput');
    if (inp) inp.focus();
  }
};

window.applyCouponCode = function() {
  const input = document.getElementById('couponCodeInput');
  const msg = document.getElementById('couponStatusMessage');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    msg.className = "coupon-status-msg error";
    msg.textContent = "يرجى إدخال رمز الكوبون.";
    activeCoupon = null;
    updatePriceAndSummary();
    return;
  }

  if (dynamicCoupons[code] !== undefined) {
    activeCoupon = {
      code: code,
      percent: typeof dynamicCoupons[code] === 'object' ? dynamicCoupons[code].percent : dynamicCoupons[code]
    };
    msg.className = "coupon-status-msg success";
    msg.textContent = `تم تطبيق الكوبون بنجاح! خصم ${activeCoupon.percent}%`;
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "رمز الكوبون غير صحيح أو منتهي الصلاحية.";
  }
  updatePriceAndSummary();
};

window.togglePasswordVisibility = function() {
  const passInput = document.getElementById('eaPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (passInput && eyeIcon) {
    if (passInput.type === 'password') {
      passInput.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    } else {
      passInput.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
    }
  }
};

window.selectClubCount = function(count) {
  const b1 = document.getElementById('clubOne');
  const b2 = document.getElementById('clubTwo');
  const clubNameGroup = document.getElementById('clubNameGroup');
  if (b1 && b2) {
    b1.classList.toggle('active', count === 1);
    b2.classList.toggle('active', count === 2);
  }
  if (clubNameGroup) {
    clubNameGroup.style.display = count === 2 ? 'block' : 'none';
  }
};

// ══════════ PURCHASE SUBMIT ══════════
window.handlePurchaseSubmit = function(event) {
  event.preventDefault();
  if (!currentChallenge) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const priceConsoleSAR = currentChallenge.priceSAR;
  const pricePCSAR = currentChallenge.pricePCSAR || (priceConsoleSAR + 10);
  const rawPriceSAR = currentPlatform === 'pc' ? pricePCSAR : priceConsoleSAR;
  const couponDiscountSAR = activeCoupon ? (rawPriceSAR * (activeCoupon.percent / 100)) : 0;
  const finalPriceSAR = Math.max(0, rawPriceSAR - couponDiscountSAR);

  let rawDisplay = currentPlatform === 'pc' ? (currentChallenge.pricePCUSD || currentChallenge.priceUSD + 3) : currentChallenge.priceUSD;
  if (selectedCurrency === 'SAR') {
    rawDisplay = rawPriceSAR;
  } else {
    rawDisplay = rawDisplay * cur.rate;
  }
  if (activeCoupon) {
    rawDisplay -= (rawDisplay * (activeCoupon.percent / 100));
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(rawDisplay) + ' ' + cur.symbol;

  const webAppCheck = document.getElementById('webAppCheck');
  if (webAppCheck && !webAppCheck.checked) {
    alert("⚠️ يُرجى تأكيد أن سوق الانتقالات مفتوح في الويب آب عبر تحديد المربع للمتابعة وإتمام الطلب.");
    webAppCheck.focus();
    return;
  }

  const email = document.getElementById('eaEmail').value.trim();
  const password = document.getElementById('eaPassword').value;
  const chkBackupHelp = document.getElementById('chkNeedBackupHelp');
  const isBackupHelp = chkBackupHelp ? chkBackupHelp.checked : false;
  const code1 = isBackupHelp ? 'مساعدة الدعم الفني' : document.getElementById('backup1').value.trim();
  const code2 = isBackupHelp ? '—' : (document.getElementById('backup2').value.trim() || '—');
  const code3 = isBackupHelp ? '—' : (document.getElementById('backup3').value.trim() || '—');
  const clubName = document.getElementById('clubNameInput') ? document.getElementById('clubNameInput').value.trim() : '—';
  const platformName = currentPlatform === 'pc' ? 'الكمبيوتر (PC)' : 'سوني وإكس بوكس (Console)';

  const cartItem = {
    id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    addedAt: new Date().toISOString(),
    service: `حل تحدي SBC: ${currentChallenge.name}`,
    type: 'sbc',
    platform: platformName,
    priceSAR: finalPriceSAR,
    eaEmail: email,
    eaPassword: password,
    backupCodes: [code1, code2, code3].filter(c => c && c !== '—'),
    clubName: clubName !== '—' ? clubName : '',
    details: currentChallenge.rating ? `تقييم ${currentChallenge.rating}` : ''
  };

  if (window.shopCoinCart) {
    window.shopCoinCart.addItem(cartItem);
  } else {
    try {
      const existing = localStorage.getItem('shopcoin_cart');
      const items = existing ? JSON.parse(existing) : [];
      items.push(cartItem);
      localStorage.setItem('shopcoin_cart', JSON.stringify(items));
    } catch(e) {
      console.error("Cart save error:", e);
    }
  }

  // Instant visual feedback on button & redirect to cart
  const submitBtn = document.getElementById('btnSubmitOrder') || document.querySelector('.summary-complete-btn');
  if (submitBtn) {
    submitBtn.innerHTML = '<span>تمت الإضافة! جاري نقلك للسلة... 🛒</span> <i class="fas fa-check"></i>';
    submitBtn.style.background = '#16a34a';
  }

  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 400);
};

// ══════════ PAYMENT METHOD (DEFAULT WHATSAPP) ══════════
window.currentSelectedPaymentMethod = 'whatsapp';
window.selectPaymentMethod = function(method) {
  window.currentSelectedPaymentMethod = 'whatsapp';
  const cardWhatsApp = document.getElementById('payOptionWhatsApp');
  const radioWhatsApp = cardWhatsApp ? cardWhatsApp.querySelector('input') : null;
  const submitBtn = document.getElementById('btnSubmitOrder') || document.querySelector('.summary-complete-btn');

  if (cardWhatsApp) cardWhatsApp.classList.add('active');
  if (radioWhatsApp) radioWhatsApp.checked = true;
  if (submitBtn) {
    submitBtn.innerHTML = '<span>إضافة التحدي إلى السلة</span> <i class="fas fa-cart-plus"></i>';
  }
};


function showOrderSuccessPopup(orderId, priceStr, serviceName, platform) {
  window.scrollTo(0, 0);

  let overlay = document.getElementById('orderSuccessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'orderSuccessOverlay';
    overlay.className = 'order-success-overlay';
    document.body.appendChild(overlay);
  }

  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '999999';

  overlay.innerHTML = `
    <div class="order-success-card receipt-style">
      <div class="receipt-header">
        <img src="logo-official.png" class="receipt-logo" alt="ShopCoin" />
        <h3 class="receipt-title">سند استلام إلكتروني</h3>
        <p class="receipt-subtitle">متجر شوب كوينز — متجر خدمات FIFA 27 المعتمد</p>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <span class="label">رقم الطلب:</span>
          <span class="value" style="font-family: 'Montserrat', sans-serif; font-weight: 800;">#${orderId}</span>
        </div>
        <div class="receipt-row">
          <span class="label">الخدمة:</span>
          <span class="value" style="max-width: 250px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${serviceName}</span>
        </div>
        <div class="receipt-row">
          <span class="label">المنصة:</span>
          <span class="value" style="font-family: 'Montserrat', sans-serif; font-weight: 700;">${platform}</span>
        </div>
        <div class="receipt-row">
          <span class="label">تاريخ الطلب:</span>
          <span class="value">${new Date().toLocaleDateString('ar-SA')}</span>
        </div>
        <div class="receipt-row">
          <span class="label">حالة الدفع:</span>
          <span class="value" style="color: #10b981; font-weight: 700;"><i class="fas fa-check-circle"></i> مؤكد إلكترونياً</span>
        </div>
        <div class="receipt-row total">
          <span class="label">المبلغ الإجمالي:</span>
          <span class="value">${priceStr}</span>
        </div>
      </div>
      
      <div class="receipt-footer-msg">
        <i class="fas fa-shield-check" style="color: #10b981;"></i>
        تم تأكيد واستلام طلبك بنجاح! جاري توجيه طلبك للتنفيذ الفوري من قبل الفريق المختص. يمكنك متابعة تقدم الطلب في أي وقت برقم طلبك.
      </div>
      
      <button type="button" class="order-success-btn" id="btnRedirectWhatsapp" style="width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px;">
        <span>متابعة حالة الطلب</span>
        <i class="fas fa-arrow-left"></i>
      </button>
      
      <div class="receipt-bottom-decoration"></div>
    </div>
  `;

  overlay.classList.add('open');

  const btn = document.getElementById('btnRedirectWhatsapp');
  if (btn) {
    btn.onclick = () => {
      window.location.href = `track.html?id=${orderId}`;
    };
  }
}
