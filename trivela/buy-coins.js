// Configuration & Exchange Rates
let dynamicSettings = {
  whatsappPhone: "966500000000",
  instagramUrl: "https://instagram.com/Trivela",
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

// Base Rate per 100K coins in USD (Deprecated: loaded dynamically from settings)
const BASE_RATE_PER_100K = {
  console: 2.80,
  pc: 2.40
};

// Discount Tiers: [minCoins, discountPercent]
const DISCOUNTS = [
  [10_000_000, 20],
  [ 5_000_000, 10],
  [ 1_000_000,  5],
  [       0,    0]
];

// Current State
let currentPlatform = 'console';
let currentCoins = 1000000; // 1M default
let clubCount = 1;

// Loyalty State
let userPoints = 0;

// Active Discount states
let activeCoupon = null;
let usePointsActive = false;

/* dynamicCoupons removed */

// Fetch configurations dynamically
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;

        // Redirect if service is disabled
        if (dynamicSettings.enableServiceCoins === false) {
          alert("عذراً، خدمة شحن الكوينز متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
          window.location.href = "/";
          return;
        }

        // Apply Exchange Rate Overrides
        if (dynamicSettings.customExchangeRates) {
          for (const code in dynamicSettings.customExchangeRates) {
            if (CURRENCIES[code]) {
              CURRENCIES[code].rate = parseFloat(dynamicSettings.customExchangeRates[code]);
            }
          }
        }

        applySliderLimits();
      }
    })
    .catch(err => {
      console.warn("Could not fetch settings dynamically:", err);
    });
}

function applySliderLimits() {
  const slider = document.getElementById('coinsSlider');
  const minVal = dynamicSettings.minCoinsPurchase || 100000;
  const maxVal = dynamicSettings.maxCoinsPurchase || 10000000;

  if (slider) {
    slider.min = minVal;
    slider.max = maxVal;
    slider.step = 100000;

    if (currentCoins < minVal) {
      currentCoins = minVal;
      slider.value = minVal;
    } else if (currentCoins > maxVal) {
      currentCoins = maxVal;
      slider.value = maxVal;
    }

    const labelMin = document.getElementById('sliderLabelMin');
    if (labelMin) labelMin.textContent = formatCoins(minVal);
    const labelMax = document.getElementById('sliderLabelMax');
    if (labelMax) labelMax.textContent = formatCoins(maxVal);

    const ticksContainer = document.getElementById('sliderTicksContainer');
    if (ticksContainer) {
      ticksContainer.innerHTML = '';
      const stepVal = (maxVal - minVal) / 4;
      for (let i = 0; i <= 4; i++) {
        const val = minVal + stepVal * i;
        const span = document.createElement('span');
        span.textContent = formatCoins(val);
        ticksContainer.appendChild(span);
      }
    }

    const qaBtns = document.querySelectorAll('.qa-btn');
    let firstVisibleBtn = null;
    qaBtns.forEach(btn => {
      const btnVal = parseInt(btn.getAttribute('data-val'), 10);
      if (btnVal < minVal || btnVal > maxVal) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'inline-block';
        if (!firstVisibleBtn) firstVisibleBtn = btn;
      }
    });

    const activeBtn = document.querySelector('.qa-btn.active');
    if (activeBtn && activeBtn.style.display === 'none') {
      activeBtn.classList.remove('active');
      if (firstVisibleBtn) {
        firstVisibleBtn.classList.add('active');
        currentCoins = parseInt(firstVisibleBtn.getAttribute('data-val'), 10);
        slider.value = currentCoins;
      }
    }
  }
}

// Initialize on load

