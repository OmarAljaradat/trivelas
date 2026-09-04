import { CURRENCIES, DEFAULT_SETTINGS } from '../../core/config.js';
import { auth } from '../../core/auth.js';
import { showOrderSuccessPopup } from '../../core/ui-helpers.js';
import { calculatePrice, MOCK_COUPONS, submitOrder } from './coinsService.js';
import '../../core/theme.js';

// State variables
let dynamicSettings = { ...DEFAULT_SETTINGS };
let currentPlatform = 'console';
let currentCoins = 1000000;
let clubCount = 1;
let userPoints = 0;
let activeCoupon = null;
let usePointsActive = false;
let loggedInName = "";
let loggedInPhone = "";

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
      window.couponsLoaded = true;
    })
    .catch(err => console.warn("Could not fetch coupons dynamically:", err));
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  const p1 = auth.getPublicSettings().then(settings => {
    if (settings && settings.settings) {
      dynamicSettings = settings.settings;
      applyCoinsCMSContent();
    }
    
    // Parse URL parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }
  });

  const p2 = fetchDynamicCoupons();

  Promise.all([p1, p2]).then(() => {
    updatePriceAndSummary();
  });

  checkSavedEaAccount();

  // Close details modal when clicking outside
  const detailsModal = document.getElementById('coinsDetailsModal');
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) {
        closeDetailsModal();
      }
    });
  }

  // Setup slider
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

  // Checkout progress watch
  const inputsToWatch = ['eaEmail', 'eaPassword', 'backup1'];
  inputsToWatch.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCheckoutProgress);
      el.addEventListener('change', updateCheckoutProgress);
    }
  });
  updateCheckoutProgress();

  // ── Bind form submit listener directly (guaranteed to work in ES module context) ──
  const purchaseForm = document.getElementById('purchaseForm');
  if (purchaseForm) {
    purchaseForm.addEventListener('submit', handlePurchaseSubmit);
  }
});

// Load User profile info
async function loadUserLoyalty() {
  const user = await auth.getMe();
  if (user) {
    loggedInName = user.name || "";
    loggedInPhone = user.phone || "";

    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    if (nameInput && loggedInName) nameInput.value = loggedInName;
    if (phoneInput && loggedInPhone) phoneInput.value = loggedInPhone;
  }
}

// Select Platform
export function selectPlatform(platform) {
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

  // Update sidebar platform badge
  const sidebarBadgeIcon  = document.querySelector('#sidebarPlatformBadge i');
  const sidebarBadgeLabel = document.getElementById('sidebarPlatformLabel');
  if (sidebarBadgeIcon && sidebarBadgeLabel) {
    if (platform === 'PC') {
      sidebarBadgeIcon.className = 'fas fa-computer';
      sidebarBadgeLabel.textContent = 'PC — إيه أي سبورتس';
    } else {
      sidebarBadgeIcon.className = 'fab fa-playstation';
      sidebarBadgeLabel.textContent = 'PlayStation / Xbox';
    }
  }

  updatePriceAndSummary();
}

