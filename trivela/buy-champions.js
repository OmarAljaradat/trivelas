// Configuration & State for FUT Champions
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

// Current State
let currentPlatform = 'console';
let currentSelectedRank = 'wins_9';
let uploadedSquadFile = null;
let uploadedSquadDataUrl = null;

// FUT Champions Ranks Configuration
const FUT_RANKS = {
  wins_9: {
    name: "فوت تشامبيونز — 9 انتصارات",
    wins: "9 انتصارات",
    tokens: "120× توكنز حمراء (Red Tokens) 🔴",
    coins: "25,000 كوينز نقدي 🪙",
    estimatedDelivery: "2 - 6 ساعات"
  },
  wins_11: {
    name: "فوت تشامبيونز — 11 انتصار",
    wins: "11 انتصار",
    tokens: "180× توكنز حمراء (Red Tokens) 🔴",
    coins: "40,000 كوينز نقدي 🪙",
    estimatedDelivery: "3 - 8 ساعات"
  },
  wins_14: {
    name: "فوت تشامبيونز — 14 انتصار",
    wins: "14 انتصار",
    tokens: "280× توكنز حمراء (Red Tokens) 🔴",
    coins: "75,000 كوينز نقدي 🪙",
    estimatedDelivery: "4 - 12 ساعة"
  },
  wins_16: {
    name: "فوت تشامبيونز — 16 انتصار",
    wins: "16 انتصار",
    tokens: "400× توكنز حمراء (Red Tokens) 🔴",
    coins: "100,000 كوينز نقدي 🪙",
    estimatedDelivery: "6 - 16 ساعة"
  },
  wins_19: {
    name: "فوت تشامبيونز — 19 انتصار",
    wins: "19 انتصار",
    tokens: "550× توكنز حمراء (Red Tokens) 🔴",
    coins: "150,000 كوينز نقدي 🪙",
    estimatedDelivery: "8 - 24 ساعة"
  }
};

// Fetch dynamic settings from server
function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data && data.settings) {
        dynamicSettings = Object.assign(dynamicSettings, data.settings);

        if (dynamicSettings.enableServiceChampions === false) {
          alert("عذراً، خدمة فوت تشامبيونز متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
          window.location.href = "/";
          return;
        }
      }
      if (data && data.champions_ranks) {
        Object.assign(FUT_RANKS, data.champions_ranks);
      }
    })
    .catch(err => {
      console.warn("Could not fetch settings dynamically:", err);
    })
    .finally(() => {
      selectFutRank(currentSelectedRank, 0);
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

// Select Platform (PlayStation vs Xbox vs PC)
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

  updateSummary();
}
window.selectPlatform = selectPlatform;

// Select FUT Rank via Slider Timeline
window.selectFutRank = function(rankId, progressPercentage) {
  currentSelectedRank = rankId;

  const hiddenInput = document.getElementById('selectedRankInput');
  const rank = FUT_RANKS[rankId];
  if (hiddenInput && rank) {
    hiddenInput.value = rank.name;
  }

  const nodes = document.querySelectorAll('.futs-step-node');
  nodes.forEach(node => {
    const nodeRankId = node.id.replace('node_', '');
    node.classList.toggle('active', nodeRankId === rankId);
  });

  const progressBar = document.getElementById('futsProgressBar');
  if (progressBar) {
    progressBar.style.width = progressPercentage + '%';
  }

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
      const tokensVal = rank.tokens || 'توكنز حمراء (Red Tokens) 🔴';
      const coinsVal = rank.coins || 'كوينز نقدي 🪙';

      lstRankRewards.innerHTML = `
        <div style="background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border: 1.5px solid #fecdd3; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.05); text-align: right;">
          <div style="width: 48px; height: 48px; background: #e11d48; color: #ffffff; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; box-shadow: 0 6px 14px rgba(225, 29, 72, 0.3);">
            <i class="fas fa-coins"></i>
          </div>
          <div>
            <strong style="font-size: 1.05rem; color: #881337; display: block; font-weight: 800; font-family: 'Montserrat', 'Cairo', sans-serif;">${tokensVal}</strong>
            <span style="font-size: 0.8rem; color: #9f1239; font-weight: 600; display: block; margin-top: 2px;">تستبدل مباشرة لجوائز وأيقونات مضمونة</span>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 1.5px solid #fef08a; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 12px rgba(202, 138, 4, 0.05); text-align: right;">
          <div style="width: 48px; height: 48px; background: #ca8a04; color: #ffffff; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; box-shadow: 0 6px 14px rgba(202, 138, 4, 0.3);">
            <i class="fas fa-coins"></i>
          </div>
          <div>
            <strong style="font-size: 1.05rem; color: #713f12; display: block; font-weight: 800; font-family: 'Montserrat', 'Cairo', sans-serif;">${coinsVal}</strong>
            <span style="font-size: 0.8rem; color: #854d0e; font-weight: 600; display: block; margin-top: 2px;">تُضاف مباشرة لرصيد الكوينز داخل حسابك</span>
          </div>
        </div>
      `;
    }
  }

  updateSummary();
};