let dynamicCoupons = {};
function fetchDynamicCoupons() {
  return fetch('/api/public/coupons')
    .then(res => res.json())
    .then(coupons => {
      dynamicCoupons = {};
      (coupons || []).forEach(c => {
        const isExpired = new Date(c.expiryDate) < new Date();
        const isLimitReached = (c.usedCount || 0) >= (c.maxUses || 999);
        if (!isExpired && !isLimitReached) {
          dynamicCoupons[c.code.toUpperCase()] = c;
        }
      });
    })
    .catch(err => console.warn("Could not fetch coupons dynamically:", err));
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([fetchSettings(), fetchDynamicCoupons()]).then(() => {
    // Parse URL parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }
  });

  // Close details modal when clicking outside the card content
  const detailsModal = document.getElementById('coinsDetailsModal');
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) {
        closeDetailsModal();
      }
    });
  }

  // Setup slider event listeners
  const slider = document.getElementById('coinsSlider');
  if (slider) {
    slider.addEventListener('input', () => {
      onSliderChange(slider.value);
    });

    const btnMinus = document.getElementById('sliderMinus');
    const btnPlus = document.getElementById('sliderPlus');
    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        const min = parseInt(slider.min) || 100000;
        const step = parseInt(slider.step) || 100000;
        const current = parseInt(slider.value) || 1000000;
        const newVal = Math.max(min, current - step);
        slider.value = newVal;
        onSliderChange(newVal);
      });
    }
    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        const max = parseInt(slider.max) || 10000000;
        const step = parseInt(slider.step) || 100000;
        const current = parseInt(slider.value) || 1000000;
        const newVal = Math.min(max, current + step);
        slider.value = newVal;
        onSliderChange(newVal);
      });
    }
  }

  loadUserLoyalty();

  // Watch inputs to update progress bar
  const inputsToWatch = ['customerName', 'customerPhone', 'eaEmail', 'eaPassword', 'backup1'];
  inputsToWatch.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCheckoutProgress);
      el.addEventListener('change', updateCheckoutProgress);
    }
  });
  updateCheckoutProgress();
});

let loggedInName = "";
let loggedInPhone = "";

// Load user points if logged in
function loadUserLoyalty() {
  const token = localStorage.getItem('trivela_token');
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

      if (user.points > 0) {
        userPoints = user.points;
        const lblBalance = document.getElementById('lblLoyaltyPointsBalance');
        if (lblBalance) lblBalance.textContent = userPoints;
        
        // Update display initially
        updatePointsDisplayVal();

        // Show points blocks
        const optionRow = document.getElementById('loyaltyOptionRow');
        const divider = document.getElementById('loyaltyPointsDivider');
        if (optionRow) optionRow.style.display = 'block';
        if (divider) divider.style.display = 'block';
      }
    }
  })
  .catch(err => console.log("User not logged in or session expired."));
}

// Handle radio toggle between Coupon and Points
function handleDiscountTypeChange() {
  const radCoupon = document.getElementById('radCoupon');
  const couponWrapper = document.getElementById('couponInputWrapper');
  const pointsWrapper = document.getElementById('pointsInputWrapper');

  if (radCoupon && radCoupon.checked) {
    if (couponWrapper) couponWrapper.style.display = 'block';
    if (pointsWrapper) pointsWrapper.style.display = 'none';
    usePointsActive = false;
  } else {
    if (couponWrapper) couponWrapper.style.display = 'none';
    if (pointsWrapper) pointsWrapper.style.display = 'block';
    activeCoupon = null;
    const msg = document.getElementById('couponStatusMessage');
    if (msg) msg.textContent = "";
    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) couponInput.value = "";
  }
  updatePriceAndSummary();
}

// Apply Coupon Code
function applyCouponCode() {
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
      percent: dynamicCoupons[code].percent
    };
    msg.className = "coupon-status-msg success";
    msg.textContent = `تم تفعيل الكوبون بنجاح! خصم ${dynamicCoupons[code].percent}%`;
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "الكوبون غير صالح أو منتهي الصلاحية.";
  }
  updatePriceAndSummary();
}

// Toggle Points Usage via link click
function togglePointsUsage(event) {
  if (event) event.preventDefault();
  const link = document.getElementById('btnApplyPoints');
  if (!link) return;

  if (usePointsActive) {
    usePointsActive = false;
    link.textContent = "اضغط هنا للتفعيل";
    link.style.color = "#f59e0b";
  } else {
    usePointsActive = true;
    link.textContent = "تم التفعيل (اضغط للإلغاء)";
    link.style.color = "var(--green)";
  }
  updatePriceAndSummary();
}