// Club count toggle
export function selectClubCount(count) {
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

// Quick amount select
export function selectQuickAmount(btn, amount) {
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

// Slider change
export function onSliderChange(val) {
  currentCoins = parseInt(val, 10);
  const coinsEl = document.getElementById('liveCoins');
  if (coinsEl) coinsEl.textContent = formatCoins(currentCoins);

  const slider = document.getElementById('coinsSlider');
  if (slider) {
    slider.value = currentCoins;
    const min = parseInt(slider.min, 10) || 100000;
    const max = parseInt(slider.max, 10) || 10000000;
    const pct = Math.min(100, Math.max(0, ((currentCoins - min) / (max - min)) * 100));
    const fill = document.getElementById('sliderFill');
    if (fill) fill.style.width = pct + '%';
  }

  const summaryCoins = document.getElementById('summaryCoins');
  if (summaryCoins) summaryCoins.textContent = formatCoins(currentCoins);

  const qaBtns = document.querySelectorAll('.qa-btn');
  qaBtns.forEach(btn => btn.classList.remove('active'));

  const exactBtn = document.querySelector(`.qa-btn[data-val="${currentCoins}"]`);
  if (exactBtn) {
    exactBtn.classList.add('active');
  }

  updatePriceAndSummary();
}

export function onManualCoinsBlur(val) {
  const cleanVal = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  if (isNaN(cleanVal) || cleanVal < 10000) {
    onSliderChange(100000);
    return;
  }
  onSliderChange(cleanVal);
}
window.onManualCoinsBlur = onManualCoinsBlur;

// Toggle password text
export function togglePasswordVisibility() {
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

// Discount switches
export function handleDiscountTypeChange() {
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

// Apply Coupon
export function applyCouponCode() {
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
    const c = dynamicCoupons[code];
    activeCoupon = {
      code: code,
      percent: c.percent || 0,
      flatDiscount: c.flatDiscount || 0,
      freeCoins: c.freeCoins || 0
    };
    msg.className = "coupon-status-msg success";
    if (activeCoupon.freeCoins > 0) {
      msg.textContent = `تم تفعيل الكوبون بنجاح! ستحصل على +${formatCoins(activeCoupon.freeCoins)} كوينز إضافية مجاناً!`;
    } else if (activeCoupon.flatDiscount > 0) {
      msg.textContent = `تم تفعيل الكوبون بنجاح! خصم بقيمة ${activeCoupon.flatDiscount} ر.س`;
    } else {
      msg.textContent = `تم تفعيل الكوبون بنجاح! خصم بقيمة ${activeCoupon.percent}%`;
    }
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "الكوبون غير صالح أو منتهي الصلاحية.";
  }
  updatePriceAndSummary();
}

// Redeem Loyalty Points for Coupons
export async function redeemPointsForCoupon(rewardType) {
  const token = localStorage.getItem('shopcoin_token');
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

// Toggle Points discount
export function togglePointsUsage(event) {
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

  const valUSD = userPoints / dynamicSettings.pointsDiscountRate;
  const valConverted = valUSD * cur.rate;

  const formattedVal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(valConverted) + ' ' + cur.symbol;

  const lblDiscount = document.getElementById('lblPointsDiscountSAR');
  if (lblDiscount) lblDiscount.textContent = formattedVal;
}

// Update Price Summary UI
export function updatePriceAndSummary() {
  triggerPriceSkeleton();
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }

  const res = calculatePrice(
    currentCoins,
    currentPlatform,
    selectedCurrency,
    dynamicSettings.baseRateConsole,
    dynamicSettings.baseRatePC,
    CURRENCIES,
    dynamicSettings.discounts
  );
  
  let finalPrice = res.price;
  let activeFreeCoins = 0;

  if (activeCoupon) {
    if (activeCoupon.percent > 0) {
      finalPrice -= finalPrice * (activeCoupon.percent / 100);
    } else if (activeCoupon.flatDiscount > 0) {
      const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
      const discountConverted = (activeCoupon.flatDiscount / 3.75) * cur.rate;
      finalPrice = Math.max(0, finalPrice - discountConverted);
    } else if (activeCoupon.freeCoins > 0) {
      activeFreeCoins = activeCoupon.freeCoins;
    }
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: res.dec,
    maximumFractionDigits: res.dec
  }).format(finalPrice) + ' ' + res.symbol;

  const displayPrice = document.getElementById('displayPrice');
  if (displayPrice) displayPrice.textContent = formattedPrice;

  const summaryPrice = document.getElementById('summaryPrice');
  const summaryCoins = document.getElementById('summaryCoins');
  if (summaryPrice) summaryPrice.textContent = formattedPrice;
  if (summaryCoins) {
    summaryCoins.textContent = activeFreeCoins > 0 
      ? `${formatCoins(currentCoins)} (+${formatCoins(activeFreeCoins)} مجاناً)` 
      : formatCoins(currentCoins);
  }

  // Time Est
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

  // ── Update Sidebar Live ──
  const sidebarCoins = document.getElementById('sidebarCoinsAmount');
  const sidebarBase  = document.getElementById('sidebarBasePrice');
  const sidebarTotal = document.getElementById('sidebarTotalPrice');
  const sidebarDeliv = document.getElementById('sidebarDeliveryTime');
  const sidebarDiscRow = document.getElementById('sidebarDiscountRow');
  const sidebarDiscAmt = document.getElementById('sidebarDiscountAmount');

  if (sidebarCoins) {
    sidebarCoins.textContent = activeFreeCoins > 0
      ? `${new Intl.NumberFormat('en-US').format(currentCoins)} (+${new Intl.NumberFormat('en-US').format(activeFreeCoins)} مجاناً)`
      : new Intl.NumberFormat('en-US').format(currentCoins);
  }

  const basePriceFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: res.dec, maximumFractionDigits: res.dec
  }).format(res.price) + ' ' + res.symbol;
  if (sidebarBase) sidebarBase.textContent = basePriceFormatted;
  if (sidebarTotal) sidebarTotal.textContent = formattedPrice;

  // Show discount row if there's a discount
  const discountAmount = res.price - finalPrice;
  if (sidebarDiscRow) {
    if (discountAmount > 0.005) {
      sidebarDiscRow.style.display = 'flex';
      const discFormatted = '-' + new Intl.NumberFormat('en-US', {
        minimumFractionDigits: res.dec, maximumFractionDigits: res.dec
      }).format(discountAmount) + ' ' + res.symbol;
      if (sidebarDiscAmt) sidebarDiscAmt.textContent = discFormatted;
    } else {
      sidebarDiscRow.style.display = 'none';
    }
  }

  if (sidebarDeliv) {
    if (currentCoins <= 500000)      sidebarDeliv.textContent = "10 - 25 دقيقة";
    else if (currentCoins <= 1000000) sidebarDeliv.textContent = "20 - 45 دقيقة";
    else if (currentCoins <= 3000000) sidebarDeliv.textContent = "30 - 60 دقيقة";
    else if (currentCoins <= 5000000) sidebarDeliv.textContent = "1 - 2 ساعة";
    else                              sidebarDeliv.textContent = "2 - 4 ساعات";
  }
}

