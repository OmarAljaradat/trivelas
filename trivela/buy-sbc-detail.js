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

let currentPlatform = 'console';
let clubCount = 1;
let currentChallenge = null;

// Coupon / Loyalty State
let activeCoupon = null;
let usePointsActive = false;
/* dynamicCoupons removed */

// Loyalty State
let userPoints = 0;
let loggedInName = "";
let loggedInPhone = "";

// Fetch configs
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;
      }
    })
    .catch(err => console.warn("Could not fetch settings dynamically:", err));
}

// Initialize details on load

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
          dynamicCoupons[c.code.toUpperCase()] = c.percent;
        }
      });
    })
    .catch(err => console.warn("Could not fetch coupons dynamically:", err));
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([fetchSettings(), fetchDynamicCoupons()]).then(() => {
    loadChallengeDetails();
    loadUserLoyalty();
    const block = document.getElementById('loyaltyPointsBlock');
    if (block) block.style.display = 'block';
  });
});

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
      setTimeout(() => {
        const el = document.getElementById('stepBlock3');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    })
    .catch(err => {
      console.error("Error loading challenge:", err);
      alert("حدث خطأ أثناء تحميل بيانات التحدي.");
      window.location.href = 'buy-sbc.html';
    });
}

function renderChallengeUI() {
  if (!currentChallenge) return;

  // Title & Image
  document.getElementById('detailChallengeTitle').textContent = currentChallenge.name;
  document.getElementById('detailPlayerImage').src = currentChallenge.image;

  // Update prices
  updatePriceAndSummary();
}

function updatePriceAndSummary() {
  if (!currentChallenge) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  // Console Prices
  const priceConsoleSAR = currentChallenge.priceSAR;
  const priceConsoleUSD = currentChallenge.priceUSD;
  
  let finalConsoleVal = priceConsoleSAR;
  if (selectedCurrency !== 'SAR') {
    finalConsoleVal = priceConsoleUSD * cur.rate;
  }
  const formattedConsole = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalConsoleVal) + ' ' + cur.symbol;
  document.getElementById('priceBadgeConsole').textContent = formattedConsole;

  // PC Prices (derived or defined)
  const pricePCSAR = currentChallenge.pricePCSAR || (priceConsoleSAR + 10);
  const pricePCUSD = currentChallenge.pricePCUSD || (priceConsoleUSD + 3);

  let finalPCVal = pricePCSAR;
  if (selectedCurrency !== 'SAR') {
    finalPCVal = pricePCUSD * cur.rate;
  }
  const formattedPC = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPCVal) + ' ' + cur.symbol;
  document.getElementById('priceBadgePC').textContent = formattedPC;

  // Final price to display in form
  let finalPriceVal = currentPlatform === 'pc' ? finalPCVal : finalConsoleVal;

  // 1. Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = finalPriceVal * (activeCoupon.percent / 100);
    finalPriceVal -= couponDiscountValue;
  }

  // 2. Loyalty Points Discount
  let pointsDiscountValue = 0;
  let pointsDeducted = 0;

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;

    pointsDiscountValue = Math.min(finalPriceVal, maxDiscountConverted);
    finalPriceVal -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
  }

  const formattedFinal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPriceVal) + ' ' + cur.symbol;
  
  document.getElementById('finalPriceText').textContent = formattedFinal;

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }
}

// Load user details
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
        const lblPointsBalance = document.getElementById('lblLoyaltyPointsBalance');
        if (lblPointsBalance) lblPointsBalance.textContent = userPoints;
        updatePointsDisplayVal();
        
        const loyaltyRow = document.getElementById('loyaltyOptionRow');
        const loyaltyDivider = document.getElementById('loyaltyPointsDivider');
        if (loyaltyRow) loyaltyRow.style.display = 'block';
        if (loyaltyDivider) loyaltyDivider.style.display = 'block';
      }
    }
  })
  .catch(err => console.log("Loyalty details load skipped."));
}

function updatePointsDisplayVal() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const valUSD = userPoints / 37.5;
  const valConverted = valUSD * cur.rate;

  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(valConverted) + ' ' + cur.symbol;

  const lblDiscount = document.getElementById('lblPointsDiscountSAR');
  if (lblDiscount) lblDiscount.textContent = formattedVal;
}