function updatePointsDisplayVal() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const valUSD = userPoints / 37.5; // 10 points = 1 SAR, so userPoints/37.5 = USD value
  const valConverted = valUSD * cur.rate;

  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(valConverted) + ' ' + cur.symbol;

  const lblDiscount = document.getElementById('lblPointsDiscountSAR');
  if (lblDiscount) lblDiscount.textContent = formattedVal;
}

// Select Platform (PC vs Console)
function selectPlatform(platform) {
  const btnPC = document.getElementById('btnPC');
  const btnConsole = document.getElementById('btnConsole');

  if (platform === 'PC') {
    currentPlatform = 'pc';
    if (btnPC) btnPC.classList.add('active');
    if (btnConsole) btnConsole.classList.remove('active');
  } else {
    currentPlatform = 'console';
    if (btnConsole) btnConsole.classList.add('active');
    if (btnPC) btnPC.classList.remove('active');
  }
  updatePriceAndSummary();
}

// Toggle EA clubs count option
function selectClubCount(count) {
  const btn1 = document.getElementById('clubOne');
  const btn2 = document.getElementById('clubTwo');
  const clubNameGroup = document.getElementById('clubNameGroup');

  clubCount = count;
  if (count === 1) {
    if (btn1) btn1.classList.add('active');
    if (btn2) btn2.classList.remove('active');
    if (clubNameGroup) {
      clubNameGroup.style.display = 'none';
      document.getElementById('eaClubName').required = false;
    }
  } else {
    if (btn2) btn2.classList.add('active');
    if (btn1) btn1.classList.remove('active');
    if (clubNameGroup) {
      clubNameGroup.style.display = 'block';
      document.getElementById('eaClubName').required = true;
    }
  }
}

// Toggle Password Visibility
function togglePasswordVisibility() {
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
}

// Slider Change Handlers
function onSliderChange(value) {
  currentCoins = parseInt(value, 10);
  
  // Format live values
  const liveCoins = document.getElementById('liveCoins');
  if (liveCoins) {
    liveCoins.textContent = currentCoins.toLocaleString();
  }

  // Deactivate active quick amount buttons
  const qaBtns = document.querySelectorAll('.qa-btn');
  qaBtns.forEach(btn => btn.classList.remove('active'));

  // If match exactly, activate
  const exactBtn = document.querySelector(`.qa-btn[data-val="${currentCoins}"]`);
  if (exactBtn) {
    exactBtn.classList.add('active');
  }

  updatePriceAndSummary();
}

// Quick amount button click handler
function selectQuickAmount(btn, amount) {
  const slider = document.getElementById('coinsSlider');
  if (slider) {
    slider.value = amount;
  }
  
  currentCoins = amount;
  const liveCoins = document.getElementById('liveCoins');
  if (liveCoins) {
    liveCoins.textContent = currentCoins.toLocaleString();
  }

  const qaBtns = document.querySelectorAll('.qa-btn');
  qaBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  updatePriceAndSummary();
}

// Helper: Format Coins to M or K
function formatCoins(n) {
  if (n >= 1_000_000) return (n / 1_000_000) % 1 === 0 ? `${n/1_000_000}M` : `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${n/1_000}K`;
  return String(n);
}

// Calculate discount tier
function getDiscount(coins) {
  for (const [min, pct] of DISCOUNTS) {
    if (coins >= min) return pct;
  }
  return 0;
}

// Calculate base price in selected currency
function calculatePrice(coins, platform, currency) {
  const rateUSD = platform === 'pc' ? dynamicSettings.baseRatePC : dynamicSettings.baseRateConsole;
  const baseUSD = (coins / 100_000) * rateUSD;
  const discPct = getDiscount(coins);
  const finalUSD = baseUSD * (1 - discPct / 100);
  const cur = CURRENCIES[currency];
  return {
    price: finalUSD * cur.rate,
    symbol: cur.symbol,
    dec: cur.dec
  };
}

