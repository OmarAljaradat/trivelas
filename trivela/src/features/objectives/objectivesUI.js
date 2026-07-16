import { CURRENCIES, DEFAULT_SETTINGS } from '../../core/config.js';
import { auth } from '../../core/auth.js';
import { showOrderSuccessPopup, getExpiryInfo, formatPriceConverted } from '../../core/ui-helpers.js';
import { fetchActivePlayers, submitObjectivesOrder } from './objectivesService.js';
import '../../core/theme.js';

// State
let dynamicSettings = { ...DEFAULT_SETTINGS };
let activePlayers = [];
let dynamicCoupons = {};
let loggedInName = "";
let loggedInPhone = "";
let userPoints = 0;
let usePointsActive = false;
let activeCoupon = null;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Pre-load default state
  selectPlatform('PlayStation');
  
  const p1 = auth.getPublicSettings().then(settings => {
    if (settings && settings.settings) {
      dynamicSettings = settings.settings;
    }
    loadDynamicPlayers();
  });

  const p2 = fetchDynamicCoupons();

  Promise.all([p1, p2]).then(() => {
    updatePriceAndSummary();
  });

  loadUserLoyalty();
});

// Load User profile & Points
async function loadUserLoyalty() {
  const loyaltyBlock = document.getElementById('loyaltyPointsBlock');
  const optionRow = document.getElementById('loyaltyOptionRow');
  const divider = document.getElementById('loyaltyPointsDivider');
  const radPoints = document.getElementById('radPoints');
  const loyaltyDividerMain = document.getElementById('loyaltyDivider');

  if (loyaltyBlock) loyaltyBlock.style.display = 'block';
  if (optionRow) optionRow.style.display = 'block';
  if (divider) divider.style.display = 'block';
  if (loyaltyDividerMain) loyaltyDividerMain.style.display = 'block';

  const user = await auth.getMe();
  if (user) {
    loggedInName = user.name || "";
    loggedInPhone = user.phone || "";

    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    if (nameInput && loggedInName) nameInput.value = loggedInName;
    if (phoneInput && loggedInPhone) phoneInput.value = loggedInPhone;

    userPoints = user.points || 0;
    const lblPointsBalance = document.getElementById('lblLoyaltyPointsBalance');
    if (lblPointsBalance) lblPointsBalance.textContent = userPoints;
    
    updatePointsDisplayVal();

    if (userPoints > 0) {
      if (radPoints) radPoints.disabled = false;
    } else {
      if (radPoints) radPoints.disabled = true;
      const labelText = document.querySelector('#loyaltyOptionRow .discount-label-text');
      if (labelText) {
        labelText.innerHTML = `رصيدك الحالي 0 نقطة من نقاط الولاء (اجمع المزيد عند إتمام الطلبات)`;
      }
    }
  } else {
    if (radPoints) radPoints.disabled = true;
    const labelText = document.querySelector('#loyaltyOptionRow .discount-label-text');
    if (labelText) {
      labelText.innerHTML = `استخدام نقاط الولاء (<a href="login.html" style="color: var(--blue-500); text-decoration: underline; font-weight: 700;">سجل دخولك أولاً</a>)`;
    }
  }
}

// Fetch and render FUT.GG player challenges
async function loadDynamicPlayers() {
  try {
    activePlayers = await fetchActivePlayers();
    renderActivePlayersGrid();
  } catch (err) {
    console.warn("Could not load dynamic players:", err);
  }
}

