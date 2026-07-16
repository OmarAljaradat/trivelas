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

let allSbcItems = [];
let currentFilter = 'all';

let dynamicSettings = {};

function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;

        // Redirect if service is disabled
        if (dynamicSettings.enableServiceSBC === false) {
          alert("عذراً، خدمة تحديات التشكيلة متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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
  if (!content || !content.sbcPage) return;
  const cp = content.sbcPage;
  
  const title = document.getElementById('cms_sbcTitle');
  if (title && cp.title) title.textContent = cp.title;

  const desc = document.getElementById('cms_sbcDesc');
  if (desc && cp.desc) desc.textContent = cp.desc;

  const hint = document.getElementById('cms_sbcHint');
  if (hint && cp.hint) hint.textContent = cp.hint;
}

// Initialize catalog on load
document.addEventListener('DOMContentLoaded', () => {
  fetchSettings().then(() => {
    applyCMSPageContent();
    loadSbcCatalog();
  });
});

// Load SBC challenges from database catalog
function loadSbcCatalog() {
  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      allSbcItems = data.filter(p => p.category === 'sbc');
      updateTabBadges();
      renderCatalogGrid();
    })
    .catch(err => {
      console.error("Error loading SBC catalog:", err);
      const grid = document.getElementById('catalogGrid');
      if (grid) grid.innerHTML = `<div class="sbc-empty-state"><i class="fas fa-exclamation-triangle"></i>لا توجد تحديات متوفرة حالياً. يرجى مراجعة الإدارة.</div>`;
    });
}

// Categorization helper
function getSbcSubcategory(item) {
  if (item.sbcSubCategory) {
    return item.sbcSubCategory;
  }
  
  // Fallback for legacy items without sbcSubCategory
  const lowerName = item.name.toLowerCase();
  if (lowerName.includes("ترقية") || lowerName.includes("upgrade") || lowerName.includes("evo") || lowerName.includes("تطوير") || lowerName.includes("ترقيات")) {
    return 'upgrades';
  }
  if (lowerName.includes("فاونديشن") || lowerName.includes("foundation") || lowerName.includes("أساسي") || lowerName.includes("أساسية")) {
    return 'foundation';
  }
  return 'players';
}

function filterCategory(category, btn) {
  currentFilter = category;

  // Update active tab button
  document.querySelectorAll('.obj-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  renderCatalogGrid();
}

function updateTabBadges() {
  const cats = ['all', 'players', 'upgrades', 'foundation'];
  cats.forEach(cat => {
    const badge = document.getElementById(`badge-${cat}`);
    if (!badge) return;
    const count = cat === 'all'
      ? allSbcItems.length
      : allSbcItems.filter(i => getSbcSubcategory(i) === cat).length;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  });
}

function renderCatalogGrid() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  // Filter items
  const filtered = allSbcItems.filter(item => {
    if (currentFilter === 'all') return true;
    return getSbcSubcategory(item) === currentFilter;
  });

  if (filtered.length === 0) {
    grid.style.display = 'grid';
    grid.innerHTML = `<div class="sbc-empty-state"><i class="fas fa-search"></i>لا توجد تحديات في هذا القسم حالياً.</div>`;
    return;
  }

  grid.style.display = 'grid';


  grid.innerHTML = filtered.map(item => {
    // Console Prices
    const priceConsoleSAR = item.priceSAR;
    let finalConsolePrice = priceConsoleSAR;
    if (selectedCurrency !== 'SAR') {
      finalConsolePrice = item.priceUSD * cur.rate;
    }
    const formattedConsole = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(finalConsolePrice) + ' ' + cur.symbol;

    // PC Prices (Use pricePCSAR / pricePCUSD if defined, otherwise fallback to Console + 10 SAR/3 USD)
    const pricePCSAR = item.pricePCSAR || (priceConsoleSAR + 10);
    const pricePCUSD = item.pricePCUSD || (item.priceUSD + 3);
    
    let finalPCPrice = pricePCSAR;
    if (selectedCurrency !== 'SAR') {
      finalPCPrice = pricePCUSD * cur.rate;
    }
    const formattedPC = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(finalPCPrice) + ' ' + cur.symbol;

    return `
      <div class="sbc-card-premium" onclick="navigateToDetail('${item.id}')">
        <span class="sbc-card-rating">${item.rating ? item.rating : '90'}</span>
        <div class="sbc-card-image-wrap">
          <img src="${item.image}" alt="${item.name}"/>
        </div>
        <h4 class="sbc-card-title">${item.name}</h4>
        
        <div class="sbc-card-prices-row">
          <!-- Console (Right side in RTL) -->
          <div class="sbc-price-box console-box">
            <span class="sbc-price-platform-icons">
              <i class="fab fa-xbox"></i>
              <i class="fab fa-playstation"></i>
            </span>
            <span class="sbc-price-val">${formattedConsole}</span>
          </div>

          <!-- PC (Left side in RTL) -->
          <div class="sbc-price-box">
            <span class="sbc-price-platform-icons">
              <span class="pc-text-logo">PC</span>
            </span>
            <span class="sbc-price-val">${formattedPC}</span>
          </div>
        </div>
        
        <button type="button" class="sbc-buy-btn-overlay">اشتري الآن</button>
      </div>
    `;
  }).join('');
}

function navigateToDetail(id) {
  window.location.href = `buy-sbc-detail.html?id=${id}`;
}