// Update Bottom Summary Bar
function updateSummary() {
  const summaryServiceText = document.getElementById('summaryServiceText');
  let platformName = 'بلايستيشن';
  if (currentPlatform === 'xbox') platformName = 'إكس بوكس';
  else if (currentPlatform === 'pc') platformName = 'PC';
  
  const rank = FUT_RANKS[currentSelectedRank];
  const rankName = (rank && rank.name) ? rank.name : `فوت تشامبيونز — ${currentSelectedRank.replace('wins_', '')} انتصارات`;
  
  if (summaryServiceText) {
    summaryServiceText.textContent = `${rankName} (${platformName})`;
  }
}

// ══════════ SQUAD SCREENSHOT UPLOAD HANDLERS ══════════
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

// Setup Drag & Drop for the upload zone
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

// ══════════ SEND TO WHATSAPP ACTION ══════════
window.sendChampionsWhatsApp = function() {
  if (!uploadedSquadFile && !uploadedSquadDataUrl) {
    alert("⚠️ يرجى إرفاق سكرين شوت لتشكيلتك أولاً ليتم تقييمها وتحديد السعر والاتفاق معك.");
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

  const rank = FUT_RANKS[currentSelectedRank];
  const rankName = rank ? rank.name : "فوت تشامبيونز";
  let platformName = 'بلايستيشن (PlayStation)';
  if (currentPlatform === 'xbox') platformName = 'إكس بوكس (Xbox)';
  else if (currentPlatform === 'pc') platformName = 'الكمبيوتر (PC)';
  const phone = dynamicSettings.whatsappPhone || '962775585112';

  const messageText = 
`🏆 *طلب تقييم فوت تشامبيونز — ShopCoin*

🕹️ *المنصة:* ${platformName}
🎯 *الرانك المطلوب:* ${rankName}
📸 *سكرين شوت التشكيلة:* مرفقة بالأسفل للتقييم

السلام عليكم، أرغب في تقييم تشكيلتي وتحديد السعر والرانك الأنسب للبدء باللعب معكم.`;

  const encodedMsg = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

  // Open WhatsApp
  window.open(waUrl, '_blank');
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  fetchSettings().then(() => {
    applyCMSPageContent();
    
    // Parse URL parameter
    const params = new URLSearchParams(window.location.search);
    const platParam = params.get('platform');
    if (platParam && platParam.toLowerCase() === 'pc') {
      selectPlatform('PC');
    } else if (platParam && platParam.toLowerCase() === 'xbox') {
      selectPlatform('Xbox');
    } else {
      selectPlatform('PlayStation');
    }

    // Default rank
    if (window.selectFutRank) {
      window.selectFutRank('wins_9', 0);
    }

    setupDragAndDrop();
  });
});
