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

// Current State
let currentPlatform = 'console';

// Dynamic Player Champions State
let activePlayers = [];
let selectedPlayerId = null;

// FUT Champions Ranks Configuration
const FUT_RANKS = {
  qualify: {
    name: "تأهيل تصفيات فوت تشامبيونز (Playoffs)",
    wins: "4 انتصارات / 20 نقطة",
    priceUSD: 10,
    rewards: [
      { name: "2× حزمة لاعبين ذهبيين", icon: "fas fa-box-open" },
      { name: "1× حزمة لاعبين ذهبيين ممتازة صغيرة", icon: "fas fa-box" },
      { name: "تذكرة نهائيات ويكند ليج", icon: "fas fa-ticket" }
    ]
  },
  rank5: {
    name: "الرتبة الخامسة (Rank 5)",
    wins: "11 انتصار",
    priceUSD: 25,
    rewards: [
      { name: "2× اختيار لاعبين 85+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "1× حزمة لاعبين نادرين (50K Pack)", icon: "fas fa-box-open" },
      { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
      { name: "20,000 كوينز نقدي", icon: "fas fa-coins" }
    ]
  },
  rank4: {
    name: "الرتبة الرابعة (Rank 4)",
    wins: "14 انتصار",
    priceUSD: 35,
    rewards: [
      { name: "3× اختيار لاعبين 85+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "1× حزمة جامبو لاعبين نادرين (100K Pack)", icon: "fas fa-box-open" },
      { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
      { name: "50,000 كوينز نقدي", icon: "fas fa-coins" }
    ]
  },
  rank3: {
    name: "الرتبة الثالثة (Rank 3)",
    wins: "16 انتصار",
    priceUSD: 50,
    rewards: [
      { name: "3× اختيار لاعبين 85+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "1× حزمة حملة 87+ (Campaign Pack)", icon: "fas fa-box" },
      { name: "2× حزمة التيميت (250K Pack Value)", icon: "fas fa-trophy" },
      { name: "75,000 كوينز نقدي", icon: "fas fa-coins" }
    ]
  },
  rank2: {
    name: "الرتبة الثانية (Rank 2)",
    wins: "18 انتصار",
    priceUSD: 75,
    rewards: [
      { name: "4× اختيار لاعبين 85+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "1× حزمة حملة 87+ ممتازة", icon: "fas fa-box" },
      { name: "2× حزمة التيميت (250K Pack Value)", icon: "fas fa-trophy" },
      { name: "100,000 كوينز نقدي", icon: "fas fa-coins" }
    ]
  },
  rank1: {
    name: "الرتبة الأولى (Rank 1)",
    wins: "19-20 انتصار",
    priceUSD: 110,
    rewards: [
      { name: "4× اختيار لاعبين 85+ (Player Pick)", icon: "fas fa-hand-pointer" },
      { name: "1× حزمة حملة 87+ فائقة", icon: "fas fa-box" },
      { name: "3× حزمة التيميت (375K Pack Value)", icon: "fas fa-trophy" },
      { name: "125,000 كوينز نقدي", icon: "fas fa-coins" }
    ]
  }
};

let currentSelectedRank = 'qualify';

// Loyalty & Coupon State
/* dynamicCoupons removed */
let activeCoupon = null;
let usePointsActive = false;
let userPoints = 0;

// Fetch settings from server
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;

        // Redirect if service is disabled
        if (dynamicSettings.enableServiceChampions === false) {
          alert("عذراً، خدمة فوت شامبيونز متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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
      if (data.champions_ranks) {
        Object.keys(FUT_RANKS).forEach(key => delete FUT_RANKS[key]);
        Object.assign(FUT_RANKS, data.champions_ranks);
      }
    })
    .catch(err => {
      console.warn("Could not fetch settings dynamically:", err);
    });
}

function applyCMSPageContent() {
  const content = dynamicSettings.content;
  if (!content || !content.championsPage) return;
  const cp = content.championsPage;
  
  const title = document.getElementById('cms_championsTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_championsDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_championsHint');
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
    // Parse URL parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else {
      selectPlatform('Console');
    }

    // Load dynamic players
    loadDynamicPlayers();

    // Initialize default Rank Slider selection
    setTimeout(() => {
      if (window.selectFutRank) {
        window.selectFutRank('qualify', 0);
      }
    }, 100);
  });

  loadUserLoyalty();
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
}

// Toggle Password Visibility
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

// Format expiration countdown label helper
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
      activePlayers = data.filter(p => p.category === 'champions');
      renderActivePlayersGrid();
    })
    .catch(err => {
      console.warn("Could not fetch active players from database server:", err);
    });
}

