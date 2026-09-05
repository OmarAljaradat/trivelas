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

// ══════════ EA FC IN-GAME OBJECTIVES DATA ══════════
const OBJECTIVES_DATA = {
  rush: {
    id: "rush",
    name: "مهام نمط الـ Rush الأسبوعية",
    icon: "fas fa-bolt",
    time: "متوسط الإنجاز: 2 - 4 ساعات",
    priceUSD: 15,
    priceSAR: 55,
    finalRewardSub: "حزمة ميجا نادرة + 5x لاعبين 83+ + نقاط أهداف كاملة",
    rewardPills: [
      { icon: "fas fa-gem", text: "+20,000 Rush SP" },
      { icon: "fas fa-box-open", text: "2x باقات جامبو" },
      { icon: "fas fa-users", text: "5x لاعبين 83+" }
    ],
    subtasks: [
      { num: 1, name: "العب 5 مباريات في نمط الـ Rush الأسبوعي", desc: "المشاركة في مباريات النمط مع تسجيل الأهداف", reward: "✨ +1,000 XP" },
      { num: 2, name: "سجل 10 أهداف بتمريرات بينية سريعة", desc: "إنهاء الهجمات بتمريرات مباشرة دقيقة", reward: "🎁 حزمة لاعبين ذهبيين" },
      { num: 3, name: "اصنع 5 أهداف بتمريرات حاسمة بالقدم الضعيفة", desc: "صناعة اللعب بلاعبي خط الوسط والهجوم", reward: "✨ +1,500 XP" },
      { num: 4, name: "حقق 4 انتصارات في الـ Rush مع تقييم 8.0+", desc: "تحقيق الفوز بأداء فردي وجماعي متميز", reward: "🎁 باقة 83+ x2" }
    ]
  },
  cup: {
    id: "cup",
    name: "كأس البطولة الودي (Live Friendly Cup)",
    icon: "fas fa-trophy",
    time: "متوسط الإنجاز: 3 - 5 ساعات",
    priceUSD: 18,
    priceSAR: 70,
    finalRewardSub: "باقة 85+ x3 نادرة + بطاقة لاعب سيزون خاص + 2,500 XP",
    rewardPills: [
      { icon: "fas fa-trophy", text: "10 انتصارات كاملة" },
      { icon: "fas fa-box-open", text: "باقة 85+ x3" },
      { icon: "fas fa-star", text: "+2,500 XP" }
    ],
    subtasks: [
      { num: 1, name: "سجل في 6 مباريات منفصلة في الكأس الودي", desc: "التسجيل في كل مباراة بأي لاعب", reward: "🎁 باقة ذهبية ممتازة" },
      { num: 2, name: "اصنع 4 أهداف باستخدام لاعبي الدوري الإنجليزي", desc: "صناعة الفرص المحققة", reward: "✨ +800 XP" },
      { num: 3, name: "حافظ على نظافة الشباك في 3 مباريات", desc: "إنهاء المباريات بدون استقبال أهداف", reward: "🎁 باقة لاعبين 82+ x3" },
      { num: 4, name: "حقق 10 انتصارات كاملة في كأس البطولة", desc: "تأمين الحد الأقصى من مكافآت الكأس", reward: "🎁 باقة 84+ x5" }
    ]
  },
  player: {
    id: "player",
    name: "مهام لاعب الأسبوع المجاني (Player Objective)",
    icon: "fas fa-user-ninja",
    time: "متوسط الإنجاز: 2 - 4 ساعات",
    priceUSD: 17,
    priceSAR: 65,
    finalRewardSub: "بطاقة اللاعب الخاصة الرسمية تقييم 89 OVR غير قابلة للمقايضة",
    rewardPills: [
      { icon: "fas fa-id-card", text: "بطاقة لاعب 89 OVR" },
      { icon: "fas fa-bolt", text: "PlayStyle+ مدمج" },
      { icon: "fas fa-gift", text: "4x باقات متنوعة" }
    ],
    subtasks: [
      { num: 1, name: "سجل 8 أهداف بتسديدة ساقطة أو مقوسة Finesse", desc: "في مباريات الرايفلز أو السكواد باتلز (نصف محترف+)", reward: "🎁 باقة 80+ x2" },
      { num: 2, name: "اصنع 5 أهداف بلاعبين يملكون 4 نجوم مهارة على الأقل", desc: "باستخدام مهارات المراوغة والتمرير", reward: "✨ +1,000 XP" },
      { num: 3, name: "العب 7 مباريات مع تشكيلة تحتوي 3 لاعبين من نفس الدوري", desc: "المشاركة بالتشكيلة المطلوبة", reward: "🎁 باقة 82+ x2" },
      { num: 4, name: "فز في 5 مباريات منفصلة بفارق هدفين على الأقل", desc: "تحقيق الفوز المريح", reward: "🏆 كارت اللاعب 89 OVR" }
    ]
  },
  evo: {
    id: "evo",
    name: "تطوير Evolution المتقدم (Full Tier)",
    icon: "fas fa-dna",
    time: "متوسط الإنجاز: 4 - 8 ساعات",
    priceUSD: 25,
    priceSAR: 95,
    finalRewardSub: "إنهاء كافة مستويات التطوير Level 1 / 2 / 3 وترقية بطاقة لاعبك بالكامل",
    rewardPills: [
      { icon: "fas fa-arrow-up", text: "+6 OVR ترقية كاملة" },
      { icon: "fas fa-star", text: "5★ مهارات أو قدم" },
      { icon: "fas fa-shield-halved", text: "PlayStyle+ إضافي" }
    ],
    subtasks: [
      { num: 1, name: "Level 1: العب 3 مباريات واصنع هدفين باللاعب", desc: "إنهاء متطلبات المستوى الأول", reward: "⚡ ترقية السرعة والتسديد" },
      { num: 2, name: "Level 2: فز في 4 مباريات بشباك نظيفة مع إشراك اللاعب", desc: "إنهاء متطلبات المستوى الثاني", reward: "⚡ ترقية الدفاع والبدنية" },
      { num: 3, name: "Level 3: سجل 5 أهداف باللاعب في الرايفلز أو الأبطال", desc: "إنهاء متطلبات المستوى الثالث والأخير", reward: "⚡ الترقية النهائية + PlayStyle+" }
    ]
  },
  xp: {
    id: "xp",
    name: "حزمة تسريع السيزون (+10,000 XP)",
    icon: "fas fa-star",
    time: "متوسط الإنجاز: 3 - 6 ساعات",
    priceUSD: 16,
    priceSAR: 60,
    finalRewardSub: "تجميع 10,000 نقطة XP مضمونة لفتح مراتب السيزون وباكات الـ 87+",
    rewardPills: [
      { icon: "fas fa-star", text: "+10,000 Season XP" },
      { icon: "fas fa-layer-group", text: "فتح 10 مستويات" },
      { icon: "fas fa-gift", text: "باقة الموسم 87+" }
    ],
    subtasks: [
      { num: 1, name: "إنهاء حزمة المهام اليومية لـ 7 أيام متتالية", desc: "تسجيل الدخول ولعب المباريات اليومية", reward: "✨ +3,500 XP" },
      { num: 2, name: "إنهاء المهام الأسبوعية الشاملة والتحديات الإقليمية", desc: "إتمام شروط الأهداف الموسمية", reward: "✨ +4,000 XP" },
      { num: 3, name: "تجميع مهام الأطوار والمباريات السريعة", desc: "حصد كافة نقاط الـ XP المتبقية", reward: "✨ +2,500 XP" }
    ]
  }
};

