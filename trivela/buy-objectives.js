// Configuration & Exchange Rates
let dynamicSettings = {
  whatsappPhone: "966555555555",
  instagramUrl: "https://instagram.com/TrivelaOfficial",
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

// Current State
let currentPlatform = 'console';
let activePlayers = [];
// Loyalty & Coupon State
/* dynamicCoupons removed */
let activeCoupon = null;
let usePointsActive = false;
let userPoints = 0;
let loggedInName = "";
let loggedInPhone = "";

// Helper: Toggle Checkbox Card styling
window.toggleCheckboxCard = function(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox) {
      card.classList.toggle('active', checkbox.checked);
    }
  }
};

// Fetch settings from server
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;

        // Redirect if service is disabled
        if (dynamicSettings.enableServiceObjectives === false) {
          alert("عذراً، خدمة إنجاز المهام متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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
    .catch(err => {
      console.warn("Could not fetch settings dynamically:", err);
    });
}

function applyCMSPageContent() {
  const content = dynamicSettings.content;
  if (!content || !content.objectivesPage) return;
  const cp = content.objectivesPage;
  
  const title = document.getElementById('cms_objectivesTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_objectivesDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_objectivesHint');
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
    // Platform is fixed to PlayStation Console only
    currentPlatform = 'console';

    // Check loyalty points and load dynamic players
    loadUserLoyalty();
    loadDynamicPlayers();
  });
});

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

// Format expiration countdown label helper
function getExpiryInfo(expirationDate) {
  if (!expirationDate) return null;
  const diff = new Date(expirationDate).getTime() - Date.now();
  if (diff <= 0) return { label: 'منتهي', urgent: true };

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) {
    return { label: `${days} يوم`, urgent: false };
  }
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours >= 1) {
    return { label: `${hours} ساعة`, urgent: true };
  }
  const mins = Math.floor(diff / (60 * 1000));
  return { label: `${mins} دقيقة`, urgent: true };
}

// Load players dynamically from database
function loadDynamicPlayers() {
  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      activePlayers = data.filter(p => p.category === 'objectives');
      renderActivePlayersGrid();
    })
    .catch(err => {
      console.warn("Could not fetch active players from database server:", err);
    });
}

// Render dynamic players grid as checkbox cards inside the unified grid
function renderActivePlayersGrid() {
  const grid = document.getElementById('allObjectivesGrid');
  if (!grid) return;

  // Clear previous dynamic cards to avoid duplicates
  const prevDynamicCards = grid.querySelectorAll('.dynamic-objective-card');
  prevDynamicCards.forEach(c => c.remove());

  if (activePlayers.length === 0) {
    return;
  }

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  activePlayers.forEach(p => {
    let finalPrice = p.priceSAR;
    if (selectedCurrency !== 'SAR') {
      finalPrice = p.priceUSD * cur.rate;
    }
    const formattedPrice = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(finalPrice) + ' ' + cur.symbol;

    let badgesHTML = '';
    const expiry = getExpiryInfo(p.expirationDate);
    if (expiry) {
      const urgentClass = expiry.urgent ? 'urgent' : '';
      badgesHTML += `<span class="badge" style="font-size: 0.7rem; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; margin-left: 6px;"><i class="far fa-clock"></i> ${expiry.label}</span>`;
    }

    let metaText = p.version || "مهام";
    if (p.rating > 0) {
      metaText += ` | ${p.rating} ${p.position}`;
    }

    const cardId = `dynamicCard_${p.id}`;
    const card = document.createElement('label');
    card.className = 'objective-checkbox-card dynamic-objective-card';
    card.id = cardId;
    card.innerHTML = `
      <input type="checkbox" name="dynamicObjective" value="مهام اللاعب: ${p.name}" data-price-sar="${p.priceSAR}" data-price-usd="${p.priceUSD}" data-id="${p.id}" onchange="toggleCheckboxCard('${cardId}'); updatePriceAndSummary()"/>
      <div class="obj-card-details">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.image}" alt="${p.name}" style="height: 60px; width: auto; border-radius: 8px; background: rgba(0,0,0,0.05); padding: 2px;"/>
          <div style="display: flex; flex-direction: column;">
            <span class="obj-card-title" style="padding-left: 0; font-size: 0.95rem; margin-top: 0;">${p.name}</span>
            <span class="obj-card-desc" style="margin-top: 4px;">${metaText} ${badgesHTML}</span>
          </div>
        </div>
      </div>
      <div class="obj-card-price">${formattedPrice}</div>
    `;

    grid.appendChild(card);
  });
}