// Render player cards
function renderActivePlayersGrid() {
  const prevDynamicCards = document.querySelectorAll('.dynamic-objective-card');
  prevDynamicCards.forEach(c => c.remove());

  if (activePlayers.length === 0) {
    const emptyMsg = document.getElementById('customEmptyMsg');
    if (emptyMsg) emptyMsg.style.display = 'block';
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
      badgesHTML += `<span class="badge" style="font-size: 0.7rem; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; margin-left: 6px;"><i class="far fa-clock"></i> ${expiry.label}</span>`;
    }

    let metaText = p.version || "مهام";
    if (p.rating > 0) {
      metaText += ` | ${p.rating} ${p.position}`;
    }

    const cardId = `dynamicCard_${p.id}`;
    const card = document.createElement('div');
    card.className = 'objective-checkbox-card dynamic-objective-card';
    card.id = cardId;
    card.setAttribute('onclick', `toggleObjectiveCard('${cardId}')`);
    card.innerHTML = `
      <input type="checkbox" name="dynamicObjective" value="مهام اللاعب: ${p.name}" data-price-sar="${p.priceSAR}" data-price-usd="${p.priceUSD}" data-id="${p.id}"/>
      <div class="card-check-indicator"><i class="fas fa-check"></i></div>
      <div class="obj-card-details">
        <span class="obj-card-title">${p.name}</span>
        <span class="obj-card-desc">${metaText} ${badgesHTML}</span>
      </div>
      <div class="obj-card-price">${formattedPrice}</div>
    `;

    const subCat = p.sbcSubCategory || 'custom';
    let gridId = 'allObjectivesGrid'; // Default is Featured/Custom
    if (subCat === 'weekly') gridId = 'weeklyObjectivesGrid';
    else if (subCat === 'evo') gridId = 'evoObjectivesGrid';
    else if (subCat === 'challenges') gridId = 'challengesObjectivesGrid';

    const targetGrid = document.getElementById(gridId);
    if (targetGrid) {
      targetGrid.appendChild(card);
    }
  });

  // Hide empty state message if there are dynamic cards in custom tab
  const emptyMsg = document.getElementById('customEmptyMsg');
  const customDynamicCount = document.querySelectorAll('#allObjectivesGrid .dynamic-objective-card').length;
  if (emptyMsg) {
    emptyMsg.style.display = customDynamicCount > 0 ? 'none' : 'block';
  }
}

// Platform select (PlayStation Only restrictions)
export function selectPlatform(platform) {
  const btnPS = document.getElementById('btnPlayStation');
  const btnXbox = document.getElementById('btnXbox');
  const btnPC = document.getElementById('btnPC');

  if (platform === 'PlayStation') {
    if (btnPS) btnPS.classList.add('active');
    if (btnXbox) btnXbox.classList.remove('active');
    if (btnPC) btnPC.classList.remove('active');
  }
}

// Toggle Checkbox card (div wrapper) manually to guarantee no browser double-toggling
export function toggleObjectiveCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const chk = card.querySelector('input[type="checkbox"]');
  if (chk) {
    chk.checked = !chk.checked;
    if (chk.checked) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  }
  updatePriceAndSummary();
  if (typeof window.updateTabBadges === 'function') {
    window.updateTabBadges();
  }
}

function updatePointsDisplayVal() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const valUSD = userPoints / (dynamicSettings.pointsDiscountRate || 37.5);
  const valConverted = valUSD * cur.rate;

  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(valConverted) + ' ' + cur.symbol;

  const lblDiscount = document.getElementById('lblPointsDiscountSAR');
  if (lblDiscount) lblDiscount.textContent = formattedVal;
}

export function handleDiscountTypeChange() {
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

export function applyCouponCode() {
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
      percent: dynamicCoupons[code].percent
    };
    msg.className = "coupon-status-msg success";
    msg.textContent = `تم تطبيق الكوبون بنجاح! خصم ${dynamicCoupons[code].percent}%`;
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "رمز الكوبون غير صحيح أو منتهي الصلاحية.";
  }
  updatePriceAndSummary();
}

