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
let activeCoachingServices = [];
let selectedCoachingId = null;

// Loyalty & Coupon State
let dynamicCoupons = {};
let activeCoupon = null;
let usePointsActive = false;
let userPoints = 0;
let loggedInName = "";
let loggedInPhone = "";

// Fetch configs
function fetchSettings() {
  const p1 = fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;

        // Redirect if service is disabled
        if (dynamicSettings.enableServiceCoaching === false) {
          alert("عذراً، خدمة التدريب المباشر متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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
    });

  const p2 = fetch('/api/public/coupons')
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
    });

  return Promise.all([p1, p2]).catch(err => console.warn("Could not fetch settings dynamically:", err));
}

// Initialize on page load
function applyCMSPageContent() {
  const content = dynamicSettings.content;
  if (!content || !content.coachingPage) return;
  const cp = content.coachingPage;
  
  const title = document.getElementById('cms_coachingTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_coachingDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_coachingHint');
  if (hint && cp.hint) hint.textContent = cp.hint;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchSettings().then(() => {
    applyCMSPageContent();
    // Parse url parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }

    loadDynamicCoaching();
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
      
      const contactNameInput = document.getElementById('contactName');
      if (contactNameInput && loggedInName) {
        contactNameInput.value = loggedInName;
      }
      const customerPhoneInput = document.getElementById('customerPhone');
      if (customerPhoneInput && loggedInPhone) {
        customerPhoneInput.value = loggedInPhone;
      }

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

// Load dynamic coaching from API
// Load dynamic coaching from settings content CMS
function loadDynamicCoaching() {
  const grid = document.getElementById('coachingGrid');
  if (!grid) return;

  activeCoachingServices = (dynamicSettings && dynamicSettings.content && dynamicSettings.content.coaching) || [];
  
  if (activeCoachingServices.length === 0) {
    document.getElementById('noCoachingText').style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  
  document.getElementById('noCoachingText').style.display = 'none';
  renderCoachingList();

  // Check for service URL parameter to auto-select
  const params = new URLSearchParams(window.location.search);
  const serviceParam = params.get('service');
  if (serviceParam) {
    const found = activeCoachingServices.find(s => s.id === serviceParam);
    if (found) {
      selectCoaching(serviceParam);
      setTimeout(() => {
        const el = document.getElementById('stepBlock3');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }
}

function renderCoachingList() {
  const grid = document.getElementById('coachingGrid');
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  grid.innerHTML = activeCoachingServices.map(p => {
    // Convert price (stored as USD in schema, convert based on rate)
    const priceUSD = p.priceUSD;
    const finalPriceVal = priceUSD * cur.rate;
    const formattedPrice = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(finalPriceVal) + ' ' + cur.symbol;

    const isActive = p.id === selectedCoachingId ? 'active' : '';

    return `
      <div class="player-card-btn ${isActive}" onclick="selectCoaching('${p.id}')">
        <div class="pcb-card-avatar-wrap">
          <img src="${p.image || 'logo-official.png'}" class="pcb-avatar" alt="${p.name}"/>
          <span class="pcb-rating"><i class="fas fa-chalkboard-user"></i></span>
        </div>
        <div class="pcb-details">
          <h4 class="pcb-name">${p.name}</h4>
          <div class="pcb-meta" style="flex-direction:column; align-items:start; gap:4px; margin-bottom:8px;">
            <p style="font-size:0.75rem; color:var(--text-gray); margin:0; line-height:1.4;">${p.description || ''}</p>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
              ${(p.features || []).map(f => `<span style="background:rgba(48,83,136,0.06); color:var(--blue-600); padding:2px 6px; border-radius:4px; font-size:0.65rem; font-weight:700;">${f}</span>`).join('')}
            </div>
          </div>
          <div class="pcb-price">${formattedPrice}</div>
        </div>
      </div>
    `;
  }).join('');
}

function selectCoaching(id) {
  selectedCoachingId = id;
  const btns = document.querySelectorAll('.player-card-btn');
  btns.forEach(btn => btn.classList.remove('active'));
  
  renderCoachingList();
  updatePriceAndSummary();
}

function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let finalPrice = 0;
  let summaryText = 'لم يتم اختيار خدمة';

  if (selectedCoachingId) {
    const service = activeCoachingServices.find(p => p.id === selectedCoachingId);
    if (service) {
      finalPrice = service.priceUSD * cur.rate;
      summaryText = service.name;
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
let orderSuccessMsg = '';

// Expose success actions globally
window.closeSuccessOverlay = function() {
  const overlay = document.getElementById('orderSuccessOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    window.location.href = 'index.html';
  }
}

function handlePurchaseSubmit(event) {
  event.preventDefault();

  if (!selectedCoachingId) {
    alert("يرجى اختيار الخدمة أو الاستشارة الفنية للمتابعة.");
    return;
  }

  const service = activeCoachingServices.find(p => p.id === selectedCoachingId);
  if (!service) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let basePriceVal = (service.priceUSD || (service.priceSAR / 3.75)) * cur.rate;
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

  const contactName = document.getElementById('contactName').value.trim();
  const discord = document.getElementById('contactDiscord').value.trim() || 'غير مزود';
  const notes = document.getElementById('coachingNotes').value.trim() || 'بدون ملاحظات إضافية';
  const platformName = currentPlatform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس (Console)';

  let msg = `🎮 طلب حجز خدمة استشارات فنية جديد — Trivela\n\n` +
            `🌟 الخدمة المطلوبة: ${service.name}\n` +
            `🕹️ المنصة: ${platformName}\n` +
            `💵 الاجمالي: ${formattedPrice}\n`;

  if (couponDiscountText) {
    msg += `${couponDiscountText}\n`;
  }
  if (pointsDiscountText) {
    msg += `${pointsDiscountText}\n`;
  }
  
  msg += `\n👤 معلومات العميل والتواصل:\n` +
         `📝 الاسم: ${contactName}\n` +
         `💬 ديسكورد/تواصل: ${discord}\n` +
         `📋 تفاصيل وملاحظات الطلب:\n"${notes}"\n\n` +
         `_أرسل من Trivela.com_`;

  const phoneInput = document.getElementById('customerPhone');
  const customerPhone = phoneInput ? phoneInput.value.trim() : (loggedInPhone || "غير محدد");

  // Calculate final price in SAR for database with fallback
  const baseSAR = service.priceSAR || (service.priceUSD * 3.75);
  const couponDiscountSAR = activeCoupon ? (baseSAR * (activeCoupon.percent / 100)) : 0;
  const remainingAfterCouponSAR = baseSAR - couponDiscountSAR;
  const pointsDiscountSAR = (pointsDeducted / 37.5) * 3.75;
  const finalPriceSAR = Math.max(0, remainingAfterCouponSAR - pointsDiscountSAR);

  const orderPayload = {
    customerName: contactName,
    customerPhone: customerPhone,
    service: `استشارة: ${service.name}`,
    platform: currentPlatform,
    priceSAR: finalPriceSAR,
    pointsDiscount: pointsDiscountSAR + couponDiscountSAR,
    pointsDeducted: pointsDeducted,
    couponCode: activeCoupon ? activeCoupon.code : null,
    discordHandle: discord,
    orderNotes: notes
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
  // Reset page scroll position to top
  window.scrollTo(0, 0);

  let overlay = document.getElementById('orderSuccessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'orderSuccessOverlay';
    overlay.className = 'order-success-overlay';
    document.body.appendChild(overlay);
  }

  // Force inline fixed styles to guarantee full viewport centering
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '999999';

  // Parse details from messageText
  let customerName = 'غير محدد';
  let serviceName = 'جلسة تدريب / استشارة';
  let platform = 'CONSOLE';
  let priceStr = '0.00 ر.س';

  try {
    const lines = messageText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('الاسم:')) {
        customerName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('المنصة:') || trimmed.includes('المنصة :') || trimmed.includes('🕹️ المنصة:')) {
        platform = trimmed.split(':')[1].trim().toUpperCase();
      } else if (trimmed.includes('الخدمة المطلوبة:') || trimmed.includes('الخدمة :')) {
        serviceName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('الاجمالي:') || trimmed.includes('السعر الإجمالي:') || trimmed.includes('الأسعار:') || trimmed.includes('السعر:')) {
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