// Update Price & Converted Labels for all selected options
function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }

  let totalRawPrice = 0;
  let selectedNames = [];

  // 1. Process Static checkboxes
  const staticChecked = document.querySelectorAll('input[name="staticObjective"]:checked');
  staticChecked.forEach(chk => {
    const priceUSD = parseFloat(chk.dataset.price);
    const priceConverted = priceUSD * cur.rate;
    totalRawPrice += priceConverted;
    selectedNames.push(chk.value);
  });

  // 2. Process Dynamic checkboxes
  const dynamicChecked = document.querySelectorAll('input[name="dynamicObjective"]:checked');
  dynamicChecked.forEach(chk => {
    const priceSAR = parseFloat(chk.dataset.priceSar);
    const priceUSD = parseFloat(chk.dataset.priceUsd);
    
    let priceConverted = priceSAR;
    if (selectedCurrency !== 'SAR') {
      priceConverted = priceUSD * cur.rate;
    }
    totalRawPrice += priceConverted;
    selectedNames.push(chk.value);
  });

  // Update static card prices labels in real-time
  const staticCards = document.querySelectorAll('.objective-checkbox-card:not([id^="dynamicCard"])');
  staticCards.forEach(card => {
    const chk = card.querySelector('input[type="checkbox"]');
    if (chk) {
      const priceUSD = parseFloat(chk.dataset.price);
      const convertedPrice = priceUSD * cur.rate;
      const formattedPrice = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: cur.dec,
        maximumFractionDigits: cur.dec
      }).format(convertedPrice) + ' ' + cur.symbol;

      const priceTag = card.querySelector('.obj-card-price');
      if (priceTag) priceTag.textContent = formattedPrice;
    }
  });

  // 1. Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = totalRawPrice * (activeCoupon.percent / 100);
    totalRawPrice -= couponDiscountValue;
  }

  // 2. Loyalty Points Discount
  let pointsDiscountValue = 0;
  let pointsDeducted = 0;

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;

    pointsDiscountValue = Math.min(totalRawPrice, maxDiscountConverted);
    totalRawPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
  }

  const finalFormattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(totalRawPrice) + ' ' + cur.symbol;

  const summaryPrice = document.getElementById('summaryPrice');
  const summaryServiceText = document.getElementById('summaryServiceText');

  if (summaryPrice) summaryPrice.textContent = finalFormattedPrice;
  
  if (summaryServiceText) {
    if (selectedNames.length > 0) {
      summaryServiceText.textContent = selectedNames.join(' | ');
    } else {
      summaryServiceText.textContent = "لم يتم اختيار أي مهمة بعد";
    }
  }
}