// Purchase Form Submit
let _isSubmitting = false;
export async function handlePurchaseSubmit(event) {
  event.preventDefault();
  if (_isSubmitting) return;
  _isSubmitting = true;

  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
  }

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';

  const res = calculatePrice(
    currentCoins,
    currentPlatform,
    selectedCurrency,
    dynamicSettings.baseRateConsole,
    dynamicSettings.baseRatePC,
    CURRENCIES,
    dynamicSettings.discounts
  );
  let finalPrice = res.price;

  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = finalPrice * (activeCoupon.percent / 100);
    finalPrice -= couponDiscountValue;
  }

  let pointsDeducted = 0;
  let pointsDiscountValue = 0;
  if (usePointsActive && userPoints > 0) {
    const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
    const maxDiscountUSD = userPoints / dynamicSettings.pointsDiscountRate;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;
    
    pointsDiscountValue = Math.min(finalPrice, maxDiscountConverted);
    finalPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * dynamicSettings.pointsDiscountRate);
  }

  // Inputs
  const email = document.getElementById('eaEmail').value;
  const password = document.getElementById('eaPassword').value;
  const needBackupHelp = document.getElementById('chkNeedBackupHelp')?.checked;
  const code1 = needBackupHelp ? 'مساعدة الدعم الفني' : (document.getElementById('backup1').value.trim() || 'مساعدة الدعم الفني');
  const code2 = needBackupHelp ? 'بحاجة لمساعدة' : (document.getElementById('backup2').value.trim() || '—');
  const code3 = needBackupHelp ? 'بحاجة لمساعدة' : (document.getElementById('backup3').value.trim() || '—');
  const clubName = document.getElementById('eaClubName')?.value.trim() || '—';

  // Calculate final price in SAR
  const resSAR = calculatePrice(
    currentCoins,
    currentPlatform,
    'SAR',
    dynamicSettings.baseRateConsole,
    dynamicSettings.baseRatePC,
    CURRENCIES,
    dynamicSettings.discounts
  );
  let finalPriceSAR = resSAR.price;

  let couponDiscountValSAR = 0;
  if (activeCoupon) {
    if (activeCoupon.percent > 0) {
      couponDiscountValSAR = finalPriceSAR * (activeCoupon.percent / 100);
    } else if (activeCoupon.flatDiscount > 0) {
      couponDiscountValSAR = activeCoupon.flatDiscount;
    }
    finalPriceSAR = Math.max(0, finalPriceSAR - couponDiscountValSAR);
  }

  let pointsDiscountValSAR = 0;
  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / dynamicSettings.pointsDiscountRate;
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
    if (activeCoupon.freeCoins > 0) {
      serviceDesc += ` (+${formatCoins(activeCoupon.freeCoins)} مجاناً - كوبون: ${activeCoupon.code})`;
    } else {
      serviceDesc += ` (كوبون: ${activeCoupon.code})`;
    }
  }

  // Add to Global Shopping Cart
  if (window.shopCoinCart) {
    window.shopCoinCart.addItem({
      service: serviceDesc,
      type: 'coins',
      platform: currentPlatform.toUpperCase(),
      priceSAR: finalPriceSAR,
      eaEmail: email,
      eaPassword: password,
      backupCodes: [code1, code2, code3].filter(c => c && c !== '—'),
      clubName: clubName !== '—' ? clubName : '',
      details: `${formatCoins(currentCoins)} (${currentPlatform.toUpperCase()})`
    });

    _isSubmitting = false;
    if (submitBtn) {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }
    return;
  }


