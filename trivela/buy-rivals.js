// Configuration & Exchange Rates
let dynamicSettings = {
  whatsappPhone: "962775585112",
  instagramUrl: "https://www.instagram.com/trivelacoins",
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
let selectedPlayerId = null;
let currentSelectedRank = '7wins';
let isEliteMode = false;

// Upload State for Elite mode
let uploadedSquadFile = null;
let uploadedSquadDataUrl = null;

// Division Rivals Ranks Configuration
const RIVALS_RANKS = {
  '7wins': {
    name: "لعب Division Rivals — تحقيق الـ 7 انتصارات الأسبوعية",
    wins: "المكافآت الأسبوعية الكاملة",
    priceUSD: 12,
    isElite: false,
    estimatedDelivery: "2 - 6 ساعات",
    rewards: [
      { name: "تأمين 7 انتصارات كاملة وتأهيل الجوائز", icon: "fas fa-trophy" },
      { name: "فتح مكافآت القسم الحالية المطورة", icon: "fas fa-box-open" },
      { name: "نقاط تأهيل الفوت تشامبيونز المباشرة", icon: "fas fa-ticket" }
    ]
  },
  'div5': {
    name: "ترقية قسم Rivals إلى القسم الخامس (Div 5)",
    wins: "ترقية تصنيف القسم",
    priceUSD: 20,
    isElite: false,
    estimatedDelivery: "3 - 8 ساعات",
    rewards: [
      { name: "1× حزمة ميجا (Mega Pack)", icon: "fas fa-box" },
      { name: "1× حزمة ذهبية نادرين", icon: "fas fa-box-open" },
      { name: "15,000 كوينز نقدي", icon: "fas fa-coins" },
      { name: "500 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
    ]
  },
  'div3': {
    name: "ترقية قسم Rivals إلى القسم الثالث (Div 3)",
    wins: "ترقية تصنيف القسم",
    priceUSD: 35,
    isElite: false,
    estimatedDelivery: "4 - 12 ساعة",
    rewards: [
      { name: "1× حزمة جامبو لاعبين نادرين (100K)", icon: "fas fa-trophy" },
      { name: "1× حزمة لاعبين ذهبية ممتازة", icon: "fas fa-box-open" },
      { name: "25,000 كوينز نقدي", icon: "fas fa-coins" },
      { name: "750 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
    ]
  },
  'div1': {
    name: "ترقية قسم Rivals إلى القسم الأول (Div 1)",
    wins: "ترقية تصنيف القسم (باقة النخبة)",
    priceUSD: 60,
    isElite: true,
    estimatedDelivery: "اتفاق مخصص عبر الواتساب",
    rewards: [
      { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
      { name: "1× حزمة لاعبين نادرين (50K Pack)", icon: "fas fa-box" },
      { name: "40,000 كوينز نقدي", icon: "fas fa-coins" },
      { name: "1,000 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
    ]
  },
  'elite': {
    name: "ترقية قسم Rivals إلى قسم النخبة (Elite Division)",
    wins: "الرتبة القصوى للنخبة (Elite)",
    priceUSD: 95,
    isElite: true,
    estimatedDelivery: "اتفاق مخصص عبر الواتساب",
    rewards: [
      { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
      { name: "1× اختيار لاعب حملة 87+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "70,000 كوينز نقدي", icon: "fas fa-coins" },
      { name: "1,250 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
    ]
  }
};

// Loyalty & Coupon State
let dynamicCoupons = {};
let activeCoupon = null;
let usePointsActive = false;
let userPoints = 0;

// Fetch dynamic coupons
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

// Fetch settings from server
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data && data.settings) {
        dynamicSettings = Object.assign(dynamicSettings, data.settings);

        if (dynamicSettings.enableServiceRivals === false) {
          alert("عذراً، خدمة رايفلز متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
          window.location.href = "/";
          return;
        }

        if (dynamicSettings.customExchangeRates) {
          for (const code in dynamicSettings.customExchangeRates) {
            if (CURRENCIES[code]) {
              CURRENCIES[code].rate = parseFloat(dynamicSettings.customExchangeRates[code]);
            }
          }
        }
      }
      if (data && data.rivals_ranks) {
        Object.assign(RIVALS_RANKS, data.rivals_ranks);
      }
    })
    .catch(err => {
      console.warn("Could not fetch settings dynamically:", err);
    });
}

function applyCMSPageContent() {
  const content = dynamicSettings.content;
  if (!content || !content.rivalsPage) return;
  const cp = content.rivalsPage;
  
  const title = document.getElementById('cms_rivalsTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_rivalsDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_rivalsHint');
  if (hint && cp.hint) hint.textContent = cp.hint;
}

// Platform selection (PlayStation vs Xbox vs PC)
function selectPlatform(platform) {
  const btnPS = document.getElementById('btnPlaystation');
  const btnXbox = document.getElementById('btnXbox');
  const btnPC = document.getElementById('btnPC');

  if (btnPS) btnPS.classList.remove('active');
  if (btnXbox) btnXbox.classList.remove('active');
  if (btnPC) btnPC.classList.remove('active');

  const platLower = (platform || '').toLowerCase();
  if (platLower.includes('xbox')) {
    currentPlatform = 'xbox';
    if (btnXbox) btnXbox.classList.add('active');
  } else if (platLower.includes('pc')) {
    currentPlatform = 'pc';
    if (btnPC) btnPC.classList.add('active');
  } else {
    currentPlatform = 'playstation';
    if (btnPS) btnPS.classList.add('active');
  }

  updatePriceAndSummary();
}
window.selectPlatform = selectPlatform;

// Compact Coupon helpers
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
    msg.textContent = `تم تفعيل الكوبون بنجاح! خصم ${activeCoupon.percent}%`;
  } else {
    activeCoupon = null;
    msg.className = "coupon-status-msg error";
    msg.textContent = "الكوبون غير صالح أو منتهي الصلاحية.";
  }
  updatePriceAndSummary();
};

function togglePasswordVisibility() {
  const passInput = document.getElementById('sonyPassword');
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
window.togglePasswordVisibility = togglePasswordVisibility;

function loadDynamicPlayers() {
  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      activePlayers = data.filter(p => p.category === 'rivals');
      renderActivePlayersGrid();
    })
    .catch(err => {
      console.warn("Could not fetch active players from database server:", err);
    });
}

function renderActivePlayersGrid() {
  const section = document.getElementById('dynamicPlayersSection');
  const grid = document.getElementById('activePlayersGrid');
  if (!section || !grid) return;

  if (activePlayers.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = '';

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

    const card = document.createElement('div');
    card.className = 'player-card-btn';
    card.setAttribute('data-id', p.id);
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}"/>
      <div class="player-card-name">${p.name}</div>
      <div class="player-card-version">${p.version} | ${p.rating} ${p.position}</div>
      <div class="player-card-price">${formattedPrice}</div>
    `;

    card.addEventListener('click', () => {
      selectDynamicPlayer(p.id);
    });

    grid.appendChild(card);
  });
}

// Select Division Rivals Rank (Smart switching: Standard vs Elite)
window.selectRivalsRank = function(rankId, progressPercentage) {
  currentSelectedRank = rankId;
  selectedPlayerId = null;

  const hiddenInput = document.getElementById('selectedRankInput');
  const rank = RIVALS_RANKS[rankId];
  if (hiddenInput && rank) {
    hiddenInput.value = rank.name;
  }

  // Update slider nodes active class
  const nodes = document.querySelectorAll('.rivals-step-node');
  nodes.forEach(node => {
    const nodeRankId = node.id.replace('node_', '');
    node.classList.toggle('active', nodeRankId === rankId);
  });

  // Update progress bar width
  const progressBar = document.getElementById('futsProgressBar');
  if (progressBar) {
    progressBar.style.width = progressPercentage + '%';
  }

  // All tiers use unified WhatsApp flow — no mode switching needed
  isEliteMode = true; // Always WhatsApp mode

  // No need to toggle form blocks — unified squad upload for all tiers

  // Render rewards card content
  if (rank) {
    const lblRankName = document.getElementById('lblRankName');
    const lblRankWins = document.getElementById('lblRankWins');
    const lstRankRewards = document.getElementById('lstRankRewards');
    const lblEstimatedDelivery = document.getElementById('lblEstimatedDelivery');

    if (lblRankName) lblRankName.textContent = rank.name;
    if (lblRankWins) lblRankWins.textContent = rank.wins;
    if (lblEstimatedDelivery) {
      lblEstimatedDelivery.textContent = (rank.estimatedDelivery && rank.estimatedDelivery.trim()) ? rank.estimatedDelivery.trim() : "2 - 6 ساعات";
    }

    if (lstRankRewards) {
      lstRankRewards.innerHTML = '';
      (rank.rewards || []).forEach(rew => {
        const div = document.createElement('div');
        div.className = 'fut-reward-item rival-reward-item';
        div.innerHTML = `<i class="${rew.icon}"></i><span>${rew.name}</span>`;
        lstRankRewards.appendChild(div);
      });
    }
  }

  updatePriceAndSummary();
};

function selectDynamicPlayer(playerId) {
  selectedPlayerId = playerId;
  isEliteMode = true; // All tiers use WhatsApp flow

  const nodes = document.querySelectorAll('.rivals-step-node');
  nodes.forEach(node => node.classList.remove('active'));

  const progressBar = document.getElementById('futsProgressBar');
  if (progressBar) progressBar.style.width = '0%';

  const p = activePlayers.find(player => player.id === playerId);
  const hiddenInput = document.getElementById('selectedRankInput');
  if (hiddenInput && p) {
    hiddenInput.value = `لعب وتصنيف للاعب: ${p.name}`;
  }

  const standardBlock = document.getElementById('standardOrderBlock');
  const eliteBlock = document.getElementById('eliteEvaluationBlock');
  const btnStandardSubmit = document.getElementById('btnStandardSubmit');
  const btnEliteWhatsApp = document.getElementById('btnEliteWhatsApp');
  if (standardBlock) standardBlock.style.display = 'block';
  if (eliteBlock) eliteBlock.style.display = 'none';
  if (btnStandardSubmit) btnStandardSubmit.style.display = 'flex';
  if (btnEliteWhatsApp) btnEliteWhatsApp.style.display = 'none';

  updatePriceAndSummary();
}

// Update Price & Bottom Sticky Bar
function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let rawPrice = 0;
  let formattedPrice = '';
  let selectedService = '';

  const rank = RIVALS_RANKS[currentSelectedRank];

  if (selectedPlayerId) {
    const p = activePlayers.find(player => player.id === selectedPlayerId);
    if (p) {
      rawPrice = p.priceSAR;
      if (selectedCurrency !== 'SAR') {
        rawPrice = p.priceUSD * cur.rate;
      }
      selectedService = `لعب وتصنيف اللاعب: ${p.name} (${p.rating})`;
    }
  } else if (rank) {
    selectedService = rank.name;
    rawPrice = rank.priceUSD * cur.rate;
  }

  if (activeCoupon && !isEliteMode) {
    const couponDiscountValue = rawPrice * (activeCoupon.percent / 100);
    rawPrice -= couponDiscountValue;
  }

  formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(rawPrice) + ' ' + cur.symbol;

  const summaryPrice = document.getElementById('summaryPrice');
  let platformName = 'بلايستيشن';
  if (currentPlatform === 'xbox') platformName = 'إكس بوكس';
  else if (currentPlatform === 'pc') platformName = 'PC';

  if (summaryPrice) {
    if (isEliteMode) {
      summaryPrice.innerHTML = `<span style="color: #16a34a; font-size: 1.05rem; font-weight: 800;"><i class="fab fa-whatsapp"></i> تواصل وتقييم فوري</span>`;
    } else {
      summaryPrice.textContent = formattedPrice;
    }
  }

  if (summaryServiceText) {
    summaryServiceText.textContent = `${selectedService} (${platformName})`;
  }
}

// ══════════ SQUAD SCREENSHOT UPLOAD HANDLERS (ELITE MODE) ══════════
window.handleSquadImageSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert("يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WebP).");
    return;
  }

  uploadedSquadFile = file;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedSquadDataUrl = e.target.result;
    
    const previewImg = document.getElementById('squadImgPreview');
    const promptBox = document.getElementById('uploadPrompt');
    const previewBox = document.getElementById('imagePreviewContainer');
    
    if (previewImg) previewImg.src = uploadedSquadDataUrl;
    if (promptBox) promptBox.style.display = 'none';
    if (previewBox) previewBox.style.display = 'block';
  };
  reader.readAsDataURL(file);
};

window.removeSquadImage = function() {
  uploadedSquadFile = null;
  uploadedSquadDataUrl = null;

  const fileInput = document.getElementById('squadFileInput');
  if (fileInput) fileInput.value = '';

  const previewImg = document.getElementById('squadImgPreview');
  const promptBox = document.getElementById('uploadPrompt');
  const previewBox = document.getElementById('imagePreviewContainer');

  if (previewImg) previewImg.src = '';
  if (previewBox) previewBox.style.display = 'none';
  if (promptBox) promptBox.style.display = 'block';
};

function setupDragAndDrop() {
  const dropZone = document.getElementById('squadDropZone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const fileInput = document.getElementById('squadFileInput');
      if (fileInput) {
        fileInput.files = files;
        handleSquadImageSelect({ target: { files: files } });
      }
    }
  }, false);
}

// ══════════ WHATSAPP SUBMISSION (ALL TIERS) ══════════
window.sendRivalsWhatsApp = function() {
  if (!uploadedSquadFile && !uploadedSquadDataUrl) {
    alert("⚠️ يرجى إرفاق سكرين شوت لتشكيلتك أولاً ليتم تقييمها والاتفاق على السعر المناسب.");
    const dropZone = document.getElementById('squadDropZone');
    if (dropZone) {
      dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dropZone.style.borderColor = '#ef4444';
      setTimeout(() => {
        dropZone.style.borderColor = '';
      }, 2000);
    }
    return;
  }

  const rank = RIVALS_RANKS[currentSelectedRank];
  const rankName = rank ? rank.name : "ترقية الرايفلز";
  let platformName = 'بلايستيشن (PlayStation)';
  if (currentPlatform === 'xbox') platformName = 'إكس بوكس (Xbox)';
  else if (currentPlatform === 'pc') platformName = 'الكمبيوتر (PC)';
  const phone = dynamicSettings.whatsappPhone || '962775585112';

  const messageText = 
`⚔️ *طلب خدمة رايفلز — Trivela*

🕹️ *المنصة:* ${platformName}
🎯 *الترقية المطلوبة:* ${rankName}
📸 *سكرين شوت التشكيلة:* مرفقة بالأسفل للتقييم

السلام عليكم، أرغب في تقييم تشكيلتي والاتفاق على السعر والوقت للبدء مباشرة.`;

  const encodedMsg = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

  window.open(waUrl, '_blank');
};

// ══════════ ALL RIVALS SUBMIT → WHATSAPP ══════════
window.handlePurchaseSubmit = function(event) {
  if (event) event.preventDefault();
  // All tiers go to WhatsApp — no cart flow for Rivals
  sendRivalsWhatsApp();
};

function showOrderSuccessPopup(orderId, whatsappPhone, priceStr, serviceName, platform) {
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Promise.all([fetchSettings(), fetchDynamicCoupons()]).then(() => {
    applyCMSPageContent();
    
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else if (platParam && platParam.toLowerCase() === 'xbox') {
      selectPlatform('Xbox');
    } else {
      selectPlatform('PlayStation');
    }

    loadDynamicPlayers();

    if (window.selectRivalsRank) {
      window.selectRivalsRank('7wins', 0);
    }

    setupDragAndDrop();
  });
});

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

window.togglePasswordVisibility = function() {
  const passInput = document.getElementById('sonyPassword') || document.getElementById('eaPassword');
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
