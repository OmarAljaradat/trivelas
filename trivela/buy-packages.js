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
let activePackages = [];
let allPlayers = [];  // full catalog cache for resolving bundlePlayerId
let selectedPackageId = null;

// Pagination state
let currentPage = 1;
const PACKAGES_PER_PAGE = 6;

// Loyalty & Coupon State
/* dynamicCoupons removed */
let activeCoupon = null;
let usePointsActive = false;
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

        // Redirect if service is disabled
        if (dynamicSettings.enableServicePackages === false) {
          alert("عذراً، خدمة الباقات المجمعة متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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
      }
    })
    .catch(err => console.warn("Could not fetch settings dynamically:", err));
}

// Initialize on page load
function applyCMSPageContent() {
  const content = dynamicSettings.content;
  if (!content || !content.packagesPage) return;
  const cp = content.packagesPage;
  
  const title = document.getElementById('cms_packagesTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_packagesDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_packagesHint');
  if (hint && cp.hint) hint.textContent = cp.hint;
}


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
    applyCMSPageContent();
    // Parse url parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }

    loadDynamicPackages();
    loadUserLoyalty();
  });
});

// Load user session loyalty details
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
        
        document.getElementById('loyaltyPointsBlock').style.display = 'block';
        const loyaltyDividerMain = document.getElementById('loyaltyDivider');
        if (loyaltyDividerMain) loyaltyDividerMain.style.display = 'block';
      }
    }
  })
  .catch(err => console.log("User not logged in or session expired."));
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