let activeGroupId = "rush";
let selectedGroupIds = new Set();

// Dynamic settings & coupons
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

function fetchDynamicObjectives() {
  return fetch('/api/public/objectives')
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        Object.keys(OBJECTIVES_DATA).forEach(k => delete OBJECTIVES_DATA[k]);
        data.forEach(item => {
          OBJECTIVES_DATA[item.id] = item;
        });
      }
      renderGroupListSidebar();
      const firstKey = Object.keys(OBJECTIVES_DATA)[0] || 'rush';
      showGroupDetail(firstKey);
      updateAllPricesAndSummary();
    })
    .catch(err => {
      console.warn("Could not fetch dynamic objectives, using fallback:", err);
      renderGroupListSidebar();
      showGroupDetail('rush');
      updateAllPricesAndSummary();
    });
}

function renderGroupListSidebar() {
  const container = document.getElementById('fcGroupList');
  if (!container) return;

  const groupKeys = Object.keys(OBJECTIVES_DATA);
  if (groupKeys.length === 0) return;

  if (!OBJECTIVES_DATA[activeGroupId]) {
    activeGroupId = groupKeys[0];
  }

  container.innerHTML = groupKeys.map(k => {
    const g = OBJECTIVES_DATA[k];
    const isSelected = selectedGroupIds.has(k) ? 'is-selected' : '';
    const isActive = activeGroupId === k ? 'active-view' : '';
    const formattedPrice = formatPrice(g.priceUSD, g.priceSAR);
    return `
      <div class="fc-group-card ${isActive} ${isSelected}" id="groupCard_${g.id}" onclick="showGroupDetail('${g.id}')">
        <div class="fc-group-card-left">
          <div class="fc-group-icon"><i class="${g.icon || 'fas fa-bolt'}"></i></div>
          <div class="fc-group-meta">
            <span class="fc-group-title">${g.name}</span>
            <span class="fc-group-sub">${g.subtasks ? g.subtasks.length + ' مهام فرعية' : 'تحديات رسمية'}</span>
          </div>
        </div>
        <div class="fc-group-card-right">
          <span class="fc-group-price-pill">${formattedPrice}</span>
          <div class="fc-group-select-checkbox"><i class="fas fa-check"></i></div>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  fetchSettings().then(() => {
    fetchDynamicObjectives();

    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
      currencySelect.addEventListener('change', () => {
        renderGroupListSidebar();
        updateAllPricesAndSummary();
      });
    }
  });
});

// ══════════ SHOW GROUP IN DETAIL STAGE ══════════
window.showGroupDetail = function(groupId) {
  const group = OBJECTIVES_DATA[groupId];
  if (!group) return;

  activeGroupId = groupId;

  // Highlight active in left list
  document.querySelectorAll('.fc-group-card').forEach(card => {
    card.classList.remove('active-view');
  });
  const activeCard = document.getElementById(`groupCard_${groupId}`);
  if (activeCard) activeCard.classList.add('active-view');

  // Update Header in Detail Stage
  const stageIcon = document.getElementById('stageIcon');
  const stageTitle = document.getElementById('stageTitle');
  const stageTime = document.getElementById('stageTime');
  const stageRewardSubtitle = document.getElementById('stageRewardSubtitle');
  const stageRewardPills = document.getElementById('stageRewardPills');
  const stageSubtasksList = document.getElementById('stageSubtasksList');

  if (stageIcon) stageIcon.innerHTML = `<i class="${group.icon}"></i>`;
  if (stageTitle) stageTitle.textContent = group.name;
  if (stageTime) stageTime.innerHTML = `<i class="far fa-clock"></i> ${group.time}`;
  if (stageRewardSubtitle) stageRewardSubtitle.textContent = group.finalRewardSub;

  if (stageRewardPills) {
    stageRewardPills.innerHTML = group.rewardPills.map(p => `
      <span class="fc-reward-chip"><i class="${p.icon}"></i> ${p.text}</span>
    `).join('');
  }

  if (stageSubtasksList) {
    stageSubtasksList.innerHTML = group.subtasks.map(t => `
      <div class="fc-subtask-item">
        <div class="fc-subtask-info">
          <div class="fc-subtask-num">${t.num}</div>
          <div class="fc-subtask-details">
            <span class="fc-subtask-name">${t.name}</span>
            <span class="fc-subtask-desc">${t.desc}</span>
          </div>
        </div>
        <div class="fc-subtask-reward-tag">${t.reward}</div>
      </div>
    `).join('');
  }

  updateStageButtonState();
};

// ══════════ TOGGLE SELECTION ══════════
window.toggleActiveGroupSelection = function() {
  if (selectedGroupIds.has(activeGroupId)) {
    selectedGroupIds.delete(activeGroupId);
  } else {
    selectedGroupIds.add(activeGroupId);
  }

  updateGroupCardSelectionState(activeGroupId);
  updateStageButtonState();
  updateAllPricesAndSummary();
};

function updateGroupCardSelectionState(groupId) {
  const card = document.getElementById(`groupCard_${groupId}`);
  if (!card) return;

  if (selectedGroupIds.has(groupId)) {
    card.classList.add('is-selected');
  } else {
    card.classList.remove('is-selected');
  }
}

function updateStageButtonState() {
  const btn = document.getElementById('btnStageToggle');
  const label = document.getElementById('stageBtnLabel');
  if (!btn || !label) return;

  const group = OBJECTIVES_DATA[activeGroupId];
  const formattedPrice = formatPrice(group.priceUSD, group.priceSAR);

  if (selectedGroupIds.has(activeGroupId)) {
    btn.classList.add('added');
    btn.innerHTML = `<i class="fas fa-check"></i> <span>تمت الإضافة للطلب (${formattedPrice})</span>`;
  } else {
    btn.classList.remove('added');
    btn.innerHTML = `<i class="fas fa-plus"></i> <span>إضافة للطلب (${formattedPrice})</span>`;
  }
}

function formatPrice(usd, sar) {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  let priceVal = sar;
  if (selectedCurrency !== 'SAR') {
    priceVal = usd * cur.rate;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(priceVal) + ' ' + cur.symbol;
}

// ══════════ UPDATE ALL PRICES & SUMMARY BAR ══════════
function updateAllPricesAndSummary() {
  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  // Update prices on cards
  Object.keys(OBJECTIVES_DATA).forEach(k => {
    const card = document.getElementById(`groupCard_${k}`);
    if (card) {
      const pill = card.querySelector('.fc-group-price-pill');
      if (pill) {
        pill.textContent = formatPrice(OBJECTIVES_DATA[k].priceUSD, OBJECTIVES_DATA[k].priceSAR);
      }
    }
  });

  // Calculate total for selected items
  let totalRaw = 0;
  const selectedNames = [];

  selectedGroupIds.forEach(id => {
    const g = OBJECTIVES_DATA[id];
    if (g) {
      let priceVal = g.priceSAR;
      if (selectedCurrency !== 'SAR') {
        priceVal = g.priceUSD * cur.rate;
      }
      totalRaw += priceVal;
      selectedNames.push(g.name);
    }
  });

  const finalFormattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(totalRaw) + ' ' + cur.symbol;

  const summaryPrice = document.getElementById('summaryPrice');
  const summaryServiceText = document.getElementById('summaryServiceText');

  if (summaryPrice) summaryPrice.textContent = finalFormattedPrice;
  if (summaryServiceText) {
    if (selectedNames.length > 0) {
      summaryServiceText.textContent = `تم اختيار (${selectedNames.length}) مجموعات: ` + selectedNames.join(' + ');
    } else {
      summaryServiceText.textContent = "يرجى اختيار مجموعة أهداف واحدة على الأقل";
    }
  }

  updateStageButtonState();
}

// ══════════ UNIFIED ACCOUNT HELPERS ══════════
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
};

// ══════════ SUBMIT PURCHASE ══════════
window.handlePurchaseSubmit = function(event) {
  event.preventDefault();

  if (selectedGroupIds.size === 0) {
    alert("⚠️ يرجى اختيار مجموعة أهداف واحدة على الأقل للمتابعة.");
    const list = document.getElementById('fcGroupList');
    if (list) {
      list.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const selectedItems = Array.from(selectedGroupIds).map(id => OBJECTIVES_DATA[id]);
  let totalSAR = 0;
  const names = [];

  selectedItems.forEach(item => {
    totalSAR += item.priceSAR;
    names.push(item.name);
  });

  const confirmCheck = document.getElementById('sonyConfirmCheck');
  if (confirmCheck && !confirmCheck.checked) {
    alert("⚠️ يُرجى تأكيد صحة بيانات الحساب عبر تحديد المربع للمتابعة وإتمام الطلب.");
    confirmCheck.focus();
    return;
  }

  const email = document.getElementById('sonyEmail').value.trim();
  const password = document.getElementById('sonyPassword').value;
  const chkBackupHelp = document.getElementById('chkNeedBackupHelp');
  const isBackupHelp = chkBackupHelp ? chkBackupHelp.checked : false;
  const code1 = isBackupHelp ? 'مساعدة الدعم الفني' : document.getElementById('backup1').value.trim();
  const code2 = isBackupHelp ? '—' : (document.getElementById('backup2').value.trim() || '—');
  const code3 = isBackupHelp ? '—' : (document.getElementById('backup3').value.trim() || '—');
  const orderNotes = (document.getElementById('eaOrderNotes')?.value || '').trim();

  const cartItem = {
    id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    addedAt: new Date().toISOString(),
    service: `إنجاز مهام Objectives: ${names.join(' + ')}`,
    type: 'objectives',
    platform: 'سوني وإكس بوكس (Console)',
    priceSAR: totalSAR,
    eaEmail: email,
    eaPassword: password,
    backupCodes: [code1, code2, code3].filter(c => c && c !== '—'),
    clubName: clubName !== '—' ? clubName : '',
    notes: orderNotes
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

  // Instant visual feedback on button
  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.innerHTML = '<span>تمت الإضافة إلى السلة ✔</span> <i class="fas fa-check"></i>';
    submitBtn.style.background = '#16a34a';
    setTimeout(() => {
      submitBtn.innerHTML = '<span>إضافة إلى السلة</span> <i class="fas fa-cart-plus"></i>';
      submitBtn.style.background = '';
    }, 2500);
  }
};

// ══════════ PAYMENT METHOD (DEFAULT WHATSAPP) ══════════
window.currentSelectedPaymentMethod = 'whatsapp';
window.selectPaymentMethod = function(method) {
  window.currentSelectedPaymentMethod = 'whatsapp';
  const cardWhatsApp = document.getElementById('payOptionWhatsApp');
  const radioWhatsApp = cardWhatsApp ? cardWhatsApp.querySelector('input') : null;
  const submitBtn = document.getElementById('btnSubmitOrder');

  if (cardWhatsApp) cardWhatsApp.classList.add('active');
  if (radioWhatsApp) radioWhatsApp.checked = true;
  if (submitBtn) {
    submitBtn.innerHTML = '<span>إضافة إلى السلة</span> <i class="fas fa-cart-plus"></i>';
  }
};


function showPurchaseReceipt(orderData) {
  let overlay = document.getElementById('purchaseReceiptOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'purchaseReceiptOverlay';
    overlay.className = 'receipt-modal-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="receipt-card">
      <div class="receipt-header success">
        <div class="receipt-icon"><i class="fas fa-check-circle"></i></div>
        <h2>تم استلام طلبك بنجاح!</h2>
        <p>شكراً لثقتك بمتجر ShopCoin — جاري بدء إنجاز المهام في حسابك</p>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <span class="label">رقم الطلب:</span>
          <span class="value font-mono">#${orderData.orderId}</span>
        </div>
        <div class="receipt-row">
          <span class="label">الخدمة:</span>
          <span class="value">${orderData.serviceName}</span>
        </div>
        <div class="receipt-row">
          <span class="label">المنصة:</span>
          <span class="value">بلايستيشن (PlayStation)</span>
        </div>
        <div class="receipt-row total">
          <span class="label">المبلغ الإجمالي:</span>
          <span class="value">${orderData.priceFormatted}</span>
        </div>
      </div>
      
      <button type="button" class="order-success-btn" onclick="window.location.href='track.html?id=${orderData.orderId}'">
        <span>متابعة حالة الطلب</span>
        <i class="fas fa-arrow-left"></i>
      </button>
    </div>
  `;

  overlay.classList.add('open');
}