// Form Submission
function handlePurchaseSubmit(event) {
  event.preventDefault();

  const staticChecked = document.querySelectorAll('input[name="staticObjective"]:checked');
  const dynamicChecked = document.querySelectorAll('input[name="dynamicObjective"]:checked');
  
  if (staticChecked.length === 0 && dynamicChecked.length === 0) {
    alert("يرجى اختيار مهمة واحدة على الأقل لإتمام العملية.");
    return;
  }

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let totalRawPrice = 0;
  let selectedServices = [];

  staticChecked.forEach(chk => {
    const priceUSD = parseFloat(chk.dataset.price);
    totalRawPrice += (priceUSD * cur.rate);
    selectedServices.push(chk.value);
  });

  dynamicChecked.forEach(chk => {
    const priceSAR = parseFloat(chk.dataset.priceSar);
    const priceUSD = parseFloat(chk.dataset.priceUsd);
    let priceConverted = priceSAR;
    if (selectedCurrency !== 'SAR') {
      priceConverted = priceUSD * cur.rate;
    }
    totalRawPrice += priceConverted;
    selectedServices.push(chk.value);
  });

  let couponDiscountValue = 0;
  let couponDiscountText = '';
  if (activeCoupon) {
    couponDiscountValue = totalRawPrice * (activeCoupon.percent / 100);
    totalRawPrice -= couponDiscountValue;
    
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
    
    pointsDiscountValue = Math.min(totalRawPrice, maxDiscountConverted);
    totalRawPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
    
    const formattedDiscount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(pointsDiscountValue) + ' ' + cur.symbol;
    
    pointsDiscountText = `🎁 خصم نقاط الولاء: -${formattedDiscount} (${pointsDeducted} نقطة مستخدمة)`;
  }

  const finalFormattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(totalRawPrice) + ' ' + cur.symbol;

  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const sonyEmail = document.getElementById('sonyEmail').value.trim();
  const sonyPassword = document.getElementById('sonyPassword').value;
  const sonyCode1 = document.getElementById('sonyBackup1').value.trim();
  const sonyCode2 = document.getElementById('sonyBackup2').value.trim();
  const sonyCode3 = document.getElementById('sonyBackup3').value.trim();
  const eaEmail = document.getElementById('eaEmail').value.trim();
  const eaPassword = document.getElementById('eaPassword').value;
  const eaCode1 = document.getElementById('eaBackup1').value.trim();
  const eaCode2 = document.getElementById('eaBackup2').value.trim();
  const eaCode3 = document.getElementById('eaBackup3').value.trim();
  const platformName = 'سوني بلايستيشن (PlayStation Only)';

  let msg = `🎮 طلب إنجاز مهام (أهداف) متعددة — Trivela\n\n` +
            `👤 الاسم: ${customerName}\n` +
            `📱 رقم التواصل: ${customerPhone}\n` +
            `🕹️ الجهاز: ${platformName}\n` +
            `📦 المهام المطلوبة:\n — ` + selectedServices.join('\n — ') + `\n\n` +
            `💵 الإجمالي المطلوب: ${finalFormattedPrice}\n`;

  if (couponDiscountText) {
    msg += `${couponDiscountText}\n`;
  }
  if (pointsDiscountText) {
    msg += `${pointsDiscountText}\n`;
  }

  msg += `\n🔑 [القسم 1] بيانات حساب السوني (PSN):\n` +
         `📧 الايميل: ${sonyEmail}\n` +
         `🔒 كلمة المرور: ${sonyPassword}\n` +
         `🔐 رموز السوني الاحتياطية: ${sonyCode1} - ${sonyCode2} - ${sonyCode3}\n\n` +
         `🔑 [القسم 2] بيانات حساب الـ EA (Origin):\n` +
         `📧 الايميل: ${eaEmail}\n` +
         `🔒 كلمة المرور: ${eaPassword}\n` +
         `🔐 رموز الـ EA الاحتياطية: ${eaCode1} - ${eaCode2} - ${eaCode3}\n\n` +
         `_أرسل تلقائياً من Trivela.com_`;

  let totalRawPriceSAR = 0;
  staticChecked.forEach(chk => {
    const priceUSD = parseFloat(chk.dataset.price);
    totalRawPriceSAR += (priceUSD * 3.75);
  });
  dynamicChecked.forEach(chk => {
    totalRawPriceSAR += parseFloat(chk.dataset.priceSar);
  });
  
  const couponDiscountSAR = activeCoupon ? (totalRawPriceSAR * (activeCoupon.percent / 100)) : 0;
  const remainingAfterCouponSAR = totalRawPriceSAR - couponDiscountSAR;
  const pointsDiscountSAR = (pointsDeducted / 37.5) * 3.75;
  const finalPriceSAR = Math.max(0, remainingAfterCouponSAR - pointsDiscountSAR);

  const orderPayload = {
    customerName: customerName,
    customerPhone: customerPhone,
    service: "خدمة مهام متعددة: " + selectedServices.join(', '),
    platform: 'console',
    priceSAR: finalPriceSAR,
    pointsDiscount: pointsDiscountSAR + couponDiscountSAR,
    pointsDeducted: pointsDeducted,
    couponCode: activeCoupon ? activeCoupon.code : null,
    eaEmail: eaEmail,
    eaPassword: eaPassword,
    backupCode1: eaCode1,
    backupCode2: eaCode2,
    backupCode3: eaCode3,
    sonyEmail: sonyEmail,
    sonyPassword: sonyPassword,
    sonyBackupCode1: sonyCode1,
    sonyBackupCode2: sonyCode2,
    sonyBackupCode3: sonyCode3
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
      alert("حدث خطأ أثناء تسجيل طلبك في السيرفر.");
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
  let customerName = 'غير محدد';
  let serviceName = 'إنجاز مهام';
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
      } else if (trimmed.includes('المهام المطلوبة:')) {
        serviceName = 'مهام: ' + trimmed.split(':')[1].trim();
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