// Update Price Displays
function updatePriceAndSummary() {
  triggerPriceSkeleton();
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';

  // Update points display value with correct exchange rates
  if (userPoints > 0) {
    updatePointsDisplayVal();
  }

  const res = calculatePrice(currentCoins, currentPlatform, selectedCurrency);
  let finalPrice = res.price;

  // Calculate Coupon Discount if active
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = finalPrice * (activeCoupon.percent / 100);
    finalPrice -= couponDiscountValue;
  }

  // Calculate Points Discount if active
  let pointsDiscountValue = 0;
  if (usePointsActive && userPoints > 0) {
    const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;
    
    pointsDiscountValue = Math.min(finalPrice, maxDiscountConverted);
    finalPrice -= pointsDiscountValue;
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: res.dec,
    maximumFractionDigits: res.dec
  }).format(finalPrice) + ' ' + res.symbol;

  // Update controls display
  const displayPrice = document.getElementById('displayPrice');
  if (displayPrice) {
    displayPrice.textContent = formattedPrice;
  }

  // Update bottom sticky bar displays
  const summaryPrice = document.getElementById('summaryPrice');
  const summaryCoins = document.getElementById('summaryCoins');
  if (summaryPrice) {
    summaryPrice.textContent = formattedPrice;
  }
  if (summaryCoins) {
    summaryCoins.textContent = formatCoins(currentCoins);
  }



  // Estimated Time calculation
  const lblTime = document.getElementById('lblEstimatedTime');
  if (lblTime) {
    if (currentCoins <= 500000) {
      lblTime.textContent = "10 - 25 دقيقة";
    } else if (currentCoins <= 1000000) {
      lblTime.textContent = "20 - 45 دقيقة";
    } else if (currentCoins <= 3000000) {
      lblTime.textContent = "30 - 60 دقيقة";
    } else if (currentCoins <= 5000000) {
      lblTime.textContent = "1 - 2 ساعة";
    } else {
      lblTime.textContent = "2 - 4 ساعات";
    }
  }
}