// Coins Tabs
export function switchCoinsTab(tabId) {
  const tabs = ['Safety', 'Rules', 'Steps'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btnTab${t}`);
    const panel = document.getElementById(`panel${t}`);
    if (btn) btn.classList.remove('active');
    if (panel) panel.classList.remove('active');
  });

  const activeBtn = document.getElementById(`btnTab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  const activePanel = document.getElementById(`panel${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.classList.add('active');
}

// Modal open/close
export function openDetailsModal() {
  const modal = document.getElementById('coinsDetailsModal');
  if (modal) modal.style.display = 'flex';
}

export function closeDetailsModal() {
  const modal = document.getElementById('coinsDetailsModal');
  if (modal) modal.style.display = 'none';
}

// Helpers
function formatCoins(n) {
  if (n >= 1_000_000) return (n / 1_000_000) % 1 === 0 ? `${n/1_000_000}M` : `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${n/1_000}K`;
  return String(n);
}

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

function updateCheckoutProgress() {
  let percent = 50;
  
  const email = document.getElementById('eaEmail')?.value.trim();
  const password = document.getElementById('eaPassword')?.value.trim();
  const backup1 = document.getElementById('backup1')?.value.trim();
  const needBackupHelp = document.getElementById('chkNeedBackupHelp')?.checked;
  const step3Active = !!(email && password && (backup1 || needBackupHelp));

  const pStep3 = document.getElementById('pStep3');
  if (pStep3) {
    if (step3Active) {
      pStep3.classList.add('active');
      percent = 100;
    } else {
      pStep3.classList.remove('active');
    }
  }

  const fill = document.getElementById('progressLineFill');
  if (fill) {
    fill.style.width = `${percent}%`;
  }
}

// Bind to window to allow HTML inline handlers to work seamlessly
window.selectPlatform = selectPlatform;
window.selectClubCount = selectClubCount;
window.selectQuickAmount = selectQuickAmount;
window.onSliderChange = onSliderChange;
window.togglePasswordVisibility = togglePasswordVisibility;
export function toggleCompactCoupon(btn) {
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
}

window.toggleCompactCoupon = toggleCompactCoupon;
window.handleDiscountTypeChange = handleDiscountTypeChange;
window.applyCouponCode = applyCouponCode;
window.redeemPointsForCoupon = redeemPointsForCoupon;
window.togglePointsUsage = togglePointsUsage;
window.updatePriceAndSummary = updatePriceAndSummary;
window.handlePurchaseSubmit = handlePurchaseSubmit;
window.switchCoinsTab = switchCoinsTab;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;

window.setQuickAmount = function(amount) {
  const btn = document.querySelector(`.qa-btn[data-val="${amount}"]`);
  if (btn) {
    selectQuickAmount(btn, amount);
  }
};

function applyCoinsCMSContent() {
  const content = dynamicSettings.content;
  if (!content) return;

  if (content.coinsPage) {
    const cp = content.coinsPage;
    
    const title = document.getElementById('coins_cms_title');
    if (title && cp.title) title.textContent = cp.title;

    const desc = document.getElementById('coins_cms_desc');
    if (desc && cp.desc) desc.textContent = cp.desc;

    const step1Title = document.getElementById('coins_cms_step1Title');
    if (step1Title && cp.step1Title) step1Title.textContent = cp.step1Title;

    const step1Desc = document.getElementById('coins_cms_step1Desc');
    if (step1Desc && cp.step1Desc) step1Desc.textContent = cp.step1Desc;

    const step2Title = document.getElementById('coins_cms_step2Title');
    if (step2Title && cp.step2Title) step2Title.textContent = cp.step2Title;

    const step2Desc = document.getElementById('coins_cms_step2Desc');
    if (step2Desc && cp.step2Desc) step2Desc.textContent = cp.step2Desc;

    const step3Title = document.getElementById('coins_cms_step3Title');
    if (step3Title && cp.step3Title) step3Title.textContent = cp.step3Title;

    const step3Desc = document.getElementById('coins_cms_step3Desc');
    if (step3Desc && cp.step3Desc) step3Desc.textContent = cp.step3Desc;
  }
}

let savedEaAccountData = null;

async function checkSavedEaAccount() {
  const token = localStorage.getItem('shopcoin_token');
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      if (user) {
        loggedInName = user.name || "";
        loggedInPhone = user.phone || "";
        
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('customerPhone');
        if (nameInput && loggedInName) nameInput.value = loggedInName;
        if (phoneInput && loggedInPhone) phoneInput.value = loggedInPhone;

        const eaData = user.savedEA || user.savedEaAccount;
        if (eaData && (eaData.email || eaData.eaEmail)) {
          savedEaAccountData = eaData;
          const banner = document.getElementById('savedEaAccountBanner');
          const info = document.getElementById('lblSavedEaInfo');
          if (banner) banner.style.display = 'flex';
          if (info) {
            const email = eaData.email || eaData.eaEmail;
            const platform = eaData.platform || 'Console';
            info.innerHTML = `الحساب المحفوظ: <strong>${email}</strong> (${platform}) — انقر للتعبئة الفورية.`;
          }
        }
      }
    }
  } catch (_) {}
}

export function fillSavedEaAccount() {
  if (!savedEaAccountData) return;
  const emailIn = document.getElementById('eaEmail');
  const b1 = document.getElementById('backup1');
  const b2 = document.getElementById('backup2');
  const b3 = document.getElementById('backup3');

  const emailVal = savedEaAccountData.email || savedEaAccountData.eaEmail || '';
  if (emailIn && emailVal) emailIn.value = emailVal;

  let codes = savedEaAccountData.backupCodes || [
    savedEaAccountData.backupCode1,
    savedEaAccountData.backupCode2,
    savedEaAccountData.backupCode3
  ];

  if (codes && codes.length > 0) {
    if (b1) b1.value = codes[0] || '';
    if (b2) b2.value = codes[1] || '';
    if (b3) b3.value = codes[2] || '';
  }

  // Auto-select platform
  if (savedEaAccountData.platform) {
    if (savedEaAccountData.platform.toLowerCase().includes('pc')) {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }
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
window.fillSavedEaAccount = fillSavedEaAccount;