// Render dynamic players grid
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
    // Calculate player price
    let finalPrice = p.priceSAR;
    if (selectedCurrency !== 'SAR') {
      finalPrice = p.priceUSD * cur.rate;
    }
    const formattedPrice = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(finalPrice) + ' ' + cur.symbol;

    // Check expiration and SBC badges
    let badgesHTML = '';
    const expiry = getExpiryInfo(p.expirationDate);
    if (expiry) {
      const urgentClass = expiry.urgent ? 'urgent' : '';
      badgesHTML += `<div class="player-card-expiry-badge ${urgentClass}"><i class="far fa-clock"></i> ${expiry.label}</div>`;
    }
    if (p.sbcCount) {
      badgesHTML += `<div class="player-card-sbc-badge"><i class="fas fa-puzzle-piece"></i> ${p.sbcCount}</div>`;
    }

    const card = document.createElement('div');
    card.className = 'player-card-btn';
    card.setAttribute('data-id', p.id);
    card.innerHTML = `
      ${badgesHTML}
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

// Expose FUT Rank selection globally
window.selectFutRank = function(rankId, progressPercentage) {
  currentSelectedRank = rankId;
  selectedPlayerId = null; // deselect active dynamic player card

  // Update hidden input for form submission
  const hiddenInput = document.getElementById('selectedRankInput');
  const rank = FUT_RANKS[rankId];
  if (hiddenInput && rank) {
    hiddenInput.value = rank.name;
  }

  // Deselect player card buttons visual active state
  const playerCardBtns = document.querySelectorAll('.player-card-btn');
  playerCardBtns.forEach(btn => btn.classList.remove('active'));

  // Update slider nodes active class
  const nodes = document.querySelectorAll('.futs-step-node');
  nodes.forEach(node => {
    const nodeRankId = node.id.replace('node_', '');
    node.classList.toggle('active', nodeRankId === rankId);
  });

  // Update progress bar width
  const progressBar = document.getElementById('futsProgressBar');
  if (progressBar) {
    progressBar.style.width = progressPercentage + '%';
  }

  // Render rewards card content
  if (rank) {
    const lblRankName = document.getElementById('lblRankName');
    const lblRankWins = document.getElementById('lblRankWins');
    const lstRankRewards = document.getElementById('lstRankRewards');

    if (lblRankName) lblRankName.textContent = rank.name;
    if (lblRankWins) lblRankWins.textContent = rank.wins;

    if (lstRankRewards) {
      lstRankRewards.innerHTML = '';
      rank.rewards.forEach(rew => {
        const div = document.createElement('div');
        div.className = 'fut-reward-item';
        div.innerHTML = `<i class="${rew.icon}"></i><span>${rew.name}</span>`;
        lstRankRewards.appendChild(div);
      });
    }
  }

  updatePriceAndSummary();
}

// Select a dynamic player card
function selectDynamicPlayer(playerId) {
  selectedPlayerId = playerId;

  // Deselect FUT Rank nodes visually
  const nodes = document.querySelectorAll('.futs-step-node');
  nodes.forEach(node => node.classList.remove('active'));

  const progressBar = document.getElementById('futsProgressBar');
  if (progressBar) progressBar.style.width = '0%';

  // Update hidden input to player name
  const p = activePlayers.find(player => player.id === playerId);
  const hiddenInput = document.getElementById('selectedRankInput');
  if (hiddenInput && p) {
    hiddenInput.value = `لعب فوت للاعب: ${p.name}`;
  }

  // Toggle active class in grid
  const playerCardBtns = document.querySelectorAll('.player-card-btn');
  playerCardBtns.forEach(btn => {
    const isSelected = btn.getAttribute('data-id') === playerId;
    btn.classList.toggle('active', isSelected);
  });

  updatePriceAndSummary();
}

// Update Price & Converted Labels
function updatePriceAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  if (userPoints > 0) {
    updatePointsDisplayVal();
  }

  let rawPrice = 0;
  let formattedPrice = '';
  let selectedService = '';

  if (selectedPlayerId) {
    const p = activePlayers.find(player => player.id === selectedPlayerId);
    if (p) {
      rawPrice = p.priceSAR;
      if (selectedCurrency !== 'SAR') {
        rawPrice = p.priceUSD * cur.rate;
      }
      selectedService = `لعب فوت تشامبيون للاعب: ${p.name} (${p.rating})`;
    }
  } else {
    // Calculate price based on selected FUT Rank
    const rank = FUT_RANKS[currentSelectedRank];
    if (rank) {
      selectedService = rank.name;
      rawPrice = rank.priceUSD * cur.rate;
    }
  }

  // 1. Coupon Discount
  let couponDiscountValue = 0;
  if (activeCoupon) {
    couponDiscountValue = rawPrice * (activeCoupon.percent / 100);
    rawPrice -= couponDiscountValue;
  }

  // 2. Loyalty Points Discount
  let pointsDiscountValue = 0;
  let pointsDeducted = 0;

  if (usePointsActive && userPoints > 0) {
    const maxDiscountUSD = userPoints / 37.5;
    const maxDiscountConverted = maxDiscountUSD * cur.rate;

    pointsDiscountValue = Math.min(rawPrice, maxDiscountConverted);
    rawPrice -= pointsDiscountValue;
    pointsDeducted = Math.round((pointsDiscountValue / cur.rate) * 37.5);
  }

  formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(rawPrice) + ' ' + cur.symbol;

  // Update displays
  const displayPrice = document.getElementById('displayPrice');
  const summaryPrice = document.getElementById('summaryPrice');
  const summaryServiceText = document.getElementById('summaryServiceText');

  if (displayPrice) displayPrice.textContent = formattedPrice;
  if (summaryPrice) summaryPrice.textContent = formattedPrice;
  if (summaryServiceText) summaryServiceText.textContent = selectedService;

  // Refresh dynamic prices inside player cards
  const playerCardBtns = document.querySelectorAll('.player-card-btn');
  playerCardBtns.forEach(btn => {
    const id = btn.getAttribute('data-id');
    const p = activePlayers.find(player => player.id === id);
    if (p) {
      let finalPrice = p.priceSAR;
      if (selectedCurrency !== 'SAR') {
        finalPrice = p.priceUSD * cur.rate;
      }
      const priceText = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: cur.dec,
        maximumFractionDigits: cur.dec
      }).format(finalPrice) + ' ' + cur.symbol;

      const priceDiv = btn.querySelector('.player-card-price');
      if (priceDiv) priceDiv.textContent = priceText;
    }
  });
}

// Form Submission
function handlePurchaseSubmit(event) {
  event.preventDefault();

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let rawPrice = 0;
  let selectedService = '';

  if (selectedPlayerId) {
    const p = activePlayers.find(player => player.id === selectedPlayerId);
    if (p) {
      rawPrice = p.priceSAR;
      if (selectedCurrency !== 'SAR') {
        rawPrice = p.priceUSD * cur.rate;
      }
      selectedService = `إنهاء تصفيات/نهائيات للاعب: ${p.name} (${p.version} - ${p.rating} ${p.position})`;
    }
  } else {
    const rank = FUT_RANKS[currentSelectedRank];
    if (rank) {
      selectedService = rank.name;
      rawPrice = rank.priceUSD * cur.rate;
    }
  }

  let couponDiscountValue = 0;
  let couponDiscountText = '';
  if (activeCoupon) {
    couponDiscountValue = rawPrice * (activeCoupon.percent / 100);
    rawPrice -= couponDiscountValue;
    
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
    
    pointsDiscountValue = Math.min(rawPrice, maxDiscountConverted);
    rawPrice -= pointsDiscountValue;
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
  }).format(rawPrice) + ' ' + cur.symbol;

  const email = document.getElementById('sonyEmail').value;
  const password = document.getElementById('sonyPassword').value;
  const code1 = document.getElementById('backup1').value;
  const code2 = document.getElementById('backup2').value;
  const code3 = document.getElementById('backup3').value;
  const platformName = currentPlatform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس (Console)';

  let msg = `🎮 طلب خدمة فوت تشامبيون جديدة — Trivela\n\n` +
            `🕹️ الجهاز: ${platformName}\n` +
            `📦 الخدمة المطلوبة: ${selectedService}\n` +
            `💵 الاجمالي: ${formattedPrice}\n`;

  if (couponDiscountText) {
    msg += `${couponDiscountText}\n`;
  }
  if (pointsDiscountText) {
    msg += `${pointsDiscountText}\n`;
  }

  msg += `\n🔑 بيانات حساب السوني (PSN) المرفقة:\n` +
         `📧 الايميل: ${email}\n` +
         `🔒 كلمة المرور: ${password}\n` +
         `🔐 الرموز الاحتياطية للسوني: ${code1} - ${code2} - ${code3}\n\n` +
         `_أرسل من Trivela.com_`;

  // Calculate raw price in SAR
  let rawPriceSAR = 0;
  if (selectedPlayerId) {
    const p = activePlayers.find(player => player.id === selectedPlayerId);
    if (p) rawPriceSAR = p.priceSAR;
  } else {
    const rank = FUT_RANKS[currentSelectedRank];
    if (rank) {
      rawPriceSAR = rank.priceUSD * 3.75;
    }
  }
  
  const couponDiscountSAR = activeCoupon ? (rawPriceSAR * (activeCoupon.percent / 100)) : 0;
  const remainingAfterCouponSAR = rawPriceSAR - couponDiscountSAR;
  const pointsDiscountSAR = (pointsDeducted / 37.5) * 3.75;
  const finalPriceSAR = Math.max(0, remainingAfterCouponSAR - pointsDiscountSAR);

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const customerName = nameInput ? nameInput.value.trim() : (loggedInName || email.split('@')[0]);
  const customerPhone = phoneInput ? phoneInput.value.trim() : (loggedInPhone || "غير محدد");

  const orderPayload = {
    customerName: customerName,
    customerPhone: customerPhone,
    service: selectedService,
    platform: currentPlatform,
    priceSAR: finalPriceSAR,
    pointsDiscount: pointsDiscountSAR + couponDiscountSAR,
    pointsDeducted: pointsDeducted,
    couponCode: activeCoupon ? activeCoupon.code : null,
    sonyEmail: email,
    sonyPassword: password,
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
  let customerName = 'غير محدد';
  let serviceName = 'خدمة فوت تشامبيونز';
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
      } else if (trimmed.includes('الخدمة المطلوبة:')) {
        serviceName = trimmed.split(':')[1].trim();
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