function togglePointsDiscount() {
  updatePriceAndSummary();
}

function selectPlatform(platform) {
  const btnPC = document.getElementById('btnPlatformPC');
  const btnConsole = document.getElementById('btnPlatformConsole');

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

function selectClubCount(count) {
  clubCount = count;
  document.getElementById('clubBtn1').classList.toggle('active', count === 1);
  document.getElementById('clubBtn2').classList.toggle('active', count === 2);
  
  const group = document.getElementById('clubNameGroup');
  const input = document.getElementById('eaClubName');
  if (group && input) {
    if (count === 2) {
      group.style.display = 'block';
      input.required = true;
    } else {
      group.style.display = 'none';
      input.required = false;
      input.value = '';
    }
  }
}

function switchTab(tabId) {
  const btnOptions = document.getElementById('btnTabOptions');
  const btnDetails = document.getElementById('btnTabDetails');
  const panelOptions = document.getElementById('panelOptions');
  const panelDetails = document.getElementById('panelDetails');

  if (tabId === 'options') {
    btnOptions.classList.add('active');
    btnDetails.classList.remove('active');
    panelOptions.classList.add('active');
    panelDetails.classList.remove('active');
  } else {
    btnDetails.classList.add('active');
    btnOptions.classList.remove('active');
    panelDetails.classList.add('active');
    panelOptions.classList.remove('active');
  }
}

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

// Handle checkout submission
function handlePurchaseSubmit(event) {
  event.preventDefault();
  if (!currentChallenge) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const priceConsoleSAR = currentChallenge.priceSAR;
  const priceConsoleUSD = currentChallenge.priceUSD;
  const pricePCSAR = currentChallenge.pricePCSAR || (priceConsoleSAR + 10);
  const pricePCUSD = currentChallenge.pricePCUSD || (priceConsoleUSD + 3);

  let finalPriceVal = currentPlatform === 'pc' ? pricePCSAR : priceConsoleSAR;
  let finalPriceUSD = currentPlatform === 'pc' ? pricePCUSD : priceConsoleUSD;

  let couponDiscountValue = 0;
  let couponDiscountText = '';
  let finalPriceInCurr = finalPriceUSD * cur.rate;

  // 1. Coupon Discount calculation
  if (activeCoupon) {
    couponDiscountValue = finalPriceInCurr * (activeCoupon.percent / 100);
    finalPriceInCurr -= couponDiscountValue;
    
    const formattedCoupon = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(couponDiscountValue) + ' ' + cur.symbol;
    
    couponDiscountText = `🏷️ كوبون خصم (${activeCoupon.code}): -${formattedCoupon} (${activeCoupon.percent}%)\n`;
  }

  // 2. Loyalty Points Discount calculation
  let pointsDeducted = 0;
  let pointsDiscountValue = 0;
  let pointsDiscountText = '';

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;
    
    pointsDiscountValue = Math.min(finalPriceInCurr, maxDiscountConverted);
    finalPriceInCurr -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
    
    const formattedDiscount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(pointsDiscountValue) + ' ' + cur.symbol;

    pointsDiscountText = `🎁 خصم نقاط الولاء: -${formattedDiscount} (${pointsDeducted} نقطة مستخدمة)\n`;
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPriceInCurr) + ' ' + cur.symbol;

  const email = document.getElementById('eaEmail').value;
  const password = document.getElementById('eaPassword').value;
  const code1 = document.getElementById('backup1').value.trim();
  const code2 = document.getElementById('backup2').value.trim() || '—';
  const code3 = document.getElementById('backup3').value.trim() || '—';
  
  const platformName = currentPlatform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس (Console)';
  const clubsCountText = clubCount === 1 ? 'نادي واحد' : `اثنين وأكثر (اسم النادي: ${document.getElementById('eaClubName').value.trim()})`;

  let msg = `🎮 طلب إنهاء تحدي SBC جديد — Trivela\n\n` +
            `🧩 التحدي المطلوب: ${currentChallenge.name}\n` +
            `🕹️ المنصة: ${platformName}\n` +
            `🏠 عدد النوادي: ${clubsCountText}\n` +
            `💵 الاجمالي: ${formattedPrice}\n`;

  if (couponDiscountText) {
    msg += couponDiscountText;
  }
  if (pointsDiscountText) {
    msg += pointsDiscountText;
  }

  msg += `\n🔑 بيانات الحساب المرفقة:\n` +
         `📧 الايميل: ${email}\n` +
         `🔒 كلمة المرور: ${password}\n` +
         `🔐 الرموز الاحتياطية: ${code1} - ${code2} - ${code3}\n\n` +
         `_أرسل من Trivela.com_`;

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const customerName = nameInput ? nameInput.value.trim() : (loggedInName || email.split('@')[0]);
  const customerPhone = phoneInput ? phoneInput.value.trim() : (loggedInPhone || "غير محدد");

  // Calculate final price in SAR for DB
  let finalPriceSAR = currentPlatform === 'pc' ? pricePCSAR : priceConsoleSAR;
  let couponDiscountSAR = 0;
  if (activeCoupon) {
    couponDiscountSAR = finalPriceSAR * (activeCoupon.percent / 100);
    finalPriceSAR -= couponDiscountSAR;
  }
  let pointsDiscountSAR = (pointsDeducted / 37.5) * 3.75;
  finalPriceSAR = Math.max(0, finalPriceSAR - pointsDiscountSAR);

  const orderPayload = {
    customerName: customerName,
    customerPhone: customerPhone,
    service: `SBC تحدي: ${currentChallenge.name} (${clubsCountText})` + (activeCoupon ? ` (كوبون: ${activeCoupon.code})` : ''),
    platform: currentPlatform,
    priceSAR: finalPriceSAR,
    pointsDiscount: pointsDiscountSAR + couponDiscountSAR,
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
      if (data.success && data.order) {
        showOrderSuccessPopup(data.order.id, dynamicSettings.whatsappPhone || '966500000000', msg);
      } else {
        alert("حدث خطأ أثناء تسجيل طلبك.");
      }
    })
    .catch(err => {
      console.warn("Could not log order details:", err);
      alert("حدث خطأ في الاتصال بالخادم.");
    });
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
  let customerName = 'غير مححدد';
  let serviceName = 'تحدي SBC';
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
      } else if (trimmed.includes('التحدي المطلوب:')) {
        serviceName = 'SBC: ' + trimmed.split(':')[1].trim();
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

// Handle radio toggle between Coupon and Points
function handleDiscountTypeChange() {
  const radCoupon = document.getElementById('radCoupon');
  const couponWrapper = document.getElementById('couponInputWrapper');
  const pointsWrapper = document.getElementById('pointsInputWrapper');

  if (radCoupon && radCoupon.checked) {
    if (couponWrapper) couponWrapper.style.display = 'block';
    if (pointsWrapper) pointsWrapper.style.display = 'none';
    
    // Clear points discount if they switched to coupon
    usePointsActive = false;
    const link = document.getElementById('btnApplyPoints');
    if (link) {
      link.textContent = "اضغط هنا للتفعيل";
      link.style.color = "#ca8a04";
    }
  } else {
    if (couponWrapper) couponWrapper.style.display = 'none';
    if (pointsWrapper) pointsWrapper.style.display = 'block';
    
    // Clear coupon if they switched to points
    activeCoupon = null;
    const msg = document.getElementById('couponStatusMessage');
    if (msg) {
      msg.textContent = "";
      msg.className = "coupon-status-msg";
    }
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
    msg.textContent = "يرجى إدخال رمز الكوبون.";
    msg.className = "coupon-status-msg error";
    activeCoupon = null;
    updatePriceAndSummary();
    return;
  }

  if (dynamicCoupons[code] !== undefined) {
    activeCoupon = {
      code: code,
      percent: dynamicCoupons[code]
    };
    msg.className = "coupon-status-msg success";
    msg.textContent = `تم تطبيق الكوبون بنجاح! خصم ${dynamicCoupons[code]}%`;
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "رمز الكوبون غير صحيح أو منتهي الصلاحية.";
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
    link.style.color = "#ca8a04";
  } else {
    usePointsActive = true;
    link.textContent = "تم التفعيل (اضغط للإلغاء)";
    link.style.color = "#10b981";
  }
  updatePriceAndSummary();
}

// Bind to window to ensure global availability
window.handleDiscountTypeChange = handleDiscountTypeChange;
window.applyCouponCode = applyCouponCode;
window.togglePointsUsage = togglePointsUsage;
