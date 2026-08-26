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
let currentSbcPlatform = 'console';
let currentSbcPage = 1;
const itemsPerPage = 6;

let dynamicSettings = {};

function fetchSettings() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data && data.settings) {
        dynamicSettings = data.settings;

        if (dynamicSettings.enableServiceSBC === false) {
          alert("عذراً، خدمة تحديات التشكيلة متوقفة مؤقتاً. سيتم تحويلك للرئيسية.");
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

    const searchInput = document.getElementById('sbcSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentSbcPage = 1;
        renderCatalogGrid();
      });
    }
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
  currentSbcPage = 1;

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
  });
}

function switchSbcPlatform(platform, btn) {
  currentSbcPlatform = platform;
  document.querySelectorAll('.sbc-platform-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCatalogGrid();
}

function renderCatalogGrid() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrency = currencySelect ? currencySelect.value : 'SAR';
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;

  const searchInput = document.getElementById('sbcSearchInput');
  const searchQuery = searchInput ? searchInput.value.trim() : '';

  // Filter items
  const filtered = allSbcItems.filter(item => {
    const matchesCategory = (currentFilter === 'all') ? true : (getSbcSubcategory(item) === currentFilter);
    if (!matchesCategory) return false;

    if (searchQuery) {
      return matchesSbcItem(item, searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.style.display = 'grid';
    grid.innerHTML = `<div class="sbc-empty-state"><i class="fas fa-search"></i>لا توجد تحديات في هذا القسم حالياً.</div>`;
    renderSbcPagination(0);
    return;
  }

  grid.style.display = 'grid';

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentSbcPage > totalPages) currentSbcPage = 1;

  const startIndex = (currentSbcPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  grid.innerHTML = paginatedItems.map(item => {
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

    // PC Prices
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

    const rating = item.rating ? parseInt(item.rating) : 90;
    const isConsoleActive = currentSbcPlatform === 'console';
    const isPcActive = currentSbcPlatform === 'pc';

    return `
      <div class="sbc-card-premium" onclick="navigateToDetail('${item.id}')">
        <span class="sbc-card-rating">${rating}</span>
        <div class="sbc-card-image-wrap">
          <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='service_sbc.jpg';"/>
        </div>
        <h4 class="sbc-card-title">${item.name}</h4>

        <div class="sbc-card-prices-row">
          <!-- Console -->
          <div class="sbc-price-box console-box" style="${isConsoleActive ? 'background: rgba(37, 99, 235, 0.08); border-radius: 12px; padding: 4px;' : ''}">
            <span class="sbc-price-platform-icons" style="${isConsoleActive ? 'color: #2563eb; font-weight: 800;' : ''}">
              <i class="fab fa-xbox"></i>
              <i class="fab fa-playstation"></i>
            </span>
            <span class="sbc-price-val" style="${isConsoleActive ? 'color: #2563eb; font-size: 1.15rem; font-weight: 800;' : ''}">${formattedConsole}</span>
          </div>

          <!-- PC -->
          <div class="sbc-price-box" style="${isPcActive ? 'background: rgba(37, 99, 235, 0.08); border-radius: 12px; padding: 4px;' : ''}">
            <span class="sbc-price-platform-icons" style="${isPcActive ? 'color: #2563eb; font-weight: 800;' : ''}">
              <span class="pc-text-logo">PC</span>
            </span>
            <span class="sbc-price-val" style="${isPcActive ? 'color: #2563eb; font-size: 1.15rem; font-weight: 800;' : ''}">${formattedPC}</span>
          </div>
        </div>
        
        <button type="button" class="sbc-buy-btn-overlay">اشتري الآن</button>
      </div>
    `;
  }).join('');

  renderSbcPagination(filtered.length);
}

function renderSbcPagination(totalItems) {
  const container = document.getElementById('sbcPaginationContainer');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button type="button" class="sbc-page-btn" ${currentSbcPage === 1 ? 'disabled' : ''} onclick="changeSbcPage(${currentSbcPage - 1})">
      <i class="fas fa-chevron-right"></i> السابق
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button type="button" class="sbc-page-btn ${i === currentSbcPage ? 'active' : ''}" onclick="changeSbcPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button type="button" class="sbc-page-btn" ${currentSbcPage === totalPages ? 'disabled' : ''} onclick="changeSbcPage(${currentSbcPage + 1})">
      التالي <i class="fas fa-chevron-left"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changeSbcPage(page) {
  currentSbcPage = page;
  renderCatalogGrid();
  const grid = document.getElementById('catalogGrid');
  if (grid) {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function navigateToDetail(id) {
  window.location.href = `buy-sbc-detail.html?id=${id}&platform=${currentSbcPlatform}`;
}

function matchesSbcItem(item, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const name = (item.name || '').toLowerCase();
  const version = (item.version || '').toLowerCase();
  return name.includes(q) || version.includes(q);
}

// Global window exports
window.filterCategory = filterCategory;
window.switchSbcPlatform = switchSbcPlatform;
window.changeSbcPage = changeSbcPage;
window.navigateToDetail = navigateToDetail;