function handleDiscountTypeChange() {
  const radCoupon = document.getElementById('radCoupon');
  const couponWrapper = document.getElementById('couponInputWrapper');
  const pointsWrapper = document.getElementById('pointsInputWrapper');

  if (radCoupon && radCoupon.checked) {
    if (couponWrapper) couponWrapper.style.display = 'block';
    if (pointsWrapper) pointsWrapper.style.display = 'none';
    
    usePointsActive = false;
    const link = document.getElementById('btnApplyPoints');
    if (link) {
      link.textContent = "اضغط هنا للتفعيل";
      link.style.color = "#ca8a04";
    }
  } else {
    if (couponWrapper) couponWrapper.style.display = 'none';
    if (pointsWrapper) pointsWrapper.style.display = 'block';
    
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

window.handleDiscountTypeChange = handleDiscountTypeChange;
window.applyCouponCode = applyCouponCode;
window.togglePointsUsage = togglePointsUsage;

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

// Load dynamic packages from the catalog API
function loadDynamicPackages() {
  const grid = document.getElementById('packagesGrid');
  if (!grid) return;

  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      // Cache full catalog to resolve bundlePlayerId
      allPlayers = data || [];
      // Filter packages category
      activePackages = data.filter(p => p.category === 'packages');
      
      if (activePackages.length === 0) {
        document.getElementById('noPackagesText').style.display = 'block';
        grid.innerHTML = '';
        return;
      }
      
      document.getElementById('noPackagesText').style.display = 'none';

      // Check for service URL parameter to auto-select and auto-switch to correct page
      const params = new URLSearchParams(window.location.search);
      const serviceParam = params.get('service');
      if (serviceParam) {
        const foundIndex = activePackages.findIndex(s => s.id === serviceParam);
        if (foundIndex !== -1) {
          currentPage = Math.floor(foundIndex / PACKAGES_PER_PAGE) + 1;
          selectedPackageId = serviceParam;
          setTimeout(() => {
            const el = document.getElementById('stepBlock3');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 400);
        }
      }

      renderPackagesList();
    })
    .catch(err => {
      console.error("Error loading packages:", err);
      document.getElementById('noPackagesText').style.display = 'block';
    });
}

function renderPackagesList() {
  const grid = document.getElementById('packagesGrid');
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  // Pagination Slice
  const startIndex = (currentPage - 1) * PACKAGES_PER_PAGE;
  const paginatedPackages = activePackages.slice(startIndex, startIndex + PACKAGES_PER_PAGE);

  grid.innerHTML = paginatedPackages.map(p => {
    const isPC = currentPlatform === 'pc';
    const priceUSD = isPC ? (p.pricePCUSD || p.priceUSD) : p.priceUSD;
    const originalPriceUSD = p.originalPriceSAR ? (p.originalPriceSAR / 3.75) : null;

    const finalPriceVal = priceUSD * cur.rate;
    const originalPriceVal = originalPriceUSD ? originalPriceUSD * cur.rate : null;

    const fmt = v => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(v) + ' ' + cur.symbol;

    const formattedPrice = fmt(finalPriceVal);
    const formattedOriginal = originalPriceVal ? fmt(originalPriceVal) : null;

    const isActive = p.id === selectedPackageId ? 'active' : '';
    const discount = p.discountPercent || 0;
    const coinsAmount = p.coinsAmount || 0;
    const coinsFormatted = coinsAmount >= 1000000
      ? (coinsAmount / 1000000).toFixed(coinsAmount % 1000000 === 0 ? 0 : 1) + 'M'
      : coinsAmount >= 1000
        ? (coinsAmount / 1000).toFixed(0) + 'K'
        : coinsAmount.toString();

    // Resolve linked player name from allPlayers cache if available
    const linkedPlayer = allPlayers.find(pl => pl.id === p.bundlePlayerId);
    const playerName = linkedPlayer ? linkedPlayer.name : (p.name || 'باقة مميزة');
    const playerImg = linkedPlayer ? linkedPlayer.image : p.image;

    return `
      <div class="pkg-bundle-card ${isActive}" id="pkg_${p.id}" onclick="selectPackage('${p.id}')">
        ${discount > 0 ? `<div class="pkg-discount-badge">وفّر ${discount}%</div>` : ''}

        <div class="pkg-header-wrap">
          <div class="pkg-badge-pill">${p.version || 'باقة مميزة'}</div>
          <h3 class="pkg-card-title">${p.name || 'باقة مميزة'}</h3>
        </div>

        <div class="pkg-main-body">
          <div class="pkg-feature-item">
            <div class="pkg-feature-icon">🪙</div>
            <div class="pkg-feature-info">
              <span class="pkg-feature-val">${coinsFormatted}</span>
              <span class="pkg-feature-lbl">كوينز FUT</span>
            </div>
          </div>
          <div class="pkg-feature-item">
            <div class="pkg-feature-icon">🎮</div>
            <div class="pkg-feature-info">
              <span class="pkg-feature-val">${p.position || 'خدمة مجمعة'}</span>
              <span class="pkg-feature-lbl">الخدمة المرفقة</span>
            </div>
          </div>
        </div>

        <div class="pkg-pricing-section">
          <div class="pkg-price-label">السعر الإجمالي:</div>
          <div class="pkg-price-row">
            ${formattedOriginal ? `<span class="pkg-old-price">${formattedOriginal}</span>` : ''}
            <span class="pkg-new-price">${formattedPrice}</span>
          </div>
        </div>

        <!-- Selected Check Overlay -->
        <div class="pkg-selected-check"><i class="fas fa-check-circle"></i></div>
      </div>
    `;
  }).join('');

  renderPaginationControls();
}

function renderPaginationControls() {
  const container = document.getElementById('packagesPagination');
  if (!container) return;

  const totalPages = Math.ceil(activePackages.length / PACKAGES_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  // Generate pagination buttons with custom premium inline styling
  let html = '';
  
  // Previous button
  html += `
    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePackagesPage(${currentPage - 1})" style="padding: 8px 14px; background: var(--blue-50); border: 1px solid var(--blue-100); color: var(--blue-500); border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 38px;">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    const btnStyle = isActive 
      ? 'background: var(--blue-500); color: white; border-color: var(--blue-500);' 
      : 'background: var(--blue-50); color: var(--blue-500); border-color: var(--blue-100);';
    html += `
      <button class="pagination-btn" onclick="changePackagesPage(${i})" style="padding: 8px 14px; ${btnStyle} border: 1px solid var(--blue-100); border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; min-width: 38px; height: 38px; font-family: Montserrat, Cairo, sans-serif;">
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePackagesPage(${currentPage + 1})" style="padding: 8px 14px; background: var(--blue-50); border: 1px solid var(--blue-100); color: var(--blue-500); border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 38px;">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  container.innerHTML = html;
}

window.changePackagesPage = function(page) {
  currentPage = page;
  renderPackagesList();
  const titleGrid = document.getElementById('packagesGrid');
  if (titleGrid) {
    titleGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

function selectPackage(id) {
  selectedPackageId = id;
  document.querySelectorAll('.pkg-bundle-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('pkg_' + id);
  if (card) card.classList.add('active');
  updatePriceAndSummary();
}

function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let finalPrice = 0;
  let summaryText = 'لم يتم اختيار باقة';

  if (selectedPackageId) {
    const pkg = activePackages.find(p => p.id === selectedPackageId);
    if (pkg) {
      finalPrice = pkg.priceUSD * cur.rate;
      summaryText = pkg.name;
    }
  }

  // 1. Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = finalPrice * (activeCoupon.percent / 100);
    finalPrice -= couponDiscountValue;
  }

  // 2. Loyalty Points Discount
  let pointsDiscountValue = 0;
  let pointsDeducted = 0;

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;

    pointsDiscountValue = Math.min(finalPrice, maxDiscountConverted);
    finalPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPrice) + ' ' + cur.symbol;

  document.getElementById('summaryPrice').textContent = formattedPrice;
  document.getElementById('summaryCoins').textContent = summaryText;

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }
}

// Handle Form submit
function handlePurchaseSubmit(event) {
  event.preventDefault();

  if (!selectedPackageId) {
    alert("يرجى اختيار باقة مميزة للمتابعة.");
    return;
  }

  const pkg = activePackages.find(p => p.id === selectedPackageId);
  if (!pkg) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let basePriceVal = pkg.priceUSD * cur.rate;
  let finalPrice = basePriceVal;

  let couponDiscountValue = 0;
  let couponDiscountText = '';
  if (activeCoupon) {
    couponDiscountValue = finalPrice * (activeCoupon.percent / 100);
    finalPrice -= couponDiscountValue;
    
    const formattedDiscount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(couponDiscountValue) + ' ' + cur.symbol;
    
    couponDiscountText = `🏷️ كوبون خصم (${activeCoupon.code}): -${formattedDiscount} (${activeCoupon.percent}%)`;
  }

  let pointsDeducted = 0;
  let pointsDiscountValue = 0;
  let pointsDiscountText = '';
  
  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;
    
    pointsDiscountValue = Math.min(finalPrice, maxDiscountConverted);
    finalPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
    
    const formattedDiscount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(pointsDiscountValue) + ' ' + cur.symbol;
    
    pointsDiscountText = `🎁 خصم نقاط الولاء: -${formattedDiscount} (${pointsDeducted} نقطة مستخدمة)`;
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPrice) + ' ' + cur.symbol;

  const email = document.getElementById('eaEmail').value;
  const password = document.getElementById('eaPassword').value;
  const code1 = document.getElementById('backup1').value;
  const code2 = document.getElementById('backup2').value;
  const code3 = document.getElementById('backup3').value;
  const platformName = currentPlatform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس (Console)';

  let msg = `🎮 طلب باقة عروض جديدة — Trivela\n\n` +
            `🎁 الباقة المطلوبة: ${pkg.name}\n` +
            `🕹️ الجهاز: ${platformName}\n` +
            `💵 الاجمالي: ${formattedPrice}\n`;

  if (couponDiscountText) {
    msg += `${couponDiscountText}\n`;
  }
  if (pointsDiscountText) {
    msg += `${pointsDiscountText}\n`;
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

  // Calculate final price in SAR for database
  const baseSAR = pkg.priceSAR || (pkg.priceUSD * 3.75);
  const couponDiscountSAR = activeCoupon ? (baseSAR * (activeCoupon.percent / 100)) : 0;
  const remainingAfterCouponSAR = baseSAR - couponDiscountSAR;
  const pointsDiscountSAR = (pointsDeducted / 37.5) * 3.75;
  const finalPriceSAR = Math.max(0, remainingAfterCouponSAR - pointsDiscountSAR);

  const orderPayload = {
    customerName: customerName,
    customerPhone: customerPhone,
    service: `باقة مميزة: ${pkg.name}`,
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
  let serviceName = 'باقة ترويجية';
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
      } else if (trimmed.includes('الباقة المطلوبة:')) {
        serviceName = 'باقة: ' + trimmed.split(':')[1].trim();
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