// Redeem Loyalty Points for Coupons
export async function redeemPointsForCoupon(rewardType) {
  const token = localStorage.getItem('trivela_token');
  const msg = document.getElementById('redeemStatusMessage');
  if (!token) {
    if (msg) {
      msg.style.color = '#ef4444';
      msg.textContent = "يرجى تسجيل الدخول أولاً لاستبدال النقاط.";
    }
    return;
  }

  const btnRedeem = document.getElementById(`btnRedeem${rewardType.charAt(0).toUpperCase() + rewardType.slice(1)}`);
  const origText = btnRedeem ? btnRedeem.innerHTML : "";
  if (btnRedeem) {
    btnRedeem.disabled = true;
    btnRedeem.innerHTML = '<span style="color: var(--blue-500)">جاري...</span>';
  }

  try {
    const res = await fetch('/api/public/redeem-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rewardType })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "فشل استبدال النقاط");
    }

    if (msg) {
      msg.style.color = 'var(--green)';
      msg.textContent = `✅ تم استبدال النقاط بنجاح! كود الكوبون: ${data.couponCode}`;
    }

    userPoints = data.points;
    const lblBalance = document.getElementById('lblLoyaltyPointsBalance');
    if (lblBalance) lblBalance.textContent = userPoints;
    updatePointsDisplayVal();

    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
      couponInput.value = data.couponCode;
    }
    const radCoupon = document.getElementById('radCoupon');
    if (radCoupon) {
      radCoupon.checked = true;
      handleDiscountTypeChange();
    }

    await fetchDynamicCoupons();
    applyCouponCode();

  } catch (err) {
    if (msg) {
      msg.style.color = '#ef4444';
      msg.textContent = `❌ خطأ: ${err.message}`;
    }
  } finally {
    if (btnRedeem) {
      btnRedeem.disabled = false;
      btnRedeem.innerHTML = origText;
    }
  }
}

export function togglePointsUsage(event) {
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

// Update Totals UI
export function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }

  let totalRawPrice = 0;
  let selectedNames = [];

  // Static items
  const staticChecked = document.querySelectorAll('input[name="staticObjective"]:checked');
  staticChecked.forEach(chk => {
    const priceUSD = parseFloat(chk.dataset.price);
    totalRawPrice += priceUSD * cur.rate;
    selectedNames.push(chk.value);
  });

  // Dynamic items
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
    const maxDiscountUSD = userPoints / (dynamicSettings.pointsDiscountRate || 37.5);
    const maxDiscountConverted = maxDiscountUSD * cur.rate;

    pointsDiscountValue = Math.min(totalRawPrice, maxDiscountConverted);
    totalRawPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * (dynamicSettings.pointsDiscountRate || 37.5));
  }

  // Update dynamic players cards prices too
  activePlayers.forEach(p => {
    const cardId = `dynamicCard_${p.id}`;
    const card = document.getElementById(cardId);
    if (card) {
      const priceLabel = card.querySelector('.obj-card-price');
      if (priceLabel) {
        priceLabel.textContent = formatPriceConverted(p.priceSAR, p.priceUSD, selectedCurrency);
      }
    }
  });

  // Update static items price labels on cards dynamically
  const staticCards = document.querySelectorAll('.objective-checkbox-card:not(.dynamic-objective-card)');
  staticCards.forEach(card => {
    const chk = card.querySelector('input[name="staticObjective"]');
    const priceLabel = card.querySelector('.obj-card-price');
    if (chk && priceLabel) {
      const priceUSD = parseFloat(chk.dataset.price);
      const finalPrice = priceUSD * cur.rate;
      const formattedPrice = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: cur.dec,
        maximumFractionDigits: cur.dec
      }).format(finalPrice) + ' ' + cur.symbol;
      priceLabel.textContent = formattedPrice;
    }
  });

  // Format and update outputs
  const formattedTotal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(totalRawPrice) + ' ' + cur.symbol;

  const summaryPrice = document.getElementById('summaryPrice');
  if (summaryPrice) summaryPrice.textContent = formattedTotal;

  const summaryServiceText = document.getElementById('summaryServiceText');
  if (summaryServiceText) {
    if (selectedNames.length > 0) {
      summaryServiceText.textContent = selectedNames.join(' | ');
    } else {
      summaryServiceText.textContent = "لم يتم اختيار أي مهمة بعد";
    }
  }

  const countBadge = document.getElementById('selectedCountBadge');
  if (countBadge) {
    countBadge.textContent = selectedNames.length;
  }

  // Show/Hide sticky bar
  const stickyBar = document.querySelector('.sticky-summary-bar');
  if (stickyBar) {
    if (selectedNames.length > 0) {
      stickyBar.classList.add('visible');
    } else {
      stickyBar.classList.remove('visible');
    }
  }
}