// Form Submission & WhatsApp Redirect
function handlePurchaseSubmit(event) {
  event.preventDefault();

  const minLimit = dynamicSettings.minCoinsPurchase || 100000;
  const maxLimit = dynamicSettings.maxCoinsPurchase || 10000000;
  if (currentCoins < minLimit || currentCoins > maxLimit) {
    alert(`❌ عذراً، كمية الكوينز غير صالحة. الحد الأدنى للطلب هو ${minLimit.toLocaleString()} كوينز، والحد الأقصى هو ${maxLimit.toLocaleString()} كوينز.`);
    return;
  }

  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
  }

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';

  const res = calculatePrice(currentCoins, currentPlatform, selectedCurrency);
  let finalPrice = res.price;

  // Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = finalPrice * (activeCoupon.percent / 100);
    finalPrice -= couponDiscountValue;
  }

  // Points Discount
  let pointsDeducted = 0;
  let pointsDiscountValue = 0;
  if (usePointsActive && userPoints > 0) {
    const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;
    
    pointsDiscountValue = Math.min(finalPrice, maxDiscountConverted);
    finalPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
  }

  const email = document.getElementById('eaEmail').value;
  const password = document.getElementById('eaPassword').value;
  const code1 = document.getElementById('backup1').value.trim();
  const code2 = document.getElementById('backup2').value.trim() || '—';
  const code3 = document.getElementById('backup3').value.trim() || '—';
  
  // Calculate final price in SAR for earnings database
  const resSAR = calculatePrice(currentCoins, currentPlatform, 'SAR');
  let finalPriceSAR = resSAR.price;

  let couponDiscountValSAR = 0;
  if (activeCoupon) {
    couponDiscountValSAR = finalPriceSAR * (activeCoupon.percent / 100);
    finalPriceSAR -= couponDiscountValSAR;
  }

  let pointsDiscountValSAR = 0;
  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConvertedSAR = maxDiscountUSD * 3.75;
    pointsDiscountValSAR = Math.min(finalPriceSAR, maxDiscountConvertedSAR);
    finalPriceSAR -= pointsDiscountValSAR;
  }

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const customerName = nameInput ? nameInput.value.trim() : (loggedInName || email.split('@')[0]);
  const customerPhone = phoneInput ? phoneInput.value.trim() : (loggedInPhone || "غير محدد");

  let serviceDesc = `شحن كوينز: ${formatCoins(currentCoins)}`;
  if (activeCoupon) {
    serviceDesc += ` (كوبون: ${activeCoupon.code})`;
  }

  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPrice) + ' ' + cur.symbol;
  const platformName = currentPlatform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس (Console)';

  const msg = `🪙 طلب شحن كوينز جديد — Trivela\n\n` +
              `🕹️ الجهاز: ${platformName}\n` +
              `📦 الكمية: ${formatCoins(currentCoins)}\n` +
              `💵 الاجمالي: ${formattedPrice}\n` +
              `📝 الاسم: ${customerName}\n` +
              `📞 الجوال: ${customerPhone}\n\n` +
              `_أرسل من Trivela.com_`;

  const orderPayload = {
    customerName: customerName,
    customerPhone: customerPhone,
    service: serviceDesc,
    platform: currentPlatform,
    priceSAR: finalPriceSAR,
    pointsDiscount: pointsDiscountValSAR + couponDiscountValSAR,
    pointsDeducted: pointsDeducted,
    couponCode: activeCoupon ? activeCoupon.code : null,
    eaEmail: email,
    eaPassword: password,
    backupCode1: code1,
    backupCode2: code2,
    backupCode3: code3
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  })
    .then(res => res.json())
    .then(data => {
      if (submitBtn) {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
      }
      if (data.success && data.order) {
        showOrderSuccessPopup(data.order.id, dynamicSettings.whatsappPhone || '966500000000', msg);
      } else {
        alert("حدث خطأ أثناء تسجيل طلبك.");
      }
    })
    .catch(err => {
      if (submitBtn) {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
      }
      console.warn("Could not log order details:", err);
      alert("حدث خطأ في الاتصال بالخادم.");
    });
}

function switchCoinsTab(tabId) {
  const btnSafety = document.getElementById('btnTabSafety');
  const btnRules = document.getElementById('btnTabRules');
  const btnSteps = document.getElementById('btnTabSteps');
  const panelSafety = document.getElementById('panelSafety');
  const panelRules = document.getElementById('panelRules');
  const panelSteps = document.getElementById('panelSteps');

  if (btnSafety) btnSafety.classList.remove('active');
  if (btnRules) btnRules.classList.remove('active');
  if (btnSteps) btnSteps.classList.remove('active');
  if (panelSafety) panelSafety.classList.remove('active');
  if (panelRules) panelRules.classList.remove('active');
  if (panelSteps) panelSteps.classList.remove('active');

  if (tabId === 'safety') {
    if (btnSafety) btnSafety.classList.add('active');
    if (panelSafety) panelSafety.classList.add('active');
  } else if (tabId === 'rules') {
    if (btnRules) btnRules.classList.add('active');
    if (panelRules) panelRules.classList.add('active');
  } else if (tabId === 'steps') {
    if (btnSteps) btnSteps.classList.add('active');
    if (panelSteps) panelSteps.classList.add('active');
  }
}

