let dynamicSettings = {
  whatsappPhone: "962775585112",
  instagramUrl: "https://www.instagram.com/shopcoin15",
  maintenanceMode: false
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

const COACHING_PACKAGES = {
  squad: {
    id: "squad",
    name: "بناء التشكيلة والتكتيكات (Squad & Tactics Pro)",
    shortName: "بناء التشكيلة والتكتيكات",
    priceUSD: 12,
    priceSAR: 45,
    icon: "fas fa-chess"
  },
  live: {
    id: "live",
    name: "تدريب فردي مباشر (1-on-1 Pro Coaching)",
    shortName: "تدريب فردي مباشر (1-on-1)",
    priceUSD: 23,
    priceSAR: 85,
    icon: "fas fa-headset"
  },
  vip: {
    id: "vip",
    name: "باقة النخبة الشاملة (VIP Ultimate Masterclass)",
    shortName: "باقة النخبة الشاملة (VIP)",
    priceUSD: 40,
    priceSAR: 150,
    icon: "fas fa-crown"
  }
};

let activePackageKey = "live";
let selectedPlaystyle = "هجوم مرتد وسريع";
let uploadedSquadFile = null;
let uploadedSquadDataUrl = null;

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

document.addEventListener('DOMContentLoaded', () => {
  fetchSettings().then(() => {
    selectCoachingPackage('live');
    updateAllPricesAndSummary();

    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
      currencySelect.addEventListener('change', () => {
        updateAllPricesAndSummary();
      });
    }

    setupDragAndDrop();
  });
});

// ══════════ PACKAGE SELECTION ══════════
window.selectCoachingPackage = function(pkgKey) {
  if (!COACHING_PACKAGES[pkgKey]) return;
  activePackageKey = pkgKey;

  // Toggle card active states
  ['squad', 'live', 'vip'].forEach(k => {
    const card = document.getElementById(`pkg_${k}`);
    const btn = document.getElementById(`btnSelect_${k}`);
    if (card) card.classList.toggle('active', k === pkgKey);
    if (btn) {
      if (k === pkgKey) {
        btn.innerHTML = `<i class="fas fa-check"></i> <span>الباقة المختارة حالياً</span>`;
      } else {
        btn.innerHTML = `<span>اختيار هذه الباقة</span> <i class="fas fa-arrow-left"></i>`;
      }
    }
  });

  updateAllPricesAndSummary();
};

// ══════════ PLAYSTYLE SELECTION ══════════
window.selectPlaystyle = function(btn, styleName) {
  selectedPlaystyle = styleName;
  document.querySelectorAll('.playstyle-pill-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
};

// ══════════ SQUAD IMAGE UPLOAD ══════════
window.handleCoachingImageSelect = function(event) {
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

window.removeCoachingImage = function() {
  uploadedSquadFile = null;
  uploadedSquadDataUrl = null;

  const fileInput = document.getElementById('coachingSquadInput');
  if (fileInput) fileInput.value = '';

  const previewImg = document.getElementById('squadImgPreview');
  const promptBox = document.getElementById('uploadPrompt');
  const previewBox = document.getElementById('imagePreviewContainer');

  if (previewImg) previewImg.src = '';
  if (promptBox) promptBox.style.display = 'block';
  if (previewBox) previewBox.style.display = 'none';
};

function setupDragAndDrop() {
  const dropZone = document.getElementById('squadDropZone');
  if (!dropZone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = '#2563eb';
      dropZone.style.background = '#f0fdf4';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = '';
      dropZone.style.background = '';
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileInput = document.getElementById('coachingSquadInput');
      if (fileInput) {
        fileInput.files = files;
        handleCoachingImageSelect({ target: { files: files } });
      }
    }
  }, false);
}

// ══════════ PRICES & SUMMARY UPDATE ══════════
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

function updateAllPricesAndSummary() {
  // Update package cards prices
  ['squad', 'live', 'vip'].forEach(k => {
    const el = document.getElementById(`pricePkg_${k}`);
    if (el) {
      el.textContent = formatPrice(COACHING_PACKAGES[k].priceUSD, COACHING_PACKAGES[k].priceSAR);
    }
  });

  const selectedPkg = COACHING_PACKAGES[activePackageKey];
  const summaryPrice = document.getElementById('summaryPrice');
  const summaryServiceText = document.getElementById('summaryServiceText');

  if (summaryPrice) {
    summaryPrice.textContent = formatPrice(selectedPkg.priceUSD, selectedPkg.priceSAR);
  }
  if (summaryServiceText) {
    summaryServiceText.textContent = selectedPkg.name;
  }
}