// Submit Order Form
export async function handleOrderSubmit(event) {
  event.preventDefault();

  const staticChecked = document.querySelectorAll('input[name="staticObjective"]:checked');
  const dynamicChecked = document.querySelectorAll('input[name="dynamicObjective"]:checked');

  if (staticChecked.length === 0 && dynamicChecked.length === 0) {
    alert("يرجى اختيار مهمة واحدة على الأقل لإتمام الطلب.");
    return;
  }

  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
  }

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  // Totals calculations
  let totalRawSAR = 0;
  let totalRawUSD = 0;
  let selectedNames = [];

  staticChecked.forEach(chk => {
    const priceUSD = parseFloat(chk.dataset.price);
    totalRawUSD += priceUSD;
    totalRawSAR += priceUSD * 3.75;
    selectedNames.push(chk.value);
  });

  dynamicChecked.forEach(chk => {
    totalRawSAR += parseFloat(chk.dataset.priceSar);
    totalRawUSD += parseFloat(chk.dataset.priceUsd);
    selectedNames.push(chk.value);
  });

  let couponDiscountSAR = 0;
  let totalAfterCouponSAR = totalRawSAR;
  if (activeCoupon) {
    couponDiscountSAR = totalRawSAR * (activeCoupon.percent / 100);
    totalAfterCouponSAR -= couponDiscountSAR;
  }

  let pointsDeducted = 0;
  let pointsDiscountSAR = 0;

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUS = userPoints / (dynamicSettings.pointsDiscountRate || 37.5);
    const maxDiscountSAR = maxDiscountUS * 3.75;
    pointsDiscountSAR = Math.min(totalAfterCouponSAR, maxDiscountSAR);
    totalAfterCouponSAR -= pointsDiscountSAR;
    pointsDeducted = Math.round((pointsDiscountSAR / 3.75) * (dynamicSettings.pointsDiscountRate || 37.5));
  }
  let totalFinalSAR = totalAfterCouponSAR;

  // Get inputs
  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  
  // Sony Account
  const sonyEmail = document.getElementById('sonyEmail').value.trim();
  const sonyPassword = document.getElementById('sonyPassword').value;
  const sonyB1 = document.getElementById('sonyBackup1').value.trim();
  const sonyB2 = document.getElementById('sonyBackup2').value.trim() || '—';
  const sonyB3 = document.getElementById('sonyBackup3').value.trim() || '—';

  // EA Account
  const eaEmail = document.getElementById('eaEmail').value.trim();
  const eaPassword = document.getElementById('eaPassword').value;
  const eaB1 = document.getElementById('eaBackup1').value.trim();
  const eaB2 = document.getElementById('eaBackup2').value.trim() || '—';
  const eaB3 = document.getElementById('eaBackup3').value.trim() || '—';

  const serviceDescription = `إنجاز مهام التحديات: [${selectedNames.join(' + ')}]`;

  const orderPayload = {
    customerName,
    customerPhone,
    service: serviceDescription,
    platform: 'playstation',
    priceSAR: totalFinalSAR,
    pointsDiscount: pointsDiscountSAR + couponDiscountSAR,
    pointsDeducted: pointsDeducted,
    couponCode: activeCoupon ? activeCoupon.code : null
  };

  try {
    const data = await submitObjectivesOrder(orderPayload);
    if (submitBtn) {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }

    if (data.success && data.order) {
      // Calculate display price
      let totalDisplayPrice = totalRawSAR;
      if (selectedCurrency !== 'SAR') {
        totalDisplayPrice = totalRawUSD * cur.rate;
      }
      
      let couponDisplayDiscount = 0;
      let couponDiscountText = '';
      if (activeCoupon) {
        couponDisplayDiscount = totalDisplayPrice * (activeCoupon.percent / 100);
        totalDisplayPrice -= couponDisplayDiscount;
        const formattedDiscount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: cur.dec,
          maximumFractionDigits: cur.dec
        }).format(couponDisplayDiscount) + ' ' + cur.symbol;
        couponDiscountText = `\n- 🏷️ كوبون خصم (${activeCoupon.code}): -${formattedDiscount} (${activeCoupon.percent}%)`;
      }

      let pointsDisplayDiscount = 0;
      let pointsDiscountText = '';
      if (usePointsActive && userPoints > 0) {
        const maxDiscountUSD = userPoints / (dynamicSettings.pointsDiscountRate || 37.5);
        const maxDiscountConverted = maxDiscountUSD * cur.rate;
        pointsDisplayDiscount = Math.min(totalDisplayPrice, maxDiscountConverted);
        totalDisplayPrice -= pointsDisplayDiscount;
        const formattedDiscount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: cur.dec,
          maximumFractionDigits: cur.dec
        }).format(pointsDisplayDiscount) + ' ' + cur.symbol;
        pointsDiscountText = `\n- 🎁 خصم نقاط الولاء: -${formattedDiscount} (${pointsDeducted} نقطة مستخدمة)`;
      }
      const finalDisplayPriceVal = totalDisplayPrice;

      // Prefilled whatsapp message text
      let messageText = `مرحباً متجر تريفيلا،
لقد قمت بطلب إنجاز مهام (أهداف) ألتيمت تيم بنجاح! 🎯
تفاصيل الطلب:
- رقم الطلب: #${data.order.id}
- الاسم: ${customerName}
- المهام المطلوبة:
  ${selectedNames.map((n, i) => `${i+1}) ${n}`).join('\n  ')}
- إجمالي السعر المتوقع: ${finalDisplayPriceVal.toFixed(2)} ${cur.symbol}`;

      if (couponDiscountText) messageText += couponDiscountText;
      if (pointsDiscountText) messageText += pointsDiscountText;

      messageText += `\n\n🔑 بيانات حساب السوني (PSN):
- الايميل: ${sonyEmail}
- الباسورد: ${sonyPassword}
- الرموز الاحتياطية للسوني:
  1) ${sonyB1}
  2) ${sonyB2}
  3) ${sonyB3}

🎮 بيانات حساب الـ EA (Ultimate Team):
- الايميل: ${eaEmail}
- الباسورد: ${eaPassword}
- الرموز الاحتياطية للـ EA:
  1) ${eaB1}
  2) ${eaB2}
  3) ${eaB3}

يرجى التحقق والبدء في تنفيذ المهام. شكراً لكم.`;

      showOrderSuccessPopup(data.order.id, dynamicSettings.whatsappPhone, messageText);
    } else {
      alert("حدث خطأ أثناء تسجيل طلبك.");
    }
  } catch (err) {
    if (submitBtn) {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }
    alert(err.message || "حدث خطأ في الاتصال بالخادم.");
  }
}

// Bind to window to allow HTML inline handlers to work seamlessly
window.selectPlatform      = selectPlatform;
window.toggleObjectiveCard  = toggleObjectiveCard;
window.toggleCheckboxCard  = toggleObjectiveCard; // Keep old name as alias just in case
window.togglePointsDiscount = togglePointsDiscount;
window.updatePriceAndSummary = updatePriceAndSummary;
window.handleOrderSubmit   = handleOrderSubmit;
window.handlePurchaseSubmit = handleOrderSubmit; // alias for form onsubmit
window.updateTabBadges     = () => {}; // placeholder; overridden by inline script
window.redeemPointsForCoupon = redeemPointsForCoupon;