function openDetailsModal() {
  const modal = document.getElementById('coinsDetailsModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('coinsDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Success Popup Helpers
function showOrderSuccessPopup(orderId, whatsappPhone, messageText) {
  let overlay = document.getElementById('orderSuccessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'orderSuccessOverlay';
    overlay.className = 'order-success-overlay';
    document.body.appendChild(overlay);
  }

  // Parse details from messageText
  let customerName = 'غير محدد';
  let serviceName = 'شحن كوينز';
  let platform = 'CONSOLE';
  let priceStr = '0.00 ر.س';

  try {
    const lines = messageText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('الاسم:')) {
        customerName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('المنصة:') || trimmed.includes('الجهاز:')) {
        platform = trimmed.split(':')[1].trim().toUpperCase();
      } else if (trimmed.includes('الكمية:')) {
        serviceName = 'شحن كوينز: ' + trimmed.split(':')[1].trim();
      } else if (trimmed.includes('الاجمالي:') || trimmed.includes('إجمالي السعر:')) {
        priceStr = trimmed.split(':')[1].trim();
      }
    });
  } catch (err) {
    console.warn("Error parsing messageText:", err);
  }

  overlay.innerHTML = `
    <div class="order-success-card receipt-style">
      <div class="receipt-header">
        <img src="logo-official.png" class="receipt-logo" alt="Trivela" />
        <h3 class="receipt-title">سند استلام إلكتروني</h3>
        <p class="receipt-subtitle">متجر تريفيلا — متجر خدمات FIFA 27 المعتمد</p>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <span class="label">رقم الطلب:</span>
          <span class="value" style="font-family: 'Montserrat', sans-serif; font-weight: 800;">#${orderId}</span>
        </div>
        <div class="receipt-row">
          <span class="label">العميل:</span>
          <span class="value">${customerName}</span>
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
        <div class="receipt-row total">
          <span class="label">المبلغ الإجمالي:</span>
          <span class="value">${priceStr}</span>
        </div>
      </div>
      
      <div class="receipt-footer-msg">
        <i class="fas fa-info-circle"></i>
        تم تسجيل طلبك بنجاح في النظام. يرجى الانتظار، وسيقوم أحد ممثلي الدعم الفني بالتواصل معك قريباً على رقم الجوال/الواتساب لتأكيد الدفع وإتمام الطلب.
      </div>
      
      <button type="button" class="order-success-btn" id="btnRedirectWhatsapp" style="width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px;">
        <span>حسناً، بانتظاركم</span>
      </button>
      
      <div class="receipt-bottom-decoration"></div>
    </div>
  `;

  overlay.classList.add('open');

  const btn = document.getElementById('btnRedirectWhatsapp');
  if (btn) {
    btn.onclick = () => {
      overlay.classList.remove('open');
      window.location.href = 'index.html';
    };
  }
}

// Scroll to a specific step block smooth-scrolling
function scrollToStep(stepNum) {
  const el = document.getElementById(`stepBlock${stepNum}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Dynamically compute and update step progress indicator
function updateCheckoutProgress() {
  let percent = 33; // Starts at 33% since steps 1 & 2 are completed by default
  
  const name = document.getElementById('customerName')?.value.trim();
  const phone = document.getElementById('customerPhone')?.value.trim();
  const step3Active = !!(name && phone);
  
  const email = document.getElementById('eaEmail')?.value.trim();
  const password = document.getElementById('eaPassword')?.value.trim();
  const backup1 = document.getElementById('backup1')?.value.trim();
  const step4Active = !!(email && password && backup1);

  const pStep3 = document.getElementById('pStep3');
  const pStep4 = document.getElementById('pStep4');
  
  if (pStep3) {
    if (step3Active) {
      pStep3.classList.add('active');
      percent = 66;
    } else {
      pStep3.classList.remove('active');
    }
  }

  if (pStep4) {
    if (step3Active && step4Active) {
      pStep4.classList.add('active');
      percent = 100;
    } else {
      pStep4.classList.remove('active');
    }
  }

  const fill = document.getElementById('progressLineFill');
  if (fill) {
    fill.style.width = `${percent}%`;
  }
}

// Spark shimmering skeleton loading state for price displays
function triggerPriceSkeleton() {
  const displayPrice = document.getElementById('displayPrice');
  const summaryPrice = document.getElementById('summaryPrice');
  
  if (displayPrice) displayPrice.classList.add('skeleton-pulse');
  if (summaryPrice) summaryPrice.classList.add('skeleton-pulse');

  setTimeout(() => {
    if (displayPrice) displayPrice.classList.remove('skeleton-pulse');
    if (summaryPrice) summaryPrice.classList.remove('skeleton-pulse');
  }, 350);
}