// ══════════ SUBMIT COACHING ORDER ══════════
window.handleCoachingSubmit = function(event) {
  event.preventDefault();

  const selectedPkg = COACHING_PACKAGES[activePackageKey];
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const preferredTime = document.getElementById('preferredTime').value;
  const discord = (document.getElementById('discordUser')?.value || '').trim();
  const budgetCoins = (document.getElementById('budgetCoins')?.value || '').trim();
  const untradeables = (document.getElementById('untradeablePlayers')?.value || '').trim();
  const coachingNotes = (document.getElementById('coachingNotes')?.value || '').trim();

  const combinedNotes = [
    `الأسلوب: ${selectedPlaystyle}`,
    budgetCoins ? `الميزانية: ${budgetCoins}` : '',
    untradeables ? `اللاعبين الثابتين: ${untradeables}` : '',
    `الموعد المفضل: ${preferredTime}`,
    discord ? `ديسكورد: ${discord}` : '',
    coachingNotes ? `ملاحظات: ${coachingNotes}` : ''
  ].filter(Boolean).join(' | ');

  const cartItem = {
    id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    addedAt: new Date().toISOString(),
    service: `استشارة وتدريب: ${selectedPkg.name}`,
    type: 'coaching',
    platform: 'All Platforms',
    priceSAR: selectedPkg.priceSAR,
    details: `${selectedPkg.name} - ${preferredTime}`,
    notes: combinedNotes
  };

  try {
    const existing = localStorage.getItem('shopcoin_cart');
    const items = existing ? JSON.parse(existing) : [];
    items.push(cartItem);
    localStorage.setItem('shopcoin_cart', JSON.stringify(items));
    if (window.shopCoinCart) {
      window.shopCoinCart.items = items;
      window.shopCoinCart.updateBadge();
    }
  } catch(e) {
    console.error("Cart save error:", e);
  }

  window.location.href = 'cart.html';
};

// ══════════ PAYMENT METHOD SWITCHER ══════════
window.currentSelectedPaymentMethod = 'whatsapp';
window.selectPaymentMethod = function(method) {
  window.currentSelectedPaymentMethod = 'whatsapp';
  const cardWhatsApp = document.getElementById('payOptionWhatsApp');
  const radioWhatsApp = cardWhatsApp ? cardWhatsApp.querySelector('input') : null;
  const submitBtn = document.getElementById('btnSubmitOrder');

  if (cardWhatsApp) cardWhatsApp.classList.add('active');
  if (radioWhatsApp) radioWhatsApp.checked = true;
  if (submitBtn) {
    submitBtn.innerHTML = '<span>تأكيد الطلب والدفع بالواتساب</span> <i class="fab fa-whatsapp"></i>';
  }
};


function showCoachingReceipt(orderData) {
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
        <h2>تم تأكيد حجز الاستشارة بنجاح!</h2>
        <p>شكراً لثقتك بمتجر ShopCoin — سيتواصل معك المدرب المختص عبر الواتساب فوراً</p>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <span class="label">رقم الحجز:</span>
          <span class="value font-mono">#${orderData.orderId}</span>
        </div>
        <div class="receipt-row">
          <span class="label">الباقة المختارة:</span>
          <span class="value">${orderData.serviceName}</span>
        </div>
        <div class="receipt-row">
          <span class="label">الموعد المفضل:</span>
          <span class="value">${orderData.preferredTime}</span>
        </div>
        <div class="receipt-row">
          <span class="label">رقم التواصل:</span>
          <span class="value font-mono">${orderData.customerPhone}</span>
        </div>
        <div class="receipt-row total">
          <span class="label">المبلغ الإجمالي:</span>
          <span class="value">${orderData.priceFormatted}</span>
        </div>
      </div>
      
      <div class="receipt-footer-msg">
        <i class="fab fa-whatsapp" style="color: #10b981;"></i>
        تم إرسال تفاصيل حجزك لفريق التدريب. يمكنك التواصل المباشر برقم حجزك في أي وقت.
      </div>
      
      <button type="button" class="order-success-btn" onclick="window.location.href='track.html?id=${orderData.orderId}'">
        <span>متابعة حالة الطلب والحجز</span>
        <i class="fas fa-arrow-left"></i>
      </button>
    </div>
  `;

  overlay.classList.add('open');
}
