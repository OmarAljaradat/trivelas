import { adminService } from './adminService.js';
import '../../core/theme.js';

// Global error logger for remote debugging
window.addEventListener('error', function(e) {
  console.error("Browser global error captured:", e.error || e.message);
  alert('خطأ برمجي في المتصفح:\n' + e.message + '\nالسطر: ' + e.lineno);
});
window.addEventListener('unhandledrejection', function(e) {
  console.error("Unhandled promise rejection captured:", e.reason);
  alert('خطأ غير معالج في المتصفح (Rejection):\n' + (e.reason ? (e.reason.message || e.reason) : 'Unknown error'));
});

// Global Temp State
let currentScrapedPlayer = null;
let activeScraperTab = 'sbc-player';
let allUsers = [];
let adminActiveOrders = [];
let lastOrdersCount = null;
let adminExpenses = [];
let currentOrderFilter = 'all';
let statsDaysRange = 30;
let globalChampionsRanks = {};
let globalRivalsRanks = {};

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: Started loading...');
  // Guard already displayed 🔒 block? do nothing further
  if (window.__adminGuardBlocked) return;
  // Check auth credentials
  const token = localStorage.getItem('trivela_token');
  if (!token) {
    console.log('DOMContentLoaded: No token found, redirecting...');
    window.location.href = '/login.html?redirect=/admin.html';
    return;
  }

  console.log('DOMContentLoaded: Token found, loading stats...');
  loadQuickStats();
  console.log('DOMContentLoaded: Loading settings...');
  loadStoreSettings();
  console.log('DOMContentLoaded: Loading orders...');
  loadOrdersList();
  console.log('DOMContentLoaded: Loading logs...');
  loadAdminLogs();
  console.log('DOMContentLoaded: Loading FAQs...');
  loadFAQs();
  console.log('DOMContentLoaded: Loading reviews...');
  loadReviews();
  console.log('DOMContentLoaded: Loading active players...');
  loadActivePlayers();
  console.log('DOMContentLoaded: Loading users...');
  loadAllUsers();
  console.log('DOMContentLoaded: Loading ranks...');
  loadRanksConfiguration();
  console.log('DOMContentLoaded: Loading expenses...');
  loadExpensesList();
  console.log('DOMContentLoaded: Loading coupons...');
  loadCouponsList();
  console.log('DOMContentLoaded: Loading features...');
  loadFeatures();
  console.log('DOMContentLoaded: Starting polling...');
  startOrdersAlertPolling();
  console.log('DOMContentLoaded: Finished initial load.');

  // Bind forms
  const storeForm = document.getElementById('settingsForm');
  if (storeForm) storeForm.addEventListener('submit', saveStoreSettings);

  const saveAdBtn = document.getElementById('saveMarketingAdBtn');
  if (saveAdBtn) {
    saveAdBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (typeof window.saveInSiteMarketingSettings === 'function') {
        await window.saveInSiteMarketingSettings();
      }
    });
  }

  const faqForm = document.getElementById('faqForm');
  if (faqForm) faqForm.addEventListener('submit', saveFAQ);

  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) reviewForm.addEventListener('submit', saveReview);

  const bundleForm = document.getElementById('bundleForm');
  if (bundleForm) {
    bundleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBundleToStore();
    });
  }

  const expForm = document.getElementById('addExpenseForm');
  if (expForm) {
    expForm.addEventListener('submit', handleAddExpenseSubmit);
  }

  const editOrderForm = document.getElementById('editOrderDetailsForm');
  if (editOrderForm) {
    editOrderForm.addEventListener('submit', handleEditOrderDetailsSubmit);
  }

  // Search filter keyup
  const userSearch = document.getElementById('userSearchInput');
  if (userSearch) {
    userSearch.addEventListener('keyup', filterUsers);
  }

  // Restore last active panel if any
  const savedPanel = localStorage.getItem('adminActivePanel');
  const panelToMainTab = {
    'profit-dashboard-panel': 'stats-reports',
    'weekly-report-panel': 'stats-reports',
    'visitors-analytics-panel': 'stats-reports',
    'orders-analytics-panel': 'stats-reports',
    'stat-overview': 'stats-reports',
    'orders-panel': 'store-products',
    'coins-settings-panel': 'store-products',
    'challenges-panel': 'store-products',
    'rivals-champions-settings-panel': 'store-products',
    'coaching-settings-panel': 'store-products',
    'coupons-panel': 'store-products',
    'users-panel': 'customers-marketing',
    'reviews-panel': 'content-design',
    'faqs-panel': 'content-design',
    'landing-content-panel': 'content-design',
    'coins-content-panel': 'content-design',
    'services-content-panel': 'content-design',
    'coaching-packages-panel': 'content-design',
    'features-panel': 'content-design',
    'users-crm-panel': 'customers-marketing',
    'marketing-hub-panel': 'customers-marketing',
    'email-marketing-panel': 'customers-marketing',
    'settings-panel': 'system',
    'logs-panel': 'system'
  };

  if (savedPanel && panelToMainTab[savedPanel]) {
    const mainTab = panelToMainTab[savedPanel];
    switchMainTab(mainTab);
    
    const subBtn = document.querySelector(`.sub-tab-btn[onclick*="${savedPanel}"]`);
    if (subBtn) {
      const parent = subBtn.parentElement;
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      subBtn.classList.add('active');
      
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(savedPanel);
      if (panel) panel.classList.add('active');
    }
  }
});

// Panel Switching
export function switchTab(panelId) {
  // Buttons
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = document.querySelector(`.nav-btn[onclick*="${panelId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Panels
  const panels = document.querySelectorAll('.admin-panel');
  panels.forEach(panel => panel.classList.remove('active'));

  const activePanel = document.getElementById(panelId);
  if (activePanel) activePanel.classList.add('active');

  // Trigger loads based on active panel
  if (panelId === 'dashboard') {
    loadQuickStats();
  } else if (panelId === 'orders') {
    loadOrdersList();
  } else if (panelId === 'players') {
    loadActivePlayers();
  } else if (panelId === 'users' || panelId === 'users-crm-panel') {
    loadAllUsers();
  } else if (panelId === 'email-marketing-panel') {
    loadEmailCampaigns();
  } else if (panelId === 'faqs') {
    loadFAQs();
  } else if (panelId === 'reviews') {
    loadReviews();
  } else if (panelId === 'logs') {
    loadAdminLogs();
  }
}

// 1. Dashboard Stats
async function loadQuickStats() {
  try {
    const stats = await adminService.getQuickStats(statsDaysRange);
    
    const statTotalUsers = document.getElementById('statTotalUsers');
    if (statTotalUsers) statTotalUsers.textContent = (stats.totalUsers || 0).toLocaleString();

    const statTotalVisits = document.getElementById('statTotalVisits');
    if (statTotalVisits) statTotalVisits.textContent = (stats.totalVisits || 0).toLocaleString();

    const statVisitsToday = document.getElementById('statVisitsToday');
    if (statVisitsToday) statVisitsToday.textContent = (stats.visitsToday || 0).toLocaleString();

    const statTotalSales = document.getElementById('statTotalSales');
    if (statTotalSales) statTotalSales.textContent = `$${(stats.totalSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const statTotalProfit = document.getElementById('statTotalProfit');
    if (statTotalProfit) statTotalProfit.textContent = `$${(stats.totalProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const statPendingOrders = document.getElementById('statPendingOrders');
    if (statPendingOrders) statPendingOrders.textContent = (stats.pendingOrdersCount || 0).toLocaleString();

    const statTotalChallenges = document.getElementById('statTotalChallenges');
    if (statTotalChallenges) statTotalChallenges.textContent = (stats.totalChallenges || 0).toLocaleString();

    const statAdminOperationsCount = document.getElementById('statAdminOperationsCount');
    if (statAdminOperationsCount) {
      try {
        const logs = await adminService.getAdminLogs();
        statAdminOperationsCount.textContent = (logs.length || 0).toLocaleString();
      } catch (e) {
        statAdminOperationsCount.textContent = "0";
      }
    }

    if (stats.analytics && typeof window.initVisitorsAnalytics === 'function') {
      window.initVisitorsAnalytics(stats.analytics);
    }
  } catch (err) {
    showStatus("خطأ في تحميل إحصائيات لوحة التحكم.", "error");
  }
}

// 2. Settings & Maintenance Mode
async function loadStoreSettings() {
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings) return;

    const inputWhatsapp = document.getElementById('settingWhatsapp');
    if (inputWhatsapp) inputWhatsapp.value = settings.whatsappPhone || "";

    const inputInstagram = document.getElementById('settingInstagram');
    if (inputInstagram) inputInstagram.value = settings.instagramUrl || "";

    const inputRateConsole = document.getElementById('settingRateConsole');
    if (inputRateConsole) inputRateConsole.value = settings.baseRateConsole || 2.80;

    const inputRatePC = document.getElementById('settingRatePC');
    if (inputRatePC) inputRatePC.value = settings.baseRatePC || 2.40;

    const inputPoints = document.getElementById('settingPointsDiscount');
    if (inputPoints) inputPoints.value = settings.pointsDiscountRate || 37.5;

    // Purchase Limits
    const inputMinCoins = document.getElementById('settingMinCoins');
    if (inputMinCoins) inputMinCoins.value = settings.minCoinsPurchase || 100000;
    const inputMaxCoins = document.getElementById('settingMaxCoins');
    if (inputMaxCoins) inputMaxCoins.value = settings.maxCoinsPurchase || 10000000;

    // Service Toggles
    const toggleCoins = document.getElementById('toggleServiceCoins');
    if (toggleCoins) toggleCoins.checked = settings.enableServiceCoins !== false;
    const toggleSBC = document.getElementById('toggleServiceSBC');
    if (toggleSBC) toggleSBC.checked = settings.enableServiceSBC !== false;
    const toggleRivals = document.getElementById('toggleServiceRivals');
    if (toggleRivals) toggleRivals.checked = settings.enableServiceRivals !== false;
    const toggleChampions = document.getElementById('toggleServiceChampions');
    if (toggleChampions) toggleChampions.checked = settings.enableServiceChampions !== false;
    const toggleObjectives = document.getElementById('toggleServiceObjectives');
    if (toggleObjectives) toggleObjectives.checked = settings.enableServiceObjectives !== false;
    const togglePackages = document.getElementById('toggleServicePackages');
    if (togglePackages) togglePackages.checked = settings.enableServicePackages !== false;
    const toggleCoaching = document.getElementById('toggleServiceCoaching');
    if (toggleCoaching) toggleCoaching.checked = settings.enableServiceCoaching !== false;

    // Exchange Rates
    const rates = settings.customExchangeRates || {};
    const inputAED = document.getElementById('rateAED');
    if (inputAED) inputAED.value = rates.AED || 3.67;
    const inputKWD = document.getElementById('rateKWD');
    if (inputKWD) inputKWD.value = rates.KWD || 0.307;
    const inputBHD = document.getElementById('rateBHD');
    if (inputBHD) inputBHD.value = rates.BHD || 0.376;
    const inputQAR = document.getElementById('rateQAR');
    if (inputQAR) inputQAR.value = rates.QAR || 3.64;
    const inputOMR = document.getElementById('rateOMR');
    if (inputOMR) inputOMR.value = rates.OMR || 0.385;
    const inputJOD = document.getElementById('rateJOD');
    if (inputJOD) inputJOD.value = rates.JOD || 0.709;
    const inputEGP = document.getElementById('rateEGP');
    if (inputEGP) inputEGP.value = rates.EGP || 49.5;
    const inputSAR = document.getElementById('rateSAR');
    if (inputSAR) inputSAR.value = rates.SAR || 3.75;
    
    // Coins Panel inputs
    const inputCoinsConsole = document.getElementById('coinsRateConsole');
    if (inputCoinsConsole) inputCoinsConsole.value = settings.baseRateConsole || 2.80;

    const inputCoinsPC = document.getElementById('coinsRatePC');
    if (inputCoinsPC) inputCoinsPC.value = settings.baseRatePC || 2.40;

    const toggle = document.getElementById('settingMaintenance');
    if (toggle) toggle.checked = !!settings.maintenanceMode;

    const mTitle = document.getElementById('settingMaintenanceTitle');
    if (mTitle) mTitle.value = settings.maintenanceTitleText || "أعمال صيانة مؤقتة";

    const mCdActive = document.getElementById('settingMaintenanceCountdownActive');
    if (mCdActive) mCdActive.checked = !!settings.maintenanceCountdownActive;

    const mCdEnd = document.getElementById('settingMaintenanceCountdownEndTime');
    if (mCdEnd) mCdEnd.value = settings.maintenanceCountdownEndTime || "";

    const mIcon = document.getElementById('settingMaintenanceIconStyle');
    if (mIcon) mIcon.value = settings.maintenanceIconStyle || "wrench";

    const mGlow = document.getElementById('settingMaintenanceGlowColor');
    if (mGlow) mGlow.value = settings.maintenanceGlowColor || "#eab308";

    const mTgActive = document.getElementById('settingMaintenanceTelegramActive');
    if (mTgActive) mTgActive.checked = !!settings.maintenanceTelegramActive;

    const mTgUrl = document.getElementById('settingTelegramUrl');
    if (mTgUrl) mTgUrl.value = settings.settingTelegram || "https://t.me/Trivela";

    const mBypass = document.getElementById('settingBypassToken');
    if (mBypass) mBypass.value = settings.maintenanceBypassToken || "";

    const mMsg = document.getElementById('settingMaintenanceMessage');
    if (mMsg) mMsg.value = settings.maintenanceMessage || "";

    // Note: In-Site marketing settings are populated dynamically via inline HTML script to avoid timing issues.

    // Update dashboard system status indicators
    const dashConsole = document.getElementById('dashboardConsoleRate');
    if (dashConsole) dashConsole.textContent = `$${(settings.baseRateConsole || 2.80).toFixed(2)} / 100K`;

    const dashPc = document.getElementById('dashboardPcRate');
    if (dashPc) dashPc.textContent = `$${(settings.baseRatePC || 2.40).toFixed(2)} / 100K`;
    if (typeof window.renderPricingTiers === 'function') {
      window.renderPricingTiers(settings.discounts || []);
    }

    if (settings.content) {
      const l = settings.content.landing || {};
      const c_heroTitle = document.getElementById('c_heroTitle');
      if (c_heroTitle) c_heroTitle.value = l.heroTitle || "";
      const c_heroSubTitle = document.getElementById('c_heroSubTitle');
      if (c_heroSubTitle) c_heroSubTitle.value = l.heroSubTitle || "";
      const c_statOrdersCount = document.getElementById('c_statOrdersCount');
      if (c_statOrdersCount) c_statOrdersCount.value = l.statOrdersCount || "";
      const c_statOrdersLabel = document.getElementById('c_statOrdersLabel');
      if (c_statOrdersLabel) c_statOrdersLabel.value = l.statOrdersLabel || "";
      const c_statDeliveryTime = document.getElementById('c_statDeliveryTime');
      if (c_statDeliveryTime) c_statDeliveryTime.value = l.statDeliveryTime || "";
      const c_statDeliveryLabel = document.getElementById('c_statDeliveryLabel');
      if (c_statDeliveryLabel) c_statDeliveryLabel.value = l.statDeliveryLabel || "";
      const c_statSecurityLabel = document.getElementById('c_statSecurityLabel');
      if (c_statSecurityLabel) c_statSecurityLabel.value = l.statSecurityLabel || "";
      const c_guaranteeTitle = document.getElementById('c_guaranteeTitle');
      if (c_guaranteeTitle) c_guaranteeTitle.value = l.guaranteeTitle || "";
      const c_guaranteeSubTitle = document.getElementById('c_guaranteeSubTitle');
      if (c_guaranteeSubTitle) c_guaranteeSubTitle.value = l.guaranteeSubTitle || "";

      // Load values into the Coaching sub-tab section form as well
      const c_coachingSectionBadge = document.getElementById('c_coachingSectionBadge');
      if (c_coachingSectionBadge) c_coachingSectionBadge.value = l.guaranteeBadge || "";
      const c_coachingSectionTitle = document.getElementById('c_coachingSectionTitle');
      if (c_coachingSectionTitle) c_coachingSectionTitle.value = l.guaranteeTitle || "";
      const c_coachingSectionSubTitle = document.getElementById('c_coachingSectionSubTitle');
      if (c_coachingSectionSubTitle) c_coachingSectionSubTitle.value = l.guaranteeSubTitle || "";

      // Landing page extended fields
      const c_platformTitle = document.getElementById('c_platformTitle');
      if (c_platformTitle) c_platformTitle.value = l.platformTitle || "";
      const c_platformSubTitle = document.getElementById('c_platformSubTitle');
      if (c_platformSubTitle) c_platformSubTitle.value = l.platformSubTitle || "";
      const c_catalogTitle = document.getElementById('c_catalogTitle');
      if (c_catalogTitle) c_catalogTitle.value = l.catalogTitle || "";
      const c_featuresTitle = document.getElementById('c_featuresTitle');
      if (c_featuresTitle) c_featuresTitle.value = l.featuresTitle || "";
      const c_featuresSubTitle = document.getElementById('c_featuresSubTitle');
      if (c_featuresSubTitle) c_featuresSubTitle.value = l.featuresSubTitle || "";
      const c_howSectionTitle = document.getElementById('c_howSectionTitle');
      if (c_howSectionTitle) c_howSectionTitle.value = l.howSectionTitle || "";
      const c_howSectionSubTitle = document.getElementById('c_howSectionSubTitle');
      if (c_howSectionSubTitle) c_howSectionSubTitle.value = l.howSectionSubTitle || "";
      const c_landingStep1Title = document.getElementById('c_landingStep1Title');
      if (c_landingStep1Title) c_landingStep1Title.value = l.landingStep1Title || "";
      const c_landingStep1Desc = document.getElementById('c_landingStep1Desc');
      if (c_landingStep1Desc) c_landingStep1Desc.value = l.landingStep1Desc || "";
      const c_landingStep2Title = document.getElementById('c_landingStep2Title');
      if (c_landingStep2Title) c_landingStep2Title.value = l.landingStep2Title || "";
      const c_landingStep2Desc = document.getElementById('c_landingStep2Desc');
      if (c_landingStep2Desc) c_landingStep2Desc.value = l.landingStep2Desc || "";
      const c_landingStep3Title = document.getElementById('c_landingStep3Title');
      if (c_landingStep3Title) c_landingStep3Title.value = l.landingStep3Title || "";
      const c_landingStep3Desc = document.getElementById('c_landingStep3Desc');
      if (c_landingStep3Desc) c_landingStep3Desc.value = l.landingStep3Desc || "";
      const c_landingStepsBottomNote = document.getElementById('c_landingStepsBottomNote');
      if (c_landingStepsBottomNote) c_landingStepsBottomNote.value = l.landingStepsBottomNote || "";

      // Service pages fields
      const ch = settings.content.championsPage || {};
      const c_championsTitle = document.getElementById('c_championsTitle');
      if (c_championsTitle) c_championsTitle.value = ch.title || "";
      const c_championsDesc = document.getElementById('c_championsDesc');
      if (c_championsDesc) c_championsDesc.value = ch.desc || "";
      const c_championsHint = document.getElementById('c_championsHint');
      if (c_championsHint) c_championsHint.value = ch.hint || "";

      const ri = settings.content.rivalsPage || {};
      const c_rivalsTitle = document.getElementById('c_rivalsTitle');
      if (c_rivalsTitle) c_rivalsTitle.value = ri.title || "";
      const c_rivalsDesc = document.getElementById('c_rivalsDesc');
      if (c_rivalsDesc) c_rivalsDesc.value = ri.desc || "";
      const c_rivalsHint = document.getElementById('c_rivalsHint');
      if (c_rivalsHint) c_rivalsHint.value = ri.hint || "";

      const ob = settings.content.objectivesPage || {};
      const c_objectivesTitle = document.getElementById('c_objectivesTitle');
      if (c_objectivesTitle) c_objectivesTitle.value = ob.title || "";
      const c_objectivesDesc = document.getElementById('c_objectivesDesc');
      if (c_objectivesDesc) c_objectivesDesc.value = ob.desc || "";
      const c_objectivesHint = document.getElementById('c_objectivesHint');
      if (c_objectivesHint) c_objectivesHint.value = ob.hint || "";

      const sb = settings.content.sbcPage || {};
      const c_sbcTitle = document.getElementById('c_sbcTitle');
      if (c_sbcTitle) c_sbcTitle.value = sb.title || "";
      const c_sbcDesc = document.getElementById('c_sbcDesc');
      if (c_sbcDesc) c_sbcDesc.value = sb.desc || "";
      const c_sbcHint = document.getElementById('c_sbcHint');
      if (c_sbcHint) c_sbcHint.value = sb.hint || "";

      const co = settings.content.coachingPage || {};
      const c_coachingPageTitle = document.getElementById('c_coachingPageTitle');
      if (c_coachingPageTitle) c_coachingPageTitle.value = co.title || "";
      const c_coachingPageDesc = document.getElementById('c_coachingPageDesc');
      if (c_coachingPageDesc) c_coachingPageDesc.value = co.desc || "";
      const c_coachingPageHint = document.getElementById('c_coachingPageHint');
      if (c_coachingPageHint) c_coachingPageHint.value = co.hint || "";

      const pa = settings.content.packagesPage || {};
      const c_packagesTitle = document.getElementById('c_packagesTitle');
      if (c_packagesTitle) c_packagesTitle.value = pa.title || "";
      const c_packagesDesc = document.getElementById('c_packagesDesc');
      if (c_packagesDesc) c_packagesDesc.value = pa.desc || "";
      const c_packagesHint = document.getElementById('c_packagesHint');
      if (c_packagesHint) c_packagesHint.value = pa.hint || "";

      const cp = settings.content.coinsPage || {};
      const c_coinsTitle = document.getElementById('c_coinsTitle');
      if (c_coinsTitle) c_coinsTitle.value = cp.title || "";
      const c_coinsDesc = document.getElementById('c_coinsDesc');
      if (c_coinsDesc) c_coinsDesc.value = cp.desc || "";
      const c_coinsStep1Title = document.getElementById('c_coinsStep1Title');
      if (c_coinsStep1Title) c_coinsStep1Title.value = cp.step1Title || "";
      const c_coinsStep1Desc = document.getElementById('c_coinsStep1Desc');
      if (c_coinsStep1Desc) c_coinsStep1Desc.value = cp.step1Desc || "";
      const c_coinsStep2Title = document.getElementById('c_coinsStep2Title');
      if (c_coinsStep2Title) c_coinsStep2Title.value = cp.step2Title || "";
      const c_coinsStep2Desc = document.getElementById('c_coinsStep2Desc');
      if (c_coinsStep2Desc) c_coinsStep2Desc.value = cp.step2Desc || "";
      const c_coinsStep3Title = document.getElementById('c_coinsStep3Title');
      if (c_coinsStep3Title) c_coinsStep3Title.value = cp.step3Title || "";
      const c_coinsStep3Desc = document.getElementById('c_coinsStep3Desc');
      if (c_coinsStep3Desc) c_coinsStep3Desc.value = cp.step3Desc || "";

      if (typeof window.renderCoachingPackages === 'function') {
        window.renderCoachingPackages(settings.content.coaching || []);
      }
    }
  } catch (err) {
    showStatus("خطأ في تحميل إعدادات المتجر.", "error");
  }
}

async function saveStoreSettings(event) {
  event.preventDefault();
  
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings) return;

    settings.whatsappPhone = document.getElementById('settingWhatsapp').value.trim();
    settings.instagramUrl = document.getElementById('settingInstagram').value.trim();
    const rateConsoleEl = document.getElementById('settingRateConsole');
    if (rateConsoleEl) {
      settings.baseRateConsole = parseFloat(rateConsoleEl.value);
    }
    const ratePcEl = document.getElementById('settingRatePC');
    if (ratePcEl) {
      settings.baseRatePC = parseFloat(ratePcEl.value);
    }
    settings.pointsDiscountRate = parseFloat(document.getElementById('settingPointsDiscount')?.value || 37.5);
    settings.maintenanceMode = document.getElementById('settingMaintenance').checked;

    // Read Purchase Limits
    const inputMinCoins = document.getElementById('settingMinCoins');
    if (inputMinCoins) settings.minCoinsPurchase = parseInt(inputMinCoins.value) || 100000;
    const inputMaxCoins = document.getElementById('settingMaxCoins');
    if (inputMaxCoins) settings.maxCoinsPurchase = parseInt(inputMaxCoins.value) || 10000000;

    // Read Service Toggles
    const toggleCoins = document.getElementById('toggleServiceCoins');
    if (toggleCoins) settings.enableServiceCoins = toggleCoins.checked;
    const toggleSBC = document.getElementById('toggleServiceSBC');
    if (toggleSBC) settings.enableServiceSBC = toggleSBC.checked;
    const toggleRivals = document.getElementById('toggleServiceRivals');
    if (toggleRivals) settings.enableServiceRivals = toggleRivals.checked;
    const toggleChampions = document.getElementById('toggleServiceChampions');
    if (toggleChampions) settings.enableServiceChampions = toggleChampions.checked;
    const toggleObjectives = document.getElementById('toggleServiceObjectives');
    if (toggleObjectives) settings.enableServiceObjectives = toggleObjectives.checked;
    const togglePackages = document.getElementById('toggleServicePackages');
    if (togglePackages) settings.enableServicePackages = togglePackages.checked;
    const toggleCoaching = document.getElementById('toggleServiceCoaching');
    if (toggleCoaching) settings.enableServiceCoaching = toggleCoaching.checked;

    // Read Exchange Rates
    settings.customExchangeRates = {
      AED: parseFloat(document.getElementById('rateAED')?.value || 3.67),
      KWD: parseFloat(document.getElementById('rateKWD')?.value || 0.307),
      BHD: parseFloat(document.getElementById('rateBHD')?.value || 0.376),
      QAR: parseFloat(document.getElementById('rateQAR')?.value || 3.64),
      OMR: parseFloat(document.getElementById('rateOMR')?.value || 0.385),
      JOD: parseFloat(document.getElementById('rateJOD')?.value || 0.709),
      EGP: parseFloat(document.getElementById('rateEGP')?.value || 49.5),
      SAR: parseFloat(document.getElementById('rateSAR')?.value || 3.75)
    };

    const mTitle = document.getElementById('settingMaintenanceTitle');
    if (mTitle) settings.maintenanceTitleText = mTitle.value.trim();

    const mCdActive = document.getElementById('settingMaintenanceCountdownActive');
    if (mCdActive) settings.maintenanceCountdownActive = mCdActive.checked;

    const mCdEnd = document.getElementById('settingMaintenanceCountdownEndTime');
    if (mCdEnd) settings.maintenanceCountdownEndTime = mCdEnd.value;

    const mIcon = document.getElementById('settingMaintenanceIconStyle');
    if (mIcon) settings.maintenanceIconStyle = mIcon.value;

    const mGlow = document.getElementById('settingMaintenanceGlowColor');
    if (mGlow) settings.maintenanceGlowColor = mGlow.value;

    const mTgActive = document.getElementById('settingMaintenanceTelegramActive');
    if (mTgActive) settings.maintenanceTelegramActive = mTgActive.checked;

    const mTgUrl = document.getElementById('settingTelegramUrl');
    if (mTgUrl) settings.settingTelegram = mTgUrl.value.trim();

    const mBypass = document.getElementById('settingBypassToken');
    if (mBypass) settings.maintenanceBypassToken = mBypass.value.trim();

    const mMsg = document.getElementById('settingMaintenanceMessage');
    if (mMsg) settings.maintenanceMessage = mMsg.value.trim();

    await adminService.saveStoreSettings(settings);
    showStatus("تم حفظ الإعدادات بنجاح!", "success");
    loadQuickStats();
    // Refresh dashboard rate labels
    const dashConsole = document.getElementById('dashboardConsoleRate');
    if (dashConsole) dashConsole.textContent = `$${settings.baseRateConsole.toFixed(2)} / 100K`;
    const dashPc = document.getElementById('dashboardPcRate');
    if (dashPc) dashPc.textContent = `$${settings.baseRatePC.toFixed(2)} / 100K`;
  } catch (err) {
    showStatus("فشل حفظ الإعدادات: " + err.message, "error");
  }
}
window.saveStoreSettings = saveStoreSettings;

window.saveInSiteMarketingSettings = async function() {
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings) return;

    settings.marketing = {
      bannerActive: document.getElementById('adBannerActive').checked,
      bannerText: document.getElementById('adBannerText').value.trim(),
      bannerStyle: document.getElementById('adBannerStyle').value,
      wheelActive: document.getElementById('adWheelActive').checked,
      socialProofActive: document.getElementById('adSocialProofActive').checked,
      
      countdownActive: document.getElementById('adCountdownActive').checked,
      countdownText: document.getElementById('adCountdownText').value.trim(),
      countdownEndTime: document.getElementById('adCountdownEndTime').value,

      popupActive: document.getElementById('adPopupActive').checked,
      popupTitle: document.getElementById('adPopupTitle').value.trim(),
      popupDesc: document.getElementById('adPopupDesc').value.trim(),
      popupBtnText: document.getElementById('adPopupBtnText').value.trim(),
      popupBtnLink: document.getElementById('adPopupBtnLink').value.trim()
    };

    await adminService.saveStoreSettings(settings);
    showStatus("✅ تم حفظ وتطبيق الإعدادات الإعلانية بنجاح على المتجر!", "success");
  } catch (err) {
    showStatus("❌ فشل حفظ الإعدادات الإعلانية: " + err.message, "error");
  }
};

export async function toggleMaintenanceModeDirectly() {
  const toggle = document.getElementById('settingMaintenance');
  if (!toggle) return;

  try {
    const settings = await adminService.getStoreSettings();
    settings.maintenanceMode = toggle.checked;
    await adminService.saveStoreSettings(settings);
    showStatus(toggle.checked ? "تم تفعيل وضع الصيانة!" : "تم إلغاء وضع الصيانة!", "success");
  } catch (err) {
    toggle.checked = !toggle.checked; // Revert
    showStatus("فشل تعديل وضع الصيانة: " + err.message, "error");
  }
}

// 3. Admin Logs
async function loadAdminLogs() {
  const container = document.getElementById('logsListContainer');
  try {
    const logs = await adminService.getAdminLogs();
    
    // Render on dashboard quick logs if exists
    renderQuickAdminLogs(logs);

    // Render on full logs panel
    if (container) {
      if (logs.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-gray);padding:20px;">لا توجد سجلات بعد.</div>';
        return;
      }
      container.innerHTML = logs.map(l => {
        const dateStr = new Date(l.timestamp).toLocaleString('ar-EG');
        return `
          <div class="log-item" style="padding:12px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap: 15px;">
            <div>
              <span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:700;margin-left:8px;">${l.admin}</span>
              <span style="font-weight:bold;">${l.message || l.details}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-gray);font-family:Montserrat,sans-serif;white-space:nowrap;">${dateStr}</span>
          </div>`;
      }).join('');
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="text-align: center; color: red; padding: 20px;">خطأ في تحميل سجل العمليات: ${err.message}</div>`;
    }
  }
}

// 4. Orders Management
async function loadOrdersList() {
  try {
    const orders = await adminService.getOrdersList();
    adminActiveOrders = orders;
    renderOrdersList(orders);
    renderDashboardChart();
    renderTopServicesBreakdown();
    loadQuickStats(); // Reload stats to keep counters synced
    if (typeof window.initOrdersAnalytics === 'function') {
      window.initOrdersAnalytics(orders);
    }
    if (typeof loadExpensesList === 'function') {
      loadExpensesList();
    }
  } catch (err) {
    const container = document.getElementById('ordersCardsContainer');
    if (container) {
      container.innerHTML = `<div style="text-align: center; color: red; padding: 40px;">فشل جلب الطلبات: ${err.message}</div>`;
    }
  }
}

function renderOrdersList(orders) {
  const fullOrdersList = adminActiveOrders && adminActiveOrders.length > 0 ? adminActiveOrders : (orders || []);
  
  // Dashboard mini-table (top 5 pending)
  const miniTbody = document.getElementById('dashboardOrdersTableBody');
  if (miniTbody) {
    const pendingOrders = fullOrdersList.filter(o => o.status === 'pending').slice(0, 5);
    if (pendingOrders.length === 0) {
      miniTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-gray);padding:20px;font-weight:700;">🎉 لا توجد طلبات معلقة بانتظارك!</td></tr>';
    } else {
      miniTbody.innerHTML = pendingOrders.map(o => {
        const dateStr = new Date(o.timestamp).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        return `<tr>
            <td style="font-family:Montserrat,sans-serif;font-weight:700;font-size:0.85rem;">#${o.id.substring(6, 14)}</td>
            <td style="font-weight:700;">${o.customerName}</td>
            <td>${o.service}</td>
            <td style="font-family:Montserrat,sans-serif;font-weight:700;color:#10b981;">${o.priceSAR} ر.س</td>
            <td style="font-size:0.8rem;color:var(--text-gray);">${dateStr}</td>
            <td style="text-align:left;"><button class="admin-btn admin-btn-success" onclick="switchMainTab('store-products'); setTimeout(() => { const btn = document.querySelector('#sub-bar-store .sub-tab-btn'); if(btn) switchTabWithSub('orders-panel', btn); }, 50);" style="padding:4px 10px; font-size:0.75rem; margin:0; font-family:inherit;">عرض</button></td>
          </tr>`;
      }).join('');
    }
  }

  // Update filter counters
  const counts = { all: fullOrdersList.length, pending: 0, paid: 0, in_progress: 0, completed: 0, cancelled: 0 };
  fullOrdersList.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  ['all','pending','paid','in_progress','completed','cancelled'].forEach(k => {
    const el = document.getElementById('orderCount_' + k);
    if (el) el.textContent = counts[k];
  });

  // Main orders container
  const container = document.getElementById('ordersCardsContainer');
  if (!container) return;

  // Apply Triple Filters (Status + Search Query + Platform Dropdown)
  const searchQuery = (document.getElementById('orderSearchInput')?.value || '').trim().toLowerCase();
  const platformFilter = document.getElementById('orderPlatformFilter')?.value || 'all';

  let filtered = fullOrdersList.filter(o => {
    if (currentOrderFilter !== 'all' && o.status !== currentOrderFilter) return false;
    if (platformFilter !== 'all' && (o.platform || '').toLowerCase() !== platformFilter) return false;
    if (searchQuery) {
      const orderId = String(o.id || '').toLowerCase();
      const shortId = orderId.substring(6, 14);
      const name = String(o.customerName || '').toLowerCase();
      const phone = String(o.customerPhone || '').toLowerCase();
      const email = String(o.eaEmail || o.sonyEmail || '').toLowerCase();
      const service = String(o.service || '').toLowerCase();
      
      return orderId.includes(searchQuery) || 
             shortId.includes(searchQuery) || 
             name.includes(searchQuery) || 
             phone.includes(searchQuery) || 
             email.includes(searchQuery) || 
             service.includes(searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-gray);"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:12px;color:var(--border-color);"></i><h3 style="margin:0 0 6px;">لا توجد طلبات</h3><p style="margin:0;font-size:0.88rem;">لا توجد طلبات مطابقة للفلتر المحدد حالياً.</p></div>';
    return;
  }

  container.innerHTML = filtered.map(o => {
    const dateStr = new Date(o.timestamp).toLocaleString('ar-EG', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    const shortId = o.id.substring(6, 14);
    const platformLabel = o.platform === 'pc' ? 'PC' : 'Console';
    const platformColor = o.platform === 'pc' ? '#6366f1' : '#3b82f6';

    const statusMap = {
      pending:     { label:'معلق',       color:'#f97316', bg:'#fff7ed', icon:'fas fa-clock' },
      paid:        { label:'تم الدفع',   color:'#3b82f6', bg:'#eff6ff', icon:'fas fa-credit-card' },
      in_progress: { label:'قيد التنفيذ', color:'#a855f7', bg:'#faf5ff', icon:'fas fa-spinner' },
      completed:   { label:'تم التنفيذ', color:'#10b981', bg:'#ecfdf5', icon:'fas fa-check-circle' },
      cancelled:   { label:'ملغي',       color:'#ef4444', bg:'#fef2f2', icon:'fas fa-times-circle' }
    };
    const st = statusMap[o.status] || statusMap.pending;

    // Credentials section (paid + in_progress)
    let creds = '';
    if ((o.status === 'paid' || o.status === 'in_progress') && (o.eaEmail || o.sonyEmail)) {
      let eaCreds = '';
      if (o.eaEmail) {
        const codes = [o.backupCode1, o.backupCode2, o.backupCode3].filter(Boolean);
        eaCreds = `
          <div style="flex:1; min-width:250px; background:#f0f9ff; border:1px solid #bfdbfe; border-radius:12px; padding:14px;">
            <div style="font-weight:800; font-size:0.85rem; color:#1e40af; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-key"></i> EA Account (Origin)
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:#fff; border-radius:8px; padding:8px 12px; border:1px solid #e2e8f0;">
                <div style="font-size:0.7rem; color:var(--text-gray); margin-bottom:2px;">EA Email</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:700; font-size:0.85rem; color:#0f172a; word-break:break-all;">${o.eaEmail}</span>
                  <button onclick="copyText('${o.eaEmail.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.9rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>
              <div style="background:#fff; border-radius:8px; padding:8px 12px; border:1px solid #e2e8f0;">
                <div style="font-size:0.7rem; color:var(--text-gray); margin-bottom:2px;">EA Password</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:700; font-size:0.85rem; color:#0f172a;">${o.eaPassword}</span>
                  <button onclick="copyText('${o.eaPassword.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.9rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>
            </div>
            ${codes.length > 0 ? `<div style="display:flex; gap:8px; margin-top:8px;">${codes.map((c,i) => `
              <div style="flex:1; background:#fff; border-radius:8px; padding:8px 10px; border:1px solid #e2e8f0;">
                <div style="font-size:0.65rem; color:var(--text-gray);">Backup ${i+1}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:800; font-size:0.9rem; letter-spacing:1px;">${c}</span>
                  <button onclick="copyText('${c}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.85rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>`).join('')}</div>` : ''}
          </div>`;
      }

      let sonyCreds = '';
      if (o.sonyEmail) {
        const codes = [o.sonyBackupCode1 || o.backupCode1, o.sonyBackupCode2 || o.backupCode2, o.sonyBackupCode3 || o.backupCode3].filter(Boolean);
        sonyCreds = `
          <div style="flex:1; min-width:250px; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:12px; padding:14px;">
            <div style="font-weight:800; font-size:0.85rem; color:#6d28d9; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <i class="fab fa-playstation"></i> PlayStation (Sony)
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:#fff; border-radius:8px; padding:8px 12px; border:1px solid #e2e8f0;">
                <div style="font-size:0.7rem; color:var(--text-gray); margin-bottom:2px;">Sony Email</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:700; font-size:0.85rem; color:#0f172a; word-break:break-all;">${o.sonyEmail}</span>
                  <button onclick="copyText('${o.sonyEmail.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.9rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>
              <div style="background:#fff; border-radius:8px; padding:8px 12px; border:1px solid #e2e8f0;">
                <div style="font-size:0.7rem; color:var(--text-gray); margin-bottom:2px;">Sony Password</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:700; font-size:0.85rem; color:#0f172a;">${o.sonyPassword}</span>
                  <button onclick="copyText('${o.sonyPassword.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.9rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>
            </div>
            ${codes.length > 0 ? `<div style="display:flex; gap:8px; margin-top:8px;">${codes.map((c,i) => `
              <div style="flex:1; background:#fff; border-radius:8px; padding:8px 10px; border:1px solid #e2e8f0;">
                <div style="font-size:0.65rem; color:var(--text-gray);">Backup ${i+1}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:Montserrat,sans-serif; font-weight:800; font-size:0.9rem; letter-spacing:1px;">${c}</span>
                  <button onclick="copyText('${c}')" style="background:none; border:none; cursor:pointer; color:#3b82f6; font-size:0.85rem;" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
              </div>`).join('')}</div>` : ''}
          </div>`;
      }

      creds = `<div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">
        ${sonyCreds}
        ${eaCreds}
      </div>`;
    }

    // Actions per status
    let actions = '';
    if (o.status === 'pending') {
      actions = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
        <button onclick="contactCustomerWhatsApp('${o.id}')" style="flex:1;background:#25d366;color:#fff;border:0;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fab fa-whatsapp" style="font-size:1.1rem;"></i> مراسلة العميل</button>
        <button onclick="confirmPayment('${o.id}',${o.priceSAR})" style="flex:1;background:#3b82f6;color:#fff;border:0;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-credit-card"></i> تأكيد الدفع</button>
        <button onclick="cancelOrder('${o.id}')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.8rem;"><i class="fas fa-times"></i></button>
      </div>`;
    } else if (o.status === 'paid') {
      actions = `<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;"><label style="font-size:0.72rem;color:var(--text-gray);font-weight:700;display:block;margin-bottom:3px;">تكلفة المورد ($)</label>
            <input type="number" id="supplier_cost_${o.id}" class="admin-input" placeholder="0" style="padding:8px 12px;font-size:0.9rem;margin:0;font-family:Montserrat,sans-serif;font-weight:700;" value="${o.supplierCost || ''}"/>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="sendToSupplier('${o.id}')" style="flex:1;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:0;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-truck"></i> إرسال للمورد</button>
          <button onclick="cancelOrder('${o.id}')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.8rem;"><i class="fas fa-times"></i></button>
        </div>
      </div>`;
    } else if (o.status === 'in_progress') {
      actions = `<div style="display:flex;gap:8px;margin-top:14px;">
        <button onclick="markSupplierDone('${o.id}')" style="flex:1;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:0;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-check-double"></i> المورد أنهى العمل ✅</button>
        <button onclick="cancelOrder('${o.id}')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.8rem;"><i class="fas fa-times"></i></button>
      </div>`;
    } else if (o.status === 'completed') {
      const profit = o.profit || ((o.amountPaid || o.priceSAR) - (o.supplierCost || 0));
      actions = `<div style="display:flex;gap:10px;margin-top:14px;background:#ecfdf5;border:1px solid #a7f3d0;padding:12px;border-radius:10px;">
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#059669;font-weight:700;">المدفوع</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#047857;">$${(o.amountPaid||o.priceSAR).toLocaleString()}</div></div>
        <div style="width:1px;background:#a7f3d0;"></div>
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#dc2626;font-weight:700;">المورد</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#ef4444;">$${(o.supplierCost||0).toLocaleString()}</div></div>
        <div style="width:1px;background:#a7f3d0;"></div>
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#ca8a04;font-weight:700;">الربح</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#ca8a04;">$${profit.toLocaleString()}</div></div>
      </div>`;
    }

    return `<div class="order-card" style="background:var(--card-bg);border-radius:16px;border:1px solid rgba(0,0,0,0.05);padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:0.9rem;color:var(--text-dark);">#${shortId}</span>
          <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:800;display:flex;align-items:center;gap:4px;"><i class="${st.icon}" style="font-size:0.7rem;"></i> ${st.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:0.78rem;color:var(--text-gray);font-family:Montserrat,sans-serif;">${dateStr}</span>
          <button onclick="deleteOrder('${o.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.95rem;padding:4px;display:flex;align-items:center;" title="حذف الطلب نهائياً"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:16px;align-items:start;">
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">العميل</div><div style="font-weight:800;color:var(--text-dark);font-size:0.95rem;">${o.customerName}</div><div style="font-size:0.8rem;color:var(--text-gray);margin-top:2px;direction:ltr;text-align:right;">${o.customerPhone||'—'}</div></div>
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">الخدمة</div><div style="font-weight:800;color:var(--gold-primary);font-size:0.9rem;">${o.service}</div><div style="margin-top:4px;"><span style="background:${platformColor}15;color:${platformColor};padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:800;">${platformLabel}</span></div></div>
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">السعر</div><div style="font-family:Montserrat,sans-serif;font-weight:900;color:#10b981;font-size:1.15rem;">$${o.priceSAR.toLocaleString()}</div>${o.couponCode?`<div style="font-size:0.72rem;color:#a855f7;font-weight:700;margin-top:2px;">🎟️ ${o.couponCode}</div>`:''}</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <button onclick="contactCustomerWhatsApp('${o.id}')" style="width:42px;height:42px;border-radius:50%;background:#25d366;color:#fff;border:0;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;" title="واتساب"><i class="fab fa-whatsapp"></i></button>
          <span style="font-size:0.6rem;color:var(--text-gray);">واتساب</span>
        </div>
      </div>
      ${creds}
      ${o.adminNotes ? `<div style="background: rgba(202,138,4,0.06); border:1px solid #fef08a; border-radius:10px; padding:10px 14px; margin-top:12px; font-size:0.8rem; color:#ca8a04; font-weight:700;"><i class="fas fa-sticky-note" style="margin-left:6px;"></i>ملاحظة داخلية: ${o.adminNotes}</div>` : ''}
      ${actions}
      
      <!-- Advanced Order Controls Panel -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-color); flex-wrap:wrap; gap:8px;">
        <div style="display:flex; gap:8px;">
          <button onclick="openEditOrderModal('${o.id}')" class="admin-btn" style="background:#f1f5f9; color:#475569; border:0; padding:6px 12px; border-radius:6px; cursor:pointer; font-family:Cairo,sans-serif; font-weight:700; font-size:0.75rem; display:flex; align-items:center; gap:6px; margin:0;">
            <i class="fas fa-edit"></i> تعديل البيانات والملاحظات
          </button>
          
          ${(o.eaEmail || o.sonyEmail) ? `
          <button onclick="copyOrderSupplierPayload('${o.id}')" class="admin-btn" style="background:#eff6ff; color:#3b82f6; border:0; padding:6px 12px; border-radius:6px; cursor:pointer; font-family:Cairo,sans-serif; font-weight:700; font-size:0.75rem; display:flex; align-items:center; gap:6px; margin:0;">
            <i class="fas fa-copy"></i> نسخ للمورد
          </button>` : ''}
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-size:0.72rem; color:var(--text-gray); font-family:Cairo,sans-serif; font-weight:700; margin-left:4px;">رسائل واتساب:</span>
          <button onclick="contactCustomerWhatsApp('${o.id}')" class="admin-btn" style="background:#ecfdf5; color:#059669; border:0; padding:4px 10px; border-radius:6px; cursor:pointer; font-family:Cairo,sans-serif; font-weight:700; font-size:0.72rem; display:flex; align-items:center; gap:4px; margin:0;" title="الاستلام وتأكيد الدفع">
            الاستلام
          </button>
          <button onclick="contactCustomerWhatsAppInProgress('${o.id}')" class="admin-btn" style="background:#faf5ff; color:#7c3aed; border:0; padding:4px 10px; border-radius:6px; cursor:pointer; font-family:Cairo,sans-serif; font-weight:700; font-size:0.72rem; display:flex; align-items:center; gap:4px; margin:0;" title="بدء العمل والتحذير من الدخول">
            بدء الشحن
          </button>
          <button onclick="contactCustomerWhatsAppCompleted('${o.id}')" class="admin-btn" style="background:#eff6ff; color:#2563eb; border:0; padding:4px 10px; border-radius:6px; cursor:pointer; font-family:Cairo,sans-serif; font-weight:700; font-size:0.72rem; display:flex; align-items:center; gap:4px; margin:0;" title="اكتمال الطلب والتحذير الأمني">
            الافتتاح
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Order filter state ──
window.setOrderFilter = function(filter, btn) {
  currentOrderFilter = filter;
  document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOrdersList(adminActiveOrders);
}

// ── Order Status Transitions ──
async function updateOrderStatus(orderId, newStatus, extraData = {}) {
  try {
    const data = await adminService.updateOrderStatus(orderId, newStatus, extraData);
    if (data.success) {
      showStatus("تم تحديث حالة الطلب بنجاح!", "success");
      loadOrdersList();
      loadQuickStats();
      loadAdminLogs();
    } else {
      showStatus(data.error || "فشل تحديث الحالة.", "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر: " + err.message, "error");
  }
}

window.confirmPayment = function(orderId, defaultAmount) {
  const amount = prompt('أدخل المبلغ الذي دفعه العميل بالدولار ($):', defaultAmount);
  if (amount === null) return;
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) { alert("مبلغ غير صحيح."); return; }
  updateOrderStatus(orderId, 'paid', { amountPaid: parsed });
}

window.sendToSupplier = function(orderId) {
  const input = document.getElementById('supplier_cost_' + orderId);
  const cost = parseFloat(input?.value);
  if (isNaN(cost) || cost < 0) { alert("أدخل تكلفة المورد أولاً."); return; }
  updateOrderStatus(orderId, 'in_progress', { supplierCost: cost });
}

window.markSupplierDone = function(orderId) {
  if (!confirm("هل أنت متأكد أن المورد أنهى هذا الطلب؟")) return;
  updateOrderStatus(orderId, 'completed');
}

window.cancelOrder = function(orderId) {
  if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
  updateOrderStatus(orderId, 'cancelled');
}

window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showStatus('✅ تم النسخ!', 'success');
  }).catch(() => {});
}

window.contactCustomerWhatsApp = function(orderId) {
  try {
    const order = adminActiveOrders.find(o => String(o.id) === String(orderId));
    if (!order) {
      alert("لم يتم العثور على بيانات الطلب.");
      return;
    }

    let phone = order.customerPhone || '';
    let phoneClean = phone.replace(/[^0-9]/g, '');
    if (!phoneClean) {
      alert("رقم الهاتف غير متاح أو مكتوب بشكل غير صحيح.");
      return;
    }

    if (!phoneClean.startsWith('966') && phoneClean.startsWith('05')) {
      phoneClean = '966' + phoneClean.slice(1);
    }
    
    const shortId = order.id.substring(6, 14);
    const msg = `👋 مرحباً بك ${order.customerName}، معك الدعم الفني لمتجر Trivela 🎮\n\n` +
                `📦 لقد استلمنا طلبك بنجاح وبانتظار تأكيد الدفع للبدء بالعمل:\n` +
                `🆔 رقم الطلب: #${shortId}\n` +
                `🌟 الخدمة المطلوبة: ${order.service}\n` +
                `🕹️ المنصة: ${order.platform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس'}\n` +
                `💵 الإجمالي النهائي: ${order.priceSAR.toLocaleString()} ر.س\n\n` +
                `💳 يرجى تأكيد وسيلة الدفع المناسبة لك لنرسل لك رابط الفاتورة والبدء فوراً.`;

    window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank');
  } catch (err) {
    alert("عذراً، حدث خطأ أثناء محاولة فتح واتساب: " + err.message);
  }
}

// ==========================================
// 5. Scraper & Challenge Players Creator
// ==========================================
let adminActivePlayersList = [];

export function switchAdminScraperTab(tabId) {
  activeScraperTab = tabId;
  // Clear preview and variables
  const preview = document.getElementById('previewContainer');
  if (preview) preview.style.display = 'none';
  currentScrapedPlayer = null;

  // Update tab button styles
  const btnPlayer = document.getElementById('subTabSbcPlayer');
  const btnUpgrade = document.getElementById('subTabSbcUpgrade');
  const btnObjective = document.getElementById('subTabObjective');

  if (btnPlayer) btnPlayer.classList.toggle('active', tabId === 'sbc-player');
  if (btnUpgrade) btnUpgrade.classList.toggle('active', tabId === 'sbc-upgrade');
  if (btnObjective) btnObjective.classList.toggle('active', tabId === 'objective');

  // Fields and Labels
  const scraperCardTitle = document.getElementById('scraperCardTitle');
  const sbcSubCategoryGroup = document.getElementById('sbcSubCategoryGroup');
  const objectiveSubCategoryGroup = document.getElementById('objectiveSubCategoryGroup');
  const ratingPositionFields = document.getElementById('ratingPositionFields');
  const sbcMetaFields = document.getElementById('sbcMetaFields');

  const categorySelect = document.getElementById('categorySelect');
  const sbcSubCategory = document.getElementById('sbcSubCategory');

  if (tabId === 'sbc-player') {
    if (scraperCardTitle) scraperCardTitle.innerHTML = `<i class="fas fa-user-shield"></i> استخراج تحدي لاعب SBC جديد من FUT.GG`;
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'block';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'none';
    if (ratingPositionFields) ratingPositionFields.style.display = 'block';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (categorySelect) categorySelect.value = 'sbc';
    if (sbcSubCategory) sbcSubCategory.value = 'players';
  } else if (tabId === 'sbc-upgrade') {
    if (scraperCardTitle) scraperCardTitle.innerHTML = `<i class="fas fa-rotate"></i> استخراج تحدي ترقية / بكج SBC جديد من FUT.GG`;
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'block';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'none';
    if (ratingPositionFields) ratingPositionFields.style.display = 'none';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (categorySelect) categorySelect.value = 'sbc';
    if (sbcSubCategory) sbcSubCategory.value = 'upgrades';
  } else if (tabId === 'objective') {
    if (scraperCardTitle) scraperCardTitle.innerHTML = `<i class="fas fa-list-check"></i> استخراج مهمة (Objective) جديدة من FUT.GG`;
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'none';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'block';
    if (ratingPositionFields) ratingPositionFields.style.display = 'none';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (categorySelect) categorySelect.value = 'objectives';
  }
}
window.switchAdminScraperTab = switchAdminScraperTab;

window.toggleManualEntryMode = function(isManual) {
  const urlGroup = document.getElementById('urlGroupField');
  const preview = document.getElementById('previewContainer');
  
  const btnScrape = document.getElementById('btnModeScrape');
  const btnManual = document.getElementById('btnModeManual');

  if (btnScrape) {
    if (!isManual) {
      btnScrape.style.background = 'var(--blue-500)';
      btnScrape.style.color = 'white';
    } else {
      btnScrape.style.background = '#cbd5e1';
      btnScrape.style.color = '#475569';
    }
  }

  if (btnManual) {
    if (isManual) {
      btnManual.style.background = 'var(--blue-500)';
      btnManual.style.color = 'white';
    } else {
      btnManual.style.background = '#cbd5e1';
      btnManual.style.color = '#475569';
    }
  }

  if (isManual) {
    if (urlGroup) urlGroup.style.display = 'none';
    if (preview) preview.style.display = 'flex';
    
    const sbcSubCategoryGroup = document.getElementById('sbcSubCategoryGroup');
    const objectiveSubCategoryGroup = document.getElementById('objectiveSubCategoryGroup');
    const categorySelect = document.getElementById('categorySelect');
    
    if (activeScraperTab === 'objective') {
      if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'none';
      if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'block';
      if (categorySelect) categorySelect.value = 'objectives';
    } else {
      if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'block';
      if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'none';
      if (categorySelect) categorySelect.value = 'sbc';
    }

    // Check if we are already editing a player, if not start clean
    if (!currentScrapedPlayer || !currentScrapedPlayer.id || currentScrapedPlayer.id.startsWith('scraped_')) {
      currentScrapedPlayer = {
        id: "manual_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        image: "logo-official.png",
        category: categorySelect ? categorySelect.value : 'sbc'
      };
      
      document.getElementById('previewImg').src = 'logo-official.png';
      document.getElementById('priceName').value = "";
      document.getElementById('previewRating').value = 90;
      document.getElementById('previewPosition').value = "CM";
      document.getElementById('previewVersion').value = "Manual";
      document.getElementById('priceSAR').value = 0;
      document.getElementById('priceUSD').value = 0;
      document.getElementById('pricePCUSD').value = 0;
      document.getElementById('pricePCSAR').value = 0;
    }
  } else {
    if (urlGroup) urlGroup.style.display = 'block';
    if (preview) preview.style.display = 'none';
    currentScrapedPlayer = null;
  }
};

export async function scrapePlayerLink() {
  const urlInput = document.getElementById('futggUrl');
  if (!urlInput) return;
  const url = urlInput.value.trim();

  if (!url) {
    alert("يرجى إدخال رابط FUT.GG صحيح أولاً.");
    return;
  }

  const btn = document.getElementById('btnScrape');
  const spinner = document.getElementById('scrapeSpinner');
  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  const category = document.getElementById('categorySelect').value;
  const sbcSub = document.getElementById('sbcSubCategory') ? document.getElementById('sbcSubCategory').value : 'players';

  try {
    const data = await adminService.scrapeFutggLink(url, category, sbcSub);
    
    if (data.success && data.player) {
      currentScrapedPlayer = data.player;
      
      currentScrapedPlayer.category = category;
      if (category === 'sbc') {
        currentScrapedPlayer.sbcSubCategory = sbcSub;
      }

      // Populate preview fields
      const preview = document.getElementById('previewContainer');
      if (preview) preview.style.display = 'flex';
      
      document.getElementById('previewImg').src = data.player.image || 'logo-official.png';
      document.getElementById('priceName').value = data.player.name || "";
      
      const ratingEl = document.getElementById('previewRating');
      if (ratingEl) ratingEl.value = data.player.rating || 90;
      
      const posEl = document.getElementById('previewPosition');
      if (posEl) posEl.value = data.player.position || 'CM';

      const versionEl = document.getElementById('previewVersion');
      if (versionEl) versionEl.value = data.player.version || 'SBC';

      document.getElementById('priceSAR').value = data.player.priceSAR || 105;
      document.getElementById('priceUSD').value = data.player.priceUSD || 28;
      document.getElementById('pricePCUSD').value = data.player.priceUSD || 28;
      document.getElementById('pricePCSAR').value = data.player.priceSAR || 105;

      showStatus("تم سحب بيانات التحدي بنجاح!", "success");
    } else {
      showStatus("فشل سحب البيانات من الرابط المحدد.", "error");
    }
  } catch (err) {
    showStatus("حدث خطأ أثناء الاتصال بالـ Scraper: " + err.message, "error");
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}
window.scrapePlayerLink = scrapePlayerLink;

export async function savePlayerToStore() {
  if (!currentScrapedPlayer) {
    alert("لا توجد بيانات لحفظها. يرجى سحب لاعب أو استخدام الإدخال اليدوي.");
    return;
  }

  const name = document.getElementById('priceName').value.trim();
  const rating = parseInt(document.getElementById('previewRating').value, 10) || 90;
  const position = document.getElementById('previewPosition').value.trim();
  const version = document.getElementById('previewVersion').value.trim();
  const sbcCount = document.getElementById('sbcCount').value.trim();
  const expiryDays = parseInt(document.getElementById('expiryDays').value, 10) || 7;

  const priceSAR = parseFloat(document.getElementById('priceSAR').value) || 0;
  const priceUSD = parseFloat(document.getElementById('priceUSD').value) || 0;
  const pricePCSAR = parseFloat(document.getElementById('pricePCSAR').value) || 0;
  const pricePCUSD = parseFloat(document.getElementById('pricePCUSD').value) || 0;

  if (!name) {
    alert("يرجى إدخال اسم اللاعب أو التحدي.");
    return;
  }

  const category = document.getElementById('categorySelect').value;
  let sbcSub = 'players';
  if (category === 'sbc') {
    sbcSub = document.getElementById('sbcSubCategory') ? document.getElementById('sbcSubCategory').value : 'players';
  } else if (category === 'objectives') {
    sbcSub = document.getElementById('objectiveSubCategory') ? document.getElementById('objectiveSubCategory').value : 'custom';
  }

  // Build final payload
  const payload = {
    ...currentScrapedPlayer,
    name,
    rating,
    position,
    version,
    sbcCount,
    expiryDays,
    priceSAR,
    priceUSD,
    pricePCSAR,
    pricePCUSD,
    category
  };

  if (category === 'sbc' || category === 'objectives') {
    payload.sbcSubCategory = sbcSub;
  }

  // Calculate expiry timestamp
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + expiryDays);
  payload.expiry = expDate.toISOString();
  payload.expirationDate = expDate.toISOString();

  try {
    const res = await adminService.savePlayer(payload);
    if (res.success) {
      showStatus(`✅ تم حفظ ونشر المنتج "${name}" بنجاح!`, "success");
      loadActivePlayers();
      window.toggleManualEntryMode(false);
    } else {
      showStatus("فشل حفظ التحدي.", "error");
    }
  } catch (err) {
    showStatus("فشل حفظ التحدي: " + err.message, "error");
  }
}
window.savePlayerToStore = savePlayerToStore;

export async function loadActivePlayers() {
  const table = document.getElementById('playersTableBody');
  if (!table) return;

  table.innerHTML = `<tr><td colspan="9" style="text-align: center;">جاري التحميل...</td></tr>`;

  try {
    const players = await adminService.getActivePlayers();
    adminActivePlayersList = players || [];
    renderPlayersList(adminActivePlayersList);
  } catch (err) {
    table.innerHTML = `<tr><td colspan="9" style="text-align: center; color:red;">خطأ في تحميل كروت التحديات.</td></tr>`;
  }
}
window.loadActivePlayers = loadActivePlayers;

function renderPlayersList(players) {
  const table = document.getElementById('playersTableBody');
  if (!table) return;

  // Filter out coaching to avoid duplication!
  const filtered = players.filter(p => p.category !== 'coaching');

  if (filtered.length === 0) {
    table.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-gray);">لا توجد كروت SBC أو مهام معروضة في المتجر حالياً.</td></tr>`;
    return;
  }

  table.innerHTML = filtered.map(p => {
    let catText = "";
    if (p.category === 'sbc') {
      catText = `<span class="badge" style="background:#f3e8ff;color:#7e22ce;font-weight:700;">SBC (${p.sbcSubCategory === 'upgrades' ? 'ترقية' : 'لاعب'})</span>`;
    } else if (p.category === 'objectives') {
      catText = `<span class="badge" style="background:#dbeafe;color:#1d4ed8;font-weight:700;">مهام / Objectives</span>`;
    } else {
      catText = `<span class="badge" style="background:#f1f5f9;color:#475569;">${p.category || 'عام'}</span>`;
    }

    const sbcCountText = p.sbcCount || '—';
    const expiration = p.expirationDate || p.expiry;
    const expiryText = expiration ? new Date(expiration).toLocaleDateString('ar-EG') : 'غير محدد';

    return `
      <tr style="border-bottom: 1px solid var(--border-color); height: 42px;">
        <td style="padding: 8px;"><img src="${p.image || 'logo-official.png'}" alt="${p.name}" style="height: 48px; border-radius: 6px; background:rgba(0,0,0,0.05); padding:2px;"/></td>
        <td style="font-weight: 700; font-family: Cairo; color: var(--text-dark);">${p.name}</td>
        <td><span class="badge" style="background:#fef3c7;color:#d97706;font-weight:700;">${p.rating || '—'}</span></td>
        <td style="font-family: Cairo;">${sbcCountText}</td>
        <td style="font-family: Cairo; font-size: 0.8rem; color: var(--text-gray);">${expiryText}</td>
        <td>${catText}</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: var(--gold-primary); text-align: left;">${p.priceSAR.toFixed(0)} ر.س</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: #10b981; text-align: left;">$${p.priceUSD.toFixed(0)}</td>
        <td>
          <button class="admin-btn" onclick="window.editPlayer('${p.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-edit"></i> تعديل</button>
          <button class="admin-btn" onclick="window.deletePlayer('${p.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-trash-alt"></i> حذف</button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderPlayersList = renderPlayersList;

window.editPlayer = function(id) {
  const p = adminActivePlayersList.find(player => player.id === id);
  if (!p) return;

  // Toggle manual entry mode so fields are visible
  currentScrapedPlayer = p;
  window.toggleManualEntryMode(true);
  
  if (p.category === 'sbc') {
    if (p.sbcSubCategory === 'upgrades') {
      window.switchAdminScraperTab('sbc-upgrade');
    } else {
      window.switchAdminScraperTab('sbc-player');
    }
  } else if (p.category === 'objectives') {
    window.switchAdminScraperTab('objective');
  }

  // Populate fields
  document.getElementById('previewImg').src = p.image || 'logo-official.png';
  document.getElementById('priceName').value = p.name;
  
  const ratingEl = document.getElementById('previewRating');
  if (ratingEl) ratingEl.value = p.rating || 90;
  
  const posEl = document.getElementById('previewPosition');
  if (posEl) posEl.value = p.position || 'CM';

  const versionEl = document.getElementById('previewVersion');
  if (versionEl) versionEl.value = p.version || 'SBC';

  const sbcCountEl = document.getElementById('sbcCount');
  if (sbcCountEl) sbcCountEl.value = p.sbcCount || '3 تشكيلات';

  const expiryDaysEl = document.getElementById('expiryDays');
  if (expiryDaysEl) expiryDaysEl.value = p.expiryDays || 7;

  document.getElementById('priceSAR').value = p.priceSAR;
  document.getElementById('priceUSD').value = p.priceUSD;
  document.getElementById('pricePCUSD').value = p.pricePCUSD || p.priceUSD;
  document.getElementById('pricePCSAR').value = p.pricePCSAR || p.priceSAR;

  const container = document.getElementById('scraperCardTitle');
  if (container) container.scrollIntoView({ behavior: 'smooth' });
};

export async function deletePlayer(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الكرت وإزالته من المتجر؟")) return;

  try {
    const data = await adminService.deletePlayer(id);
    if (data.success) {
      showStatus("تم حذف الكارت بنجاح!", "success");
      loadActivePlayers();
    } else {
      showStatus("فشل حذف الكرت.", "error");
    }
  } catch (err) {
    showStatus("خطأ في الاتصال بالخادم لحذف الكارت.", "error");
  }
}
window.deletePlayer = deletePlayer;

// 6. Users Control
async function loadAllUsers() {
  const table = document.getElementById('usersTableBody');
  if (!table) return;

  table.innerHTML = `<tr><td colspan="6" style="text-align: center;">جاري تحميل جدول العملاء والمبيعات...</td></tr>`;

  try {
    const [users, orders] = await Promise.all([
      adminService.getAllUsers(),
      adminActiveOrders.length === 0 ? adminService.getOrdersList() : Promise.resolve(adminActiveOrders)
    ]);
    allUsers = users || [];
    adminActiveOrders = orders || [];
    renderUsersList(allUsers);
  } catch (err) {
    console.error("Failed to load CRM data:", err);
    table.innerHTML = `<tr><td colspan="6" style="text-align: center; color:red;">فشل جلب قاعدة بيانات العملاء.</td></tr>`;
  }
}

let isMarketingActive = false;
let currentCrmTab = 'orders';
let activeProfileUser = null;

function sanitizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\+\-]/g, '');
}

export function modifyPoints(userId, action) {
  const user = allUsers.find(u => u.id === userId);
  const userName = user ? user.name : "المستخدم";
  if (typeof window.openPointAdjustmentModal === 'function') {
    window.openPointAdjustmentModal(userId, userName);
  }
}

function renderUsersList(users) {
  const table = document.getElementById('usersTableBody');
  if (!table) return;

  if (!users || users.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-gray);">لا يوجد مستخدمون مطابقون لمعايير البحث والفرز الحالية.</td></tr>`;
    return;
  }

  // Calculate stats for crm cards
  const totalUsers = allUsers.length;
  const totalPoints = allUsers.reduce((sum, u) => sum + parseInt(u.points || 0, 10), 0);
  
  // Calculate VIP Count (VIP gold or elite platinum)
  const vipCount = allUsers.filter(u => {
    const userOrders = (adminActiveOrders || []).filter(o => 
      (o.customerPhone && u.phone && sanitizePhone(o.customerPhone) === sanitizePhone(u.phone)) ||
      (o.customerEmail && u.email && o.customerEmail.toLowerCase().trim() === u.email.toLowerCase().trim())
    );
    const totalSpent = userOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + parseFloat(o.priceSAR || 0), 0);
    return (totalSpent >= 1000);
  }).length;

  // Update Stats Cards elements if they exist
  const totalUsersEl = document.getElementById('crmTotalUsers');
  if (totalUsersEl) totalUsersEl.textContent = totalUsers;
  const totalPointsEl = document.getElementById('crmTotalPoints');
  if (totalPointsEl) totalPointsEl.textContent = totalPoints.toLocaleString();
  const vipUsersEl = document.getElementById('crmVipUsers');
  if (vipUsersEl) vipUsersEl.textContent = vipCount;

  const templateMsg = isMarketingActive ? (document.getElementById('marketingMessageTemplate')?.value || '') : '';

  table.innerHTML = users.map(u => {
    // Join with orders
    const userOrders = (adminActiveOrders || []).filter(o => 
      (o.customerPhone && u.phone && sanitizePhone(o.customerPhone) === sanitizePhone(u.phone)) ||
      (o.customerEmail && u.email && o.customerEmail.toLowerCase().trim() === u.email.toLowerCase().trim())
    );
    const completedOrders = userOrders.filter(o => o.status === 'completed');
    const totalSpent = completedOrders.reduce((sum, o) => sum + parseFloat(o.priceSAR || 0), 0);
    const totalOrdersCount = userOrders.length;

    // Determine Tier (Bronze, Silver, Gold, Platinum) based on spending
    let tierText = "برونزي";
    let tierColor = "#b45309"; // bronze/brown
    let tierBg = "rgba(180, 83, 9, 0.12)";
    let isVIP = false;
    
    if (totalSpent >= 2500) {
      tierText = "بلاتيني النخبة";
      tierColor = "#6366f1"; // indigo
      tierBg = "rgba(99, 102, 241, 0.15)";
      isVIP = true;
    } else if (totalSpent >= 1000) {
      tierText = "ذهبي VIP";
      tierColor = "#ca8a04"; // gold
      tierBg = "rgba(202, 138, 4, 0.15)";
      isVIP = true;
    } else if (totalSpent >= 250) {
      tierText = "فضي";
      tierColor = "#475569"; // silver/gray
      tierBg = "rgba(71, 85, 105, 0.12)";
    }
    
    const tierBadge = `<span class="badge" style="background: ${tierBg}; color: ${tierColor}; font-weight: 700; font-family: Cairo, sans-serif; font-size: 0.75rem;"><i class="fas fa-crown" style="font-size:0.7rem; margin-left:2px;"></i> ${tierText}</span>`;

    // Determine RFM Health Status (حالة العميل)
    let healthText = "عميل مستمر";
    let healthColor = "#334155";
    let healthBg = "#f1f5f9";
    
    const now = Date.now();
    let daysSinceLastOrder = 999;
    if (userOrders.length > 0) {
      const sortedOrders = [...userOrders].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
      const lastOrderTime = new Date(sortedOrders[0].timestamp || sortedOrders[0].createdAt).getTime();
      daysSinceLastOrder = (now - lastOrderTime) / (1000 * 60 * 60 * 24);
    }
    
    if (userOrders.length === 0) {
      healthText = "خامل (بلا طلبات)";
      healthColor = "#ef4444";
      healthBg = "rgba(239, 68, 68, 0.12)";
    } else if (daysSinceLastOrder > 30 && totalSpent >= 250) {
      healthText = "خطر خسارته (خامل)";
      healthColor = "#f97316";
      healthBg = "rgba(249, 115, 22, 0.12)";
    } else if (daysSinceLastOrder <= 7 && userOrders.length === 1) {
      healthText = "جديد واعد";
      healthColor = "#3b82f6";
      healthBg = "rgba(59, 130, 246, 0.12)";
    } else if (daysSinceLastOrder <= 14 && userOrders.length >= 3) {
      healthText = "نشط جداً";
      healthColor = "#10b981";
      healthBg = "rgba(16, 185, 129, 0.12)";
    }
    
    const healthBadge = `<span class="badge" style="background: ${healthBg}; color: ${healthColor}; font-weight: 700; font-family: Cairo, sans-serif; font-size: 0.75rem; border-radius: 6px; padding: 2px 8px;">${healthText}</span>`;

    // Last Loyalty Log
    let lastLogText = "لا يوجد نشاط سابق";
    if (u.history && u.history.length > 0) {
      const lastLog = u.history[u.history.length - 1];
      const logDate = new Date(lastLog.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      const changeText = lastLog.amount >= 0 ? `+${lastLog.amount}` : `${lastLog.amount}`;
      lastLogText = `<span style="font-weight:700; color: ${lastLog.amount >= 0 ? '#10b981' : '#ef4444'}; font-family: Montserrat;">${changeText}</span> (${logDate})`;
    }

    // Avatar styling based on VIP status
    const avatarBg = isVIP ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'var(--blue-200)';
    const avatarColor = isVIP ? '#000' : 'var(--blue-600)';
    const firstLetter = u.name ? u.name.trim().charAt(0).toUpperCase() : '👤';

    // WhatsApp action button
    const sanitizedPhone = sanitizePhone(u.phone);
    const waChatLink = `https://wa.me/${sanitizedPhone}`;

    // Action button render (Marketing template vs Standard loyalty modifications)
    let actionButtons = "";
    if (isMarketingActive && templateMsg) {
      // Dynamic placeholder replacement
      const personalMsg = templateMsg
        .replace(/{الاسم}/g, u.name)
        .replace(/{النقاط}/g, u.points || 0)
        .replace(/{الترقية}/g, tierText);
      const waMarketingLink = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(personalMsg)}`;
      
      actionButtons = `
        <a href="${waMarketingLink}" target="_blank" class="admin-btn admin-btn-success" style="font-family: Cairo, sans-serif; font-size: 0.75rem; font-weight:700; padding: 6px 12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; border-radius: 8px;">
          <i class="fab fa-whatsapp"></i> إرسال العرض
        </a>
      `;
    } else {
      actionButtons = `
        <button class="admin-btn" style="background: var(--blue-500); color:white; font-family: Cairo, sans-serif; font-size: 0.75rem; font-weight:700; padding: 6px 12px; border-radius: 8px; border:0; cursor:pointer;" onclick="window.openPointAdjustmentModal('${u.id}', '${u.name}')">
          <i class="fas fa-edit"></i> تعديل النقاط
        </button>
      `;
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 12px 8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="background: ${avatarBg}; color: ${avatarColor}; width: 36px; height: 36px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-family: Cairo, sans-serif; font-size: 0.95rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">${firstLetter}</div>
            <div>
              <div style="font-weight:700; font-family: Cairo; color: var(--text-dark); cursor:pointer; text-decoration:underline;" onclick="window.openCrmCustomerProfileModal('${u.id}')">${u.name}</div>
              <div style="margin-top: 4px; display:flex; gap:4px; flex-wrap:wrap;">${tierBadge} ${healthBadge}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px 8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <a href="${waChatLink}" target="_blank" style="color: #10b981; font-size: 1.1rem; display:inline-block;" title="محادثة واتساب"><i class="fab fa-whatsapp"></i></a>
            <span style="font-family: Montserrat; font-weight: 600; color: var(--text-dark);">${u.phone || '—'}</span>
          </div>
          <div style="font-family: Montserrat; font-size: 0.75rem; color: var(--text-gray); margin-top:4px;">${u.email}</div>
        </td>
        <td style="padding: 12px 8px; text-align: left;">
          <span style="font-family: Montserrat; font-weight: 800; color: #ca8a04; font-size: 1rem;">${u.points || 0}</span>
          <span style="font-family: Cairo; font-size: 0.75rem; color: var(--text-gray); margin-right: 4px;">نقطة</span>
        </td>
        <td style="padding: 12px 8px; text-align: left;">
          <div style="font-family: Montserrat; font-weight: 700; color: var(--text-dark);">${totalOrdersCount} طلبات</div>
          <div style="font-family: Montserrat; font-size: 0.75rem; color: #10b981; font-weight:700; margin-top:2px;">${totalSpent.toFixed(2)} ر.س</div>
        </td>
        <td style="padding: 12px 8px; font-family: Cairo; font-size: 0.8rem; color: var(--text-dark);">${lastLogText}</td>
        <td style="padding: 12px 8px; text-align: center;">
          <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
            ${actionButtons}
            <button class="admin-btn admin-btn-secondary" style="font-family: Cairo; font-size: 0.75rem; font-weight:700; padding: 6px 12px; border-radius:8px; border:0; cursor:pointer;" onclick="window.openCrmCustomerProfileModal('${u.id}')">
              <i class="fas fa-eye"></i> السجل
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function filterUsers() {
  const query = document.getElementById('userSearchInput').value.toLowerCase().trim();
  const tierFilter = document.getElementById('userTierFilter').value;

  let filtered = allUsers;

  // 1. Text Search Filter
  if (query) {
    filtered = filtered.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query) || 
      (u.phone && u.phone.includes(query)) ||
      String(u.id).includes(query)
    );
  }

  // 2. Advanced RFM Segmentation Filter
  if (tierFilter !== 'all') {
    filtered = filtered.filter(u => {
      const userOrders = (adminActiveOrders || []).filter(o => 
        (o.customerPhone && u.phone && sanitizePhone(o.customerPhone) === sanitizePhone(u.phone)) ||
        (o.customerEmail && u.email && o.customerEmail.toLowerCase().trim() === u.email.toLowerCase().trim())
      );
      const totalSpent = userOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + parseFloat(o.priceSAR || 0), 0);
      const isVIP = (totalSpent >= 1000);
      const isRegular = (totalSpent >= 250 && totalSpent < 1000);
      const isNewbie = (totalSpent < 250);

      const now = Date.now();
      let daysSinceLastOrder = 999;
      if (userOrders.length > 0) {
        const sortedOrders = [...userOrders].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
        const lastOrderTime = new Date(sortedOrders[0].timestamp || sortedOrders[0].createdAt).getTime();
        daysSinceLastOrder = (now - lastOrderTime) / (1000 * 60 * 60 * 24);
      }

      if (tierFilter === 'vip') return isVIP;
      if (tierFilter === 'regular') return isRegular;
      if (tierFilter === 'zero') return (isNewbie && userOrders.length === 0);
      if (tierFilter === 'slipping') return (daysSinceLastOrder > 30 && totalSpent >= 250);
      if (tierFilter === 'active') return (daysSinceLastOrder <= 14 && userOrders.length >= 3);
      return true;
    });
  }

  renderUsersList(filtered);
}

// 7. FAQs Control
async function loadFAQs() {
  const table = document.getElementById('faqsTableBody');
  if (!table) return;

  table.innerHTML = `<tr><td colspan="4" style="text-align: center;">جاري التحميل...</td></tr>`;

  try {
    const faqs = await adminService.getFAQs();
    if (faqs.length === 0) {
      table.innerHTML = `<tr><td colspan="4" style="text-align: center;">لا توجد أسئلة شائعة مضافة بعد.</td></tr>`;
      return;
    }

    table.innerHTML = faqs.map(f => {
      const qText = f.question || f.q || '';
      const aText = f.answer || f.a || '';
      return `
        <tr>
          <td><strong>${f.id}</strong></td>
          <td><strong style="color:var(--blue-800);">${escapeHtml(qText)}</strong></td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(aText)}</td>
          <td style="display:flex;gap:6px;justify-content:center;">
            <button class="btn-action" style="background:#eab308;color:#fff;" onclick="editFAQ('${f.id}', \`${qText.replace(/'/g, "\\'")}\`, \`${aText.replace(/'/g, "\\'")}\`)"><i class="fas fa-edit"></i> تعديل</button>
            <button class="btn-action" style="background:#ef4444;color:#fff;" onclick="deleteFAQ('${f.id}')"><i class="fas fa-trash"></i> حذف</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="4" style="text-align: center; color:red;">فشل تحميل الأسئلة الشائعة.</td></tr>`;
  }
}

async function saveFAQ(event) {
  event.preventDefault();
  
  const idInput = document.getElementById('faqId').value;
  const faqData = {
    id: idInput ? parseInt(idInput, 10) : null,
    question: document.getElementById('faqQuestion').value.trim(),
    answer: document.getElementById('faqAnswer').value.trim()
  };

  try {
    const data = await adminService.saveFAQ(faqData);
    if (data.success) {
      showStatus("تم حفظ السؤال الشائع بنجاح!", "success");
      resetFAQForm();
      loadFAQs();
    } else {
      showStatus("فشل حفظ السؤال الشائع.", "error");
    }
  } catch (err) {
    showStatus(err.message || "خطأ أثناء إرسال البيانات.", "error");
  }
}

export function editFAQ(id, q, a) {
  document.getElementById('faqId').value = id;
  document.getElementById('faqQuestion').value = q;
  document.getElementById('faqAnswer').value = a;
  
  const titleEl = document.getElementById('faqFormTitle');
  if (titleEl) titleEl.textContent = "تعديل سؤال شائع حالي";
  
  const btn = document.getElementById('faqSubmitBtn');
  if (btn) btn.innerHTML = `<i class="fas fa-check"></i> تحديث السؤال`;
  
  document.getElementById('faqQuestion').focus();
}

export async function deleteFAQ(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا السؤال الشائع نهائياً؟")) return;

  try {
    const data = await adminService.deleteFAQ(id);
    if (data.success) {
      showStatus("تم إزالة السؤال بنجاح!", "success");
      loadFAQs();
    } else {
      showStatus("فشل حذف السؤال الشائع.", "error");
    }
  } catch (err) {
    showStatus("خطأ في الاتصال بالخادم.", "error");
  }
}

function resetFAQForm() {
  document.getElementById('faqId').value = "";
  document.getElementById('faqQuestion').value = "";
  document.getElementById('faqAnswer').value = "";
  
  const titleEl = document.getElementById('faqFormTitle');
  if (titleEl) titleEl.textContent = "إضافة سؤال شائع جديد";
  
  const btn = document.getElementById('faqSubmitBtn');
  if (btn) btn.innerHTML = `<i class="fas fa-plus"></i> إضافة السؤال`;
}

// 8. Reviews Control
async function loadReviews() {
  const table = document.getElementById('reviewsTableBody');
  if (!table) return;

  table.innerHTML = `<tr><td colspan="7" style="text-align: center;">جاري التحميل...</td></tr>`;

  try {
    const reviews = await adminService.getReviews();
    if (reviews.length === 0) {
      table.innerHTML = `<tr><td colspan="7" style="text-align: center;">لا توجد تقييمات مضافة بعد.</td></tr>`;
      return;
    }

    table.innerHTML = reviews.map(r => {
      const statusVal = r.status || 'approved';
      const statusBadge = statusVal === 'pending' 
        ? `<span class="badge" style="background:#fff7ed;color:#c2410c;padding:4px 8px;border-radius:6px;font-weight:700;"><i class="fas fa-clock"></i> معلق</span>`
        : `<span class="badge" style="background:#f0fdf4;color:#16a34a;padding:4px 8px;border-radius:6px;font-weight:700;"><i class="fas fa-check-circle"></i> منشور</span>`;

      const approveBtn = statusVal === 'pending'
        ? `<button class="btn-action" style="background:#10b981;color:#fff;" onclick="approveReview('${r.id}', \`${r.name.replace(/'/g, "\\'")}\`, '${r.platform}', ${r.stars}, \`${r.text.replace(/'/g, "\\'")}\`, '${r.badge || ''}')"><i class="fas fa-thumbs-up"></i> قبول ونشر</button>`
        : '';

      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>
            <div style="font-weight:700;">${escapeHtml(r.name)}</div>
            <div style="font-size:0.8rem;color:#64748b;">${r.platform}</div>
          </td>
          <td><span class="badge" style="background:#fffbeb;color:#b45309;"><i class="fas fa-star" style="color:#f59e0b;margin-left:4px;"></i> ${r.stars}</span></td>
          <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(r.text)}">${escapeHtml(r.text)}</td>
          <td><span class="badge" style="background:#dcfce7;color:#15803d;">${r.badge || '—'}</span></td>
          <td>${statusBadge}</td>
          <td style="display:flex;gap:6px;justify-content:center;align-items:center;">
            ${approveBtn}
            <button class="btn-action" style="background:#eab308;color:#fff;" onclick="editReview('${r.id}', \`${r.name.replace(/'/g, "\\'")}\`, '${r.platform}', ${r.stars}, \`${r.text.replace(/'/g, "\\'")}\`, '${r.badge || ''}', '${statusVal}')"><i class="fas fa-edit"></i> تعديل</button>
            <button class="btn-action" style="background:#ef4444;color:#fff;" onclick="deleteReview('${r.id}')"><i class="fas fa-trash"></i> حذف</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" style="text-align: center; color:red;">فشل تحميل مراجعات العملاء.</td></tr>`;
  }
}

async function saveReview(event) {
  event.preventDefault();

  const idInput = document.getElementById('reviewId').value;
  const reviewData = {
    id: idInput || null,
    name: document.getElementById('revName').value.trim(),
    platform: document.getElementById('revPlatform').value,
    stars: parseInt(document.getElementById('revStars').value, 10),
    text: document.getElementById('revText').value.trim(),
    badge: document.getElementById('revBadge').value.trim(),
    status: document.getElementById('revStatus').value
  };

  try {
    const data = await adminService.saveReview(reviewData);
    if (data.success) {
      showStatus("تم حفظ التقييم بنجاح!", "success");
      resetReviewForm();
      loadReviews();
    } else {
      showStatus("فشل حفظ التقييم.", "error");
    }
  } catch (err) {
    showStatus(err.message || "خطأ أثناء إرسال بيانات التقييم.", "error");
  }
}

export async function approveReview(id, name, platform, stars, text, badge) {
  try {
    const reviewData = { id, name, platform, stars, text, badge, status: 'approved' };
    const data = await adminService.saveReview(reviewData);
    if (data.success) {
      showStatus("تم قبول ونشر التقييم بنجاح في المتجر!", "success");
      loadReviews();
    } else {
      showStatus("فشل نشر التقييم.", "error");
    }
  } catch (err) {
    showStatus("حدث خطأ أثناء قبول التقييم.", "error");
  }
}

export function editReview(id, name, platform, stars, text, badge, status) {
  document.getElementById('reviewId').value = id;
  document.getElementById('revName').value = name;
  document.getElementById('revPlatform').value = platform;
  document.getElementById('revStars').value = stars;
  document.getElementById('revText').value = text;
  document.getElementById('revBadge').value = badge;
  document.getElementById('revStatus').value = status || 'approved';
  
  const titleEl = document.getElementById('reviewFormTitle');
  if (titleEl) titleEl.textContent = "تعديل تقييم عميل حالي";

  const btn = document.getElementById('reviewSubmitBtn');
  if (btn) btn.innerHTML = `<i class="fas fa-check"></i> تحديث التقييم`;

  document.getElementById('revName').focus();
}

export async function deleteReview(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً من العرض؟")) return;

  try {
    const data = await adminService.deleteReview(id);
    if (data.success) {
      showStatus("تم مسح التقييم بنجاح!", "success");
      loadReviews();
    } else {
      showStatus("فشل حذف التقييم.", "error");
    }
  } catch (err) {
    showStatus("خطأ في الاتصال بالخادم.", "error");
  }
}

function resetReviewForm() {
  document.getElementById('reviewId').value = "";
  document.getElementById('revName').value = "";
  document.getElementById('revPlatform').value = "PlayStation";
  document.getElementById('revStars').value = "5";
  document.getElementById('revText').value = "";
  document.getElementById('revBadge').value = "";
  document.getElementById('revStatus').value = "approved";
  
  const titleEl = document.getElementById('reviewFormTitle');
  if (titleEl) titleEl.textContent = "إضافة تقييم عميل جديد";
  
  const btn = document.getElementById('reviewSubmitBtn');
  if (btn) btn.innerHTML = `<i class="fas fa-plus"></i> إضافة التقييم`;
}

// 9. Bundles Creator
async function populateBundlePlayerSelect() {
  const p1 = document.getElementById('bundlePlayer1');
  const p2 = document.getElementById('bundlePlayer2');
  if (!p1 || !p2) return;

  try {
    const players = await adminService.getActivePlayers();
    const sbcPlayers = players.filter(p => p.category === 'sbc');

    const optionsHTML = sbcPlayers.map(p => `
      <option value="${p.id}" data-sar="${p.priceSAR}" data-usd="${p.priceUSD}">${p.name} (تقييم ${p.rating} | ${p.priceSAR} ر.س)</option>
    `).join('');

    p1.innerHTML = `<option value="">-- اختر اللاعب الأول --</option>` + optionsHTML;
    p2.innerHTML = `<option value="">-- اختر اللاعب الثاني --</option>` + optionsHTML;
  } catch (err) {
    console.warn("Could not load players list to build bundle:", err);
  }
}

export function calculateBundlePrices() {
  const p1 = document.getElementById('bundlePlayer1');
  const p2 = document.getElementById('bundlePlayer2');
  const discountInput = document.getElementById('bundleDiscount');

  if (!p1 || !p2 || !discountInput) return;

  const opt1 = p1.options[p1.selectedIndex];
  const opt2 = p2.options[p2.selectedIndex];

  if (!opt1.value || !opt2.value) {
    document.getElementById('bundleLivePrice').textContent = "يرجى تحديد اللاعبين لحساب السعر";
    return;
  }

  const sar1 = parseFloat(opt1.dataset.sar);
  const sar2 = parseFloat(opt2.dataset.sar);
  const usd1 = parseFloat(opt1.dataset.usd);
  const usd2 = parseFloat(opt2.dataset.usd);

  const discount = parseFloat(discountInput.value) || 0;

  const sumSAR = sar1 + sar2;
  const sumUSD = usd1 + usd2;

  const finalSAR = sumSAR * (1 - discount / 100);
  const finalUSD = sumUSD * (1 - discount / 100);

  document.getElementById('bundleLivePrice').innerHTML = `
    السعر المجموع: <strong>${sumSAR.toFixed(2)} ر.س / ${sumUSD.toFixed(2)} $</strong><br/>
    السعر بعد الخصم الجديد: <strong style="color:var(--green);font-size:1.1rem;">${finalSAR.toFixed(2)} ر.س / ${finalUSD.toFixed(2)} $</strong>
  `;
}

async function saveBundleToStore() {
  const p1 = document.getElementById('bundlePlayer1');
  const p2 = document.getElementById('bundlePlayer2');
  const discountInput = document.getElementById('bundleDiscount');

  const opt1 = p1.options[p1.selectedIndex];
  const opt2 = p2.options[p2.selectedIndex];

  if (!opt1.value || !opt2.value) {
    alert("يرجى اختيار لاعبين لبناء الباقة الثنائية.");
    return;
  }

  const sar1 = parseFloat(opt1.dataset.sar);
  const sar2 = parseFloat(opt2.dataset.sar);
  const usd1 = parseFloat(opt1.dataset.usd);
  const usd2 = parseFloat(opt2.dataset.usd);
  const discount = parseFloat(discountInput.value) || 0;

  const finalSAR = (sar1 + sar2) * (1 - discount / 100);
  const finalUSD = (usd1 + usd2) * (1 - discount / 100);

  const name1 = opt1.text.split('(')[0].trim();
  const name2 = opt2.text.split('(')[0].trim();
  const bundleTitle = `باقة SBC: [${name1} + ${name2}]`;

  const bundlePayload = {
    name: bundleTitle,
    rating: 0,
    position: "باقة",
    version: `${discount}% خصم باقة ثنائية`,
    image: "https://trivelastore.com/images/default-sbc-bundle.png",
    category: "sbc", // Handled as SBC challenge
    priceSAR: finalSAR,
    priceUSD: finalUSD,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 Days expire default
  };

  const btn = document.getElementById('saveBundleBtn');
  if (btn) {
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...`;
    btn.disabled = true;
  }

  try {
    const data = await adminService.savePlayer(bundlePayload);
    if (btn) {
      btn.innerHTML = `<i class="fas fa-box-open"></i> إنشاء وحفظ باقة SBC الثنائية`;
      btn.disabled = false;
    }

    if (data.success) {
      showStatus("تم إنشاء باقة الـ SBC بنجاح وإتاحتها للعملاء!", "success");
      document.getElementById('bundleForm').reset();
      document.getElementById('bundleLivePrice').textContent = "يرجى تحديد اللاعبين لحساب السعر";
      loadActivePlayers();
    } else {
      showStatus("فشل حفظ الباقة الجديدة.", "error");
    }
  } catch (err) {
    if (btn) {
      btn.innerHTML = `<i class="fas fa-box-open"></i> إنشاء وحفظ باقة SBC الثنائية`;
      btn.disabled = false;
    }
    showStatus(err.message || "خطأ اتصال أثناء حفظ الباقة.", "error");
  }
}

// Alerts helpers
function showStatus(text, type) {
  let toast = document.getElementById('statusToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'statusToast';
    toast.className = 'status-toast-overlay';
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.className = `status-toast-overlay show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ── Navigation helpers ──
function switchMainTab(tabId) {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const isActive = btn.getAttribute('onclick').includes(tabId);
    btn.classList.toggle('active', isActive);
  });

  // Hide all sub-tab bars
  const barStats = document.getElementById('sub-bar-stats');
  const barStore = document.getElementById('sub-bar-store');
  const barMarketing = document.getElementById('sub-bar-marketing');
  const barContent = document.getElementById('sub-bar-content');
  const barSystem = document.getElementById('sub-bar-system');
  if (barStats) barStats.style.display = 'none';
  if (barStore) barStore.style.display = 'none';
  if (barMarketing) barMarketing.style.display = 'none';
  if (barContent) barContent.style.display = 'none';
  if (barSystem) barSystem.style.display = 'none';

  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

  if (tabId === 'stats-reports') {
    if (barStats) barStats.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-stats .sub-tab-btn.active') || document.querySelector('#sub-bar-stats .sub-tab-btn');
    if (activeSub) {
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      switchTabWithSub(panelId, activeSub);
    }
  } 
  else if (tabId === 'store-products') {
    if (barStore) barStore.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-store .sub-tab-btn.active') || document.querySelector('#sub-bar-store .sub-tab-btn');
    if (activeSub) {
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      switchTabWithSub(panelId, activeSub);
    }
  } 
  else if (tabId === 'customers-marketing') {
    if (barMarketing) barMarketing.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-marketing .sub-tab-btn.active') || document.querySelector('#sub-bar-marketing .sub-tab-btn');
    if (activeSub) {
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      switchTabWithSub(panelId, activeSub);
    }
  } 
  else if (tabId === 'content-design') {
    if (barContent) barContent.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-content .sub-tab-btn.active') || document.querySelector('#sub-bar-content .sub-tab-btn');
    if (activeSub) {
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      switchTabWithSub(panelId, activeSub);
    }
  } 
  else if (tabId === 'system') {
    if (barSystem) barSystem.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-system .sub-tab-btn.active') || document.querySelector('#sub-bar-system .sub-tab-btn');
    if (activeSub) {
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      switchTabWithSub(panelId, activeSub);
    }
  }
}

function switchTabWithSub(panelId, btn) {
  if (btn) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // Toggle active content panel
  document.querySelectorAll('.admin-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === panelId);
  });
  
  localStorage.setItem('adminActivePanel', panelId);
  
  // Specific view loaders
  if (panelId === 'orders-panel') {
    loadOrdersList();
  } else if (panelId === 'orders-analytics-panel') {
    if (adminActiveOrders && adminActiveOrders.length > 0) {
      window.initOrdersAnalytics(adminActiveOrders);
    } else {
      loadOrdersList();
    }
  } else if (panelId === 'visitors-analytics-panel') {
    loadQuickStats();
  } else if (panelId === 'profit-dashboard-panel') {
    loadExpensesList();
  } else if (panelId === 'challenges-panel') {
    loadActivePlayers();
  } else if (panelId === 'features-panel') {
    loadFeatures();
  } else if (panelId === 'users-crm-panel') {
    loadAllUsers();
  } else if (panelId === 'email-marketing-panel') {
    loadEmailCampaigns();
  }
}

// ── Dashboard Chart & Analytics Renderers ──
// ── Dashboard Chart & Analytics Renderers ──
function renderDashboardChart() {
  const chartSvg = document.getElementById('dashboardLineChart');
  const pathOrders = document.getElementById('chartPathOrders');
  const pathUsers = document.getElementById('chartPathUsers');
  const axisLabels = document.getElementById('chartAxisLabels');
  
  if (!chartSvg || !pathOrders || !pathUsers || !axisLabels) return;

  const dates = [];
  const now = new Date();
  const limit = statsDaysRange || 30;
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const ordersCountMap = {};
  dates.forEach(dt => ordersCountMap[dt] = 0);
  (adminActiveOrders || []).forEach(o => {
    try {
      const dt = new Date(o.timestamp).toISOString().split('T')[0];
      if (ordersCountMap[dt] !== undefined) ordersCountMap[dt]++;
    } catch(e){}
  });

  const usersCountMap = {};
  dates.forEach(dt => usersCountMap[dt] = 0);
  (allUsers || []).forEach(u => {
    if (u.createdAt) {
      try {
        const dt = new Date(u.createdAt).toISOString().split('T')[0];
        if (usersCountMap[dt] !== undefined) usersCountMap[dt]++;
      } catch(e){}
    }
  });

  const maxVal = Math.max(...Object.values(ordersCountMap), ...Object.values(usersCountMap), 5);

  const pointsOrders = [];
  const pointsUsers = [];
  
  dates.forEach((dt, index) => {
    const totalDays = dates.length - 1 || 1;
    const x = (index / totalDays) * 980 + 10;
    const yOrders = 200 - (ordersCountMap[dt] / maxVal) * 150;
    const yUsers = 200 - (usersCountMap[dt] / maxVal) * 150;
    
    pointsOrders.push(`${x},${yOrders}`);
    pointsUsers.push(`${x},${yUsers}`);
  });

  pathOrders.setAttribute('d', `M ${pointsOrders.join(' L ')}`);
  pathUsers.setAttribute('d', `M ${pointsUsers.join(' L ')}`);

  let labelsHtml = '';
  const step = Math.ceil(limit / 6);
  dates.forEach((dt, index) => {
    if (index % step === 0 || index === dates.length - 1) {
      const totalDays = dates.length - 1 || 1;
      const x = (index / totalDays) * 980 + 10;
      const displayDate = dt.substring(5);
      labelsHtml += `<text x="${x}" y="225" text-anchor="middle">${displayDate}</text>`;
    }
  });
  axisLabels.innerHTML = labelsHtml;
}

function renderTopServicesBreakdown() {
  const container = document.getElementById('topServicesList');
  if (!container) return;

  const counts = { 'coins': 0, 'sbc': 0, 'objectives': 0, 'rivals': 0, 'champions': 0, 'packages': 0, 'coaching': 0 };

  const limit = statsDaysRange || 30;
  const cutoffTime = Date.now() - (limit * 24 * 60 * 60 * 1000);

  const filteredOrders = (adminActiveOrders || []).filter(o => {
    const t = new Date(o.timestamp).getTime();
    return !isNaN(t) && t >= cutoffTime;
  });

  filteredOrders.forEach(o => {
    const cat = o.category ? o.category.toLowerCase() : '';
    if (counts[cat] !== undefined) {
      counts[cat]++;
    } else {
      const name = o.service ? o.service.toLowerCase() : '';
      if (name.includes('كوينز') || name.includes('coins')) counts['coins']++;
      else if (name.includes('sbc')) counts['sbc']++;
      else if (name.includes('مهام') || name.includes('objective')) counts['objectives']++;
      else if (name.includes('رايفلز') || name.includes('rivals')) counts['rivals']++;
      else if (name.includes('تشامبيون') || name.includes('champions')) counts['champions']++;
      else if (name.includes('باقة') || name.includes('package')) counts['packages']++;
      else if (name.includes('تدريب') || name.includes('coaching')) counts['coaching']++;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const labelsMap = {
    'coins': { title: 'شحن كوينز FUT', color: '#3b82f6' },
    'sbc': { title: 'تحديات بناء التشكيلة SBC', color: '#f59e0b' },
    'objectives': { title: 'إنجاز المهام Objectives', color: '#a855f7' },
    'rivals': { title: 'ترقية Division Rivals', color: '#10b981' },
    'champions': { title: 'بطولة FUT Champions', color: '#ec4899' },
    'packages': { title: 'باقات الكوينز المدمجة', color: '#14b8a6' },
    'coaching': { title: 'جلسات التدريب والاستشارات', color: '#6366f1' }
  };

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sorted.map(([key, count]) => {
    const percent = Math.round((count / total) * 100);
    const info = labelsMap[key] || { title: key, color: '#94a3b8' };
    return `
      <div style="margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:6px;">
          <span style="color:var(--text-dark);">${info.title}</span>
          <span style="color:var(--text-gray); font-family:Montserrat,sans-serif;">${count} طلب (${percent}%)</span>
        </div>
        <div style="width:100%; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
          <div style="width:${percent}%; height:100%; background:${info.color}; border-radius:4px; transition:width 0.5s ease;"></div>
        </div>
      </div>`;
  }).join('');
}

function renderQuickAdminLogs(logs) {
  const container = document.getElementById('quickAdminLogsList');
  if (!container) return;
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-gray);padding:20px;">لا توجد عمليات مسجلة بعد.</div>';
    return;
  }

  const subset = logs.slice(0, 5);
  container.innerHTML = subset.map(l => {
    const dateStr = new Date(l.timestamp).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    let icon = '<i class="fas fa-info-circle" style="color:#64748b;"></i>';
    if (l.action.includes('ORDER')) icon = '<i class="fas fa-shopping-cart" style="color:#10b981;"></i>';
    else if (l.action.includes('PLAYER')) icon = '<i class="fas fa-gamepad" style="color:#f59e0b;"></i>';
    else if (l.action.includes('SETTINGS')) icon = '<i class="fas fa-cog" style="color:#3b82f6;"></i>';
    
    return `
      <div style="display:flex; align-items:center; gap:12px; font-size:0.85rem; border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:8px;">
        <div style="width:28px; height:28px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center;">${icon}</div>
        <div style="flex:1;">
          <div style="font-weight:700; color:var(--text-dark);">${l.message || l.details}</div>
          <div style="font-size:0.75rem; color:var(--text-gray); font-family:Montserrat,sans-serif;">${dateStr}</div>
        </div>
      </div>`;
  }).join('');
}

function exportOrdersToCSV() {
  if (!adminActiveOrders || adminActiveOrders.length === 0) {
    alert("لا توجد طلبات لتصديرها حالياً.");
    return;
  }
  
  const headers = ["رقم الطلب", "العميل", "الخدمة", "المبلغ بالريال", "المنصة", "حساب EA", "الحالة", "التاريخ"];
  const rows = adminActiveOrders.map(o => [
    o.id,
    o.customerName,
    o.service,
    o.priceSAR,
    o.platform || 'N/A',
    o.eaEmail || 'N/A',
    o.status,
    new Date(o.timestamp).toLocaleString('ar-EG')
  ]);
  
  let csvContent = "\ufeff" + headers.join(",") + "\n";
  rows.forEach(r => {
    csvContent += r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `trivela_orders_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Bind to window to allow HTML inline handlers to work seamlessly
window.switchTab = switchTab;
window.switchMainTab = switchMainTab;
window.switchTabWithSub = switchTabWithSub;
window.exportOrdersToCSV = exportOrdersToCSV;
window.toggleMaintenanceModeDirectly = toggleMaintenanceModeDirectly;
window.switchAdminScraperTab = switchAdminScraperTab;
window.scrapePlayerLink = scrapePlayerLink;
window.savePlayerToStore = savePlayerToStore;
window.deletePlayer = deletePlayer;
window.modifyPoints = modifyPoints;
window.editFAQ = editFAQ;
window.deleteFAQ = deleteFAQ;
window.saveFAQ = saveFAQ;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.approveReview = approveReview;
window.saveReview = saveReview;
window.calculateBundlePrices = calculateBundlePrices;

window.setStatsTimeRange = function(days, btn) {
  statsDaysRange = days;
  document.querySelectorAll('.filters-group .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadQuickStats();
  renderDashboardChart();
  renderTopServicesBreakdown();
};

window.toggleResetDropdown = function(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('resetDropdown');
  if (!dropdown) return;
  const isVisible = dropdown.style.display === 'block';
  dropdown.style.display = isVisible ? 'none' : 'block';
};

// Close dropdown when clicking anywhere
document.addEventListener('click', () => {
  const dropdown = document.getElementById('resetDropdown');
  if (dropdown) dropdown.style.display = 'none';
});

window.triggerReset = async function(type, event) {
  event.preventDefault();
  event.stopPropagation();
  
  const dropdown = document.getElementById('resetDropdown');
  if (dropdown) dropdown.style.display = 'none';

  let typeText = '';
  if (type === 'visits') typeText = 'إحصائيات زيارات الموقع';
  else if (type === 'orders') typeText = 'جميع الطلبات والمبيعات';
  else if (type === 'logs') typeText = 'سجل عمليات لوحة التحكم';
  else if (type === 'all') typeText = 'كل بيانات الموقع (زيارات، طلبات، وسجلات)';

  const confirm1 = confirm(`🚨 تحذير هام:\nهل أنت متأكد تماماً أنك تريد مسح وإعادة تعيين (${typeText}) بالكامل؟\nلا يمكن التراجع عن هذه الخطوة.`);
  if (!confirm1) return;

  const code = 'تأكيد الحذف';
  const input = prompt(`🛡️ إجراء أمان:\nلتأكيد المسح النهائي، يرجى كتابة عبارة "${code}" في المربع أدناه:`);
  
  if (input !== code) {
    alert("❌ العبارة المدخلة غير صحيحة. تم إلغاء العملية ولم يتم تعديل أي بيانات.");
    return;
  }

  try {
    const res = await adminService.resetStoreData(type);
    if (res.success) {
      showStatus("🔄 تم إعادة تعيين البيانات بنجاح!", "success");
      loadQuickStats();
      loadOrdersList();
      loadAdminLogs();
    } else {
      showStatus("فشل إعادة التعيين: " + (res.error || "خطأ مجهول"), "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر: " + err.message, "error");
  }
};

async function loadRanksConfiguration() {
  try {
    const res = await fetch('/api/public/content').then(r => r.json());
    globalChampionsRanks = res.champions_ranks || {};
    globalRivalsRanks = res.rivals_ranks || {};
    
    onChampionsRankChange();
    onRivalsRankChange();
  } catch (e) {
    console.warn("Failed to load ranks configuration:", e);
  }
}

window.saveCoinsRatesDirectly = async function(event) {
  event.preventDefault();
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings) return;
    
    settings.baseRateConsole = parseFloat(document.getElementById('coinsRateConsole').value);
    settings.baseRatePC = parseFloat(document.getElementById('coinsRatePC').value);
    
    await adminService.saveStoreSettings(settings);
    showStatus("✅ تم تحديث أسعار الكوينز وتطبيقها بالمتجر بنجاح!", "success");
    
    // Sync settings-panel inputs
    const settingRateConsole = document.getElementById('settingRateConsole');
    if (settingRateConsole) settingRateConsole.value = settings.baseRateConsole;
    const settingRatePC = document.getElementById('settingRatePC');
    if (settingRatePC) settingRatePC.value = settings.baseRatePC;

    // Refresh dashboard rate labels
    const dashConsole = document.getElementById('dashboardConsoleRate');
    if (dashConsole) dashConsole.textContent = `$${settings.baseRateConsole.toFixed(2)} / 100K`;
    const dashPc = document.getElementById('dashboardPcRate');
    if (dashPc) dashPc.textContent = `$${settings.baseRatePC.toFixed(2)} / 100K`;

    loadQuickStats();
  } catch (err) {
    showStatus("فشل حفظ الأسعار: " + err.message, "error");
  }
};

window.onChampionsRankChange = function() {
  const select = document.getElementById('championsRankSelect');
  const key = select?.value;
  if (!key || !globalChampionsRanks[key]) return;
  
  const rank = globalChampionsRanks[key];
  document.getElementById('champsRankName').value = rank.name || "";
  document.getElementById('champsRankWins').value = rank.wins || "";
  document.getElementById('champsRankPrice').value = rank.priceUSD || 0;
  
  const rewardsArr = rank.rewards || [];
  document.getElementById('champsRankRewards').value = rewardsArr.map(r => r.name).join('\n');
};

window.onRivalsRankChange = function() {
  const select = document.getElementById('rivalsRankSelect');
  const key = select?.value;
  if (!key || !globalRivalsRanks[key]) return;

  const rank = globalRivalsRanks[key];
  document.getElementById('rivalsRankName').value = rank.name || "";
  document.getElementById('rivalsRankWins').value = rank.wins || "";
  document.getElementById('rivalsRankPrice').value = rank.priceUSD || 0;

  const rewardsArr = rank.rewards || [];
  document.getElementById('rivalsRankRewards').value = rewardsArr.map(r => r.name).join('\n');
};

window.saveChampionsRankConfig = async function(event) {
  event.preventDefault();
  const select = document.getElementById('championsRankSelect');
  const key = select?.value;
  if (!key) return;

  const rewardsText = document.getElementById('champsRankRewards').value;
  const rewards = rewardsText.split('\n').map(line => line.trim()).filter(Boolean).map(name => ({
    name,
    icon: name.includes('كوينز') || name.includes('coins') ? 'fas fa-coins' : (name.includes('اختيار') ? 'fas fa-hand-pointer' : 'fas fa-box')
  }));

  globalChampionsRanks[key] = {
    name: document.getElementById('champsRankName').value.trim(),
    wins: document.getElementById('champsRankWins').value.trim(),
    priceUSD: parseFloat(document.getElementById('champsRankPrice').value),
    rewards
  };

  try {
    await adminService.saveChampionsRanks(globalChampionsRanks);
    showStatus("✅ تم حفظ رتبة فوت تشامبيونز وتحديث المتجر!", "success");
  } catch (err) {
    showStatus("فشل الحفظ: " + err.message, "error");
  }
};

window.saveRivalsRankConfig = async function(event) {
  event.preventDefault();
  const select = document.getElementById('rivalsRankSelect');
  const key = select?.value;
  if (!key) return;

  const rewardsText = document.getElementById('rivalsRankRewards').value;
  const rewards = rewardsText.split('\n').map(line => line.trim()).filter(Boolean).map(name => ({
    name,
    icon: name.includes('كوينز') || name.includes('coins') ? 'fas fa-coins' : (name.includes('اختيار') ? 'fas fa-hand-pointer' : 'fas fa-box')
  }));

  globalRivalsRanks[key] = {
    name: document.getElementById('rivalsRankName').value.trim(),
    wins: document.getElementById('rivalsRankWins').value.trim(),
    priceUSD: parseFloat(document.getElementById('rivalsRankPrice').value),
    rewards
  };

  try {
    await adminService.saveRivalsRanks(globalRivalsRanks);
    showStatus("✅ تم حفظ رتبة رايفلز وتحديث المتجر!", "success");
  } catch (err) {
    showStatus("فشل الحفظ: " + err.message, "error");
  }
};

let currentDiscounts = [];

window.renderPricingTiers = function(discounts) {
  currentDiscounts = discounts || [];
  const tbody = document.getElementById('pricingTiersTableBody');
  if (!tbody) return;

  if (currentDiscounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-gray);">لا يوجد أي شرائح سعرية مضافة حالياً.</td></tr>`;
    return;
  }

  const sorted = [...currentDiscounts].sort((a, b) => b.minCoins - a.minCoins);
  tbody.innerHTML = sorted.map((tier) => {
    const isDiscount = tier.percent >= 0;
    const label = isDiscount ? `<span style="color: var(--green-primary); font-weight: 700;">خصم ${tier.percent}% (سعر أرخص)</span>` : `<span style="color: #ef4444; font-weight: 700;">زيادة ${Math.abs(tier.percent)}% (سعر أغلى)</span>`;
    const state = isDiscount ? 'سعر مخفض للكميات الكبيرة' : 'رسوم إضافية للكميات الصغيرة';
    
    return `
      <tr>
        <td style="font-weight: 700; font-family: Montserrat, sans-serif;">${tier.minCoins.toLocaleString()} كوينز</td>
        <td>${label}</td>
        <td style="color: var(--text-gray); font-size: 0.85rem;">${state}</td>
        <td>
          <button class="action-btn cancel-btn" onclick="deletePricingTier(${tier.minCoins})" title="حذف الشريحة" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s;"><i class="fas fa-trash-alt"></i> حذف</button>
        </td>
      </tr>
    `;
  }).join('');
};

window.addPricingTier = async function(event) {
  event.preventDefault();
  const minCoins = parseInt(document.getElementById('tierMinCoins').value, 10);
  const percent = parseFloat(document.getElementById('tierPercent').value);

  if (isNaN(minCoins) || isNaN(percent)) return;

  const existingIndex = currentDiscounts.findIndex(d => d.minCoins === minCoins);
  if (existingIndex !== -1) {
    currentDiscounts[existingIndex].percent = percent;
  } else {
    currentDiscounts.push({ minCoins, percent });
  }

  currentDiscounts.sort((a, b) => b.minCoins - a.minCoins);

  try {
    const settings = await adminService.getStoreSettings();
    settings.discounts = currentDiscounts;
    await adminService.saveStoreSettings(settings);

    renderPricingTiers(currentDiscounts);
    showStatus("✅ تم إضافة/تحديث الشريحة السعرية بنجاح!", "success");

    document.getElementById('tierMinCoins').value = '';
    document.getElementById('tierPercent').value = '';
  } catch (err) {
    showStatus("فشل حفظ الشريحة: " + err.message, "error");
  }
};

window.deletePricingTier = async function(minCoins) {
  const confirmDelete = confirm(`هل أنت متأكد من حذف الشريحة السعرية للكميات من ${minCoins.toLocaleString()} كوينز فما فوق؟`);
  if (!confirmDelete) return;

  currentDiscounts = currentDiscounts.filter(d => d.minCoins !== minCoins);

  try {
    const settings = await adminService.getStoreSettings();
    settings.discounts = currentDiscounts;
    await adminService.saveStoreSettings(settings);

    renderPricingTiers(currentDiscounts);
    showStatus("✅ تم حذف الشريحة السعرية بنجاح!", "success");
  } catch (err) {
    showStatus("فشل حذف الشريحة: " + err.message, "error");
  }
};

window.loadQuickStats = loadQuickStats;
window.loadOrdersList = loadOrdersList;
window.loadAdminLogs = loadAdminLogs;

window.deleteOrder = async function(orderId) {
  const confirmDelete = confirm("⚠️ هل أنت متأكد تماماً من حذف هذا الطلب نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء!");
  if (!confirmDelete) return;

  try {
    const res = await adminService.deleteOrder(orderId);
    if (res.success) {
      showStatus("✅ تم حذف الطلب بنجاح!", "success");
      loadOrdersList();
      loadQuickStats();
      loadAdminLogs();
    } else {
      showStatus(res.error || "فشل حذف الطلب.", "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر: " + err.message, "error");
  }
};

let currentCoachingPackages = [];

window.saveLandingContent = async function(event) {
  event.preventDefault();
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};
    
    settings.content.landing = {
      heroTitle: document.getElementById('c_heroTitle').value.trim(),
      heroSubTitle: document.getElementById('c_heroSubTitle').value.trim(),
      statOrdersCount: document.getElementById('c_statOrdersCount').value.trim(),
      statOrdersLabel: document.getElementById('c_statOrdersLabel').value.trim(),
      statDeliveryTime: document.getElementById('c_statDeliveryTime').value.trim(),
      statDeliveryLabel: document.getElementById('c_statDeliveryLabel').value.trim(),
      statSecurityLabel: document.getElementById('c_statSecurityLabel').value.trim(),
      guaranteeTitle: document.getElementById('c_guaranteeTitle').value.trim(),
      guaranteeSubTitle: document.getElementById('c_guaranteeSubTitle').value.trim(),
      platformTitle: document.getElementById('c_platformTitle').value.trim(),
      platformSubTitle: document.getElementById('c_platformSubTitle').value.trim(),
      catalogTitle: document.getElementById('c_catalogTitle').value.trim(),
      featuresTitle: document.getElementById('c_featuresTitle').value.trim(),
      featuresSubTitle: document.getElementById('c_featuresSubTitle').value.trim(),
      howSectionTitle: document.getElementById('c_howSectionTitle').value.trim(),
      howSectionSubTitle: document.getElementById('c_howSectionSubTitle').value.trim(),
      landingStep1Title: document.getElementById('c_landingStep1Title').value.trim(),
      landingStep1Desc: document.getElementById('c_landingStep1Desc').value.trim(),
      landingStep2Title: document.getElementById('c_landingStep2Title').value.trim(),
      landingStep2Desc: document.getElementById('c_landingStep2Desc').value.trim(),
      landingStep3Title: document.getElementById('c_landingStep3Title').value.trim(),
      landingStep3Desc: document.getElementById('c_landingStep3Desc').value.trim(),
      landingStepsBottomNote: document.getElementById('c_landingStepsBottomNote').value.trim()
    };

    await adminService.saveStoreContent(settings.content);
    showStatus("✅ تم حفظ محتوى الصفحة الرئيسية وتحديث المتجر!", "success");
  } catch (err) {
    showStatus("فشل حفظ محتوى الصفحة الرئيسية: " + err.message, "error");
  }
};

window.saveCoinsContent = async function(event) {
  event.preventDefault();
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};

    settings.content.coinsPage = {
      title: document.getElementById('c_coinsTitle').value.trim(),
      desc: document.getElementById('c_coinsDesc').value.trim(),
      step1Title: document.getElementById('c_coinsStep1Title').value.trim(),
      step1Desc: document.getElementById('c_coinsStep1Desc').value.trim(),
      step2Title: document.getElementById('c_coinsStep2Title').value.trim(),
      step2Desc: document.getElementById('c_coinsStep2Desc').value.trim(),
      step3Title: document.getElementById('c_coinsStep3Title').value.trim(),
      step3Desc: document.getElementById('c_coinsStep3Desc').value.trim()
    };

    await adminService.saveStoreContent(settings.content);
    showStatus("✅ تم حفظ محتوى صفحة الكوينز وتحديث المتجر!", "success");
  } catch (err) {
    showStatus("فشل حفظ محتوى صفحة الكوينز: " + err.message, "error");
  }
};

window.saveServicesContent = async function(event) {
  event.preventDefault();
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};

    settings.content.championsPage = {
      title: document.getElementById('c_championsTitle').value.trim(),
      desc: document.getElementById('c_championsDesc').value.trim(),
      hint: document.getElementById('c_championsHint').value.trim()
    };

    settings.content.rivalsPage = {
      title: document.getElementById('c_rivalsTitle').value.trim(),
      desc: document.getElementById('c_rivalsDesc').value.trim(),
      hint: document.getElementById('c_rivalsHint').value.trim()
    };

    settings.content.objectivesPage = {
      title: document.getElementById('c_objectivesTitle').value.trim(),
      desc: document.getElementById('c_objectivesDesc').value.trim(),
      hint: document.getElementById('c_objectivesHint').value.trim()
    };

    settings.content.sbcPage = {
      title: document.getElementById('c_sbcTitle').value.trim(),
      desc: document.getElementById('c_sbcDesc').value.trim(),
      hint: document.getElementById('c_sbcHint').value.trim()
    };

    settings.content.coachingPage = {
      title: document.getElementById('c_coachingPageTitle').value.trim(),
      desc: document.getElementById('c_coachingPageDesc').value.trim(),
      hint: document.getElementById('c_coachingPageHint').value.trim()
    };

    settings.content.packagesPage = {
      title: document.getElementById('c_packagesTitle').value.trim(),
      desc: document.getElementById('c_packagesDesc').value.trim(),
      hint: document.getElementById('c_packagesHint').value.trim()
    };

    await adminService.saveStoreContent(settings.content);
    showStatus("✅ تم حفظ محتوى صفحات الخدمات بنجاح!", "success");
  } catch (err) {
    showStatus("فشل حفظ محتوى صفحات الخدمات: " + err.message, "error");
  }
};

window.renderCoachingPackages = function(packages) {
  currentCoachingPackages = packages || [];
  const tbody = document.getElementById('coachingPackagesTableBody');
  if (!tbody) return;

  if (currentCoachingPackages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-gray); padding: 24px;">لا يوجد أي باقات استشارات مضافة.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentCoachingPackages.map(pkg => {
    const featuresList = (pkg.features || []).map(f => `• ${f}`).join('<br>');
    return `
      <tr style="border-bottom: 1px solid var(--border-color); height: 42px;">
        <td style="font-weight: 700; font-family: Cairo, sans-serif; color: var(--text-dark);">${pkg.name}</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: var(--gold-primary); text-align: left;">${pkg.priceSAR} ر.س</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: #10b981; text-align: left;">$${pkg.priceUSD}</td>
        <td style="color: var(--text-gray); font-size: 0.85rem; line-height: 1.5;">${featuresList}</td>
        <td style="white-space: nowrap;">
          <button class="admin-btn" onclick="window.editCoachingPackage('${pkg.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-edit"></i> تعديل</button>
          <button class="admin-btn" onclick="window.deleteCoachingPackage('${pkg.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-trash-alt"></i> حذف</button>
        </td>
      </tr>
    `;
  }).join('');
};

window.editCoachingPackage = function(packageId) {
  const pkg = currentCoachingPackages.find(p => p.id === packageId);
  if (!pkg) return;

  document.getElementById('editCoachingId').value = pkg.id;
  document.getElementById('editCoachingName').value = pkg.name;
  document.getElementById('editCoachingDesc').value = pkg.description || "";
  document.getElementById('editCoachingPriceSAR').value = pkg.priceSAR;
  document.getElementById('editCoachingPriceUSD').value = pkg.priceUSD;
  document.getElementById('editCoachingFeatures').value = (pkg.features || []).join('\n');

  const container = document.getElementById('editCoachingPackageFormContainer');
  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }

  const formTitle = document.getElementById('coachingFormTitle');
  if (formTitle) formTitle.textContent = "تعديل تفاصيل باقة الاستشارة";
};

window.addNewCoachingPackage = function() {
  document.getElementById('editCoachingId').value = "coaching_" + Date.now();
  document.getElementById('editCoachingName').value = "";
  document.getElementById('editCoachingDesc').value = "";
  document.getElementById('editCoachingPriceSAR').value = 0;
  document.getElementById('editCoachingPriceUSD').value = 0;
  document.getElementById('editCoachingFeatures').value = "";

  const container = document.getElementById('editCoachingPackageFormContainer');
  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }

  const formTitle = document.getElementById('coachingFormTitle');
  if (formTitle) formTitle.textContent = "إضافة باقة استشارية جديدة";
};

window.deleteCoachingPackage = async function(packageId) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الباقة الاستشارية؟")) return;
  currentCoachingPackages = currentCoachingPackages.filter(p => p.id !== packageId);
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};
    settings.content.coaching = currentCoachingPackages;
    await adminService.saveStoreContent(settings.content);

    window.renderCoachingPackages(currentCoachingPackages);
    window.cancelEditCoachingPackage();
    showStatus("✅ تم حذف باقة التدريب بنجاح!", "success");
  } catch (err) {
    showStatus("فشل حذف الباقة التدريبية: " + err.message, "error");
  }
};

window.cancelEditCoachingPackage = function() {
  const container = document.getElementById('editCoachingPackageFormContainer');
  if (container) container.style.display = 'none';
};

window.saveCoachingPackageConfig = async function(event) {
  event.preventDefault();
  const id = document.getElementById('editCoachingId').value;
  const name = document.getElementById('editCoachingName').value.trim();
  const description = document.getElementById('editCoachingDesc').value.trim();
  const priceSAR = parseInt(document.getElementById('editCoachingPriceSAR').value, 10);
  const priceUSD = parseFloat(document.getElementById('editCoachingPriceUSD').value);
  const featuresText = document.getElementById('editCoachingFeatures').value;
  const features = featuresText.split('\n').map(line => line.trim()).filter(Boolean);

  const idx = currentCoachingPackages.findIndex(p => p.id === id);
  if (idx !== -1) {
    currentCoachingPackages[idx] = {
      ...currentCoachingPackages[idx],
      name,
      description,
      priceSAR,
      priceUSD,
      features
    };
  } else {
    currentCoachingPackages.push({
      id,
      name,
      description,
      priceSAR,
      priceUSD,
      features,
      image: "logo-official.png",
      category: "coaching"
    });
  }

  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};
    settings.content.coaching = currentCoachingPackages;
    await adminService.saveStoreContent(settings.content);

    window.renderCoachingPackages(currentCoachingPackages);
    window.cancelEditCoachingPackage();
    showStatus("✅ تم حفظ باقة التدريب بنجاح!", "success");
  } catch (err) {
    showStatus("فشل حفظ الباقة التدريبية: " + err.message, "error");
  }
};

// ==========================================
// COUPON MANAGEMENT SYSTEM
// ==========================================
let adminCoupons = [];

async function loadCouponsList() {
  try {
    const coupons = await adminService.getCoupons();
    adminCoupons = coupons || [];
    window.renderCoupons(adminCoupons);
  } catch (err) {
    console.error("Error loading coupons list:", err);
  }
}
window.loadCouponsList = loadCouponsList;

window.renderCoupons = function(coupons) {
  adminCoupons = coupons || [];
  const tbody = document.getElementById('couponsTableBody');
  if (!tbody) return;

  if (adminCoupons.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-gray); padding: 24px;">لا يوجد أي كوبونات خصم مضافة حالياً.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminCoupons.map(c => {
    const usageText = `${c.usedCount || 0} / ${c.maxUses || 999}`;
    const percentText = `${c.percent}%`;
    const expiryText = c.expiryDate || "—";
    
    const isExpired = new Date(c.expiryDate) < new Date();
    const isLimitReached = (c.usedCount || 0) >= (c.maxUses || 999);
    
    let statusStyle = "";
    if (isExpired || isLimitReached) {
      statusStyle = "color: #ef4444; font-weight: bold; text-decoration: line-through;";
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-color); height: 42px; ${statusStyle}">
        <td style="font-weight: 800; font-family: Montserrat, sans-serif; color: var(--text-dark);">${c.code}</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: #a855f7; text-align: left;">${percentText}</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: var(--text-gray); text-align: left;">${usageText}</td>
        <td style="font-family: Montserrat, sans-serif; font-weight: 700; color: var(--text-dark); text-align: left;">${expiryText}</td>
        <td style="white-space: nowrap;">
          <button class="admin-btn" onclick="window.editCoupon('${c.code}')" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-edit"></i> تعديل</button>
          <button class="admin-btn" onclick="window.deleteCoupon('${c.code}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-family: Cairo; margin: 2px;"><i class="fas fa-trash-alt"></i> حذف</button>
        </td>
      </tr>
    `;
  }).join('');
};

window.addNewCoupon = function() {
  document.getElementById('editCouponIsNew').value = "true";
  document.getElementById('editCouponCode').value = "";
  document.getElementById('editCouponCode').disabled = false;
  document.getElementById('editCouponPercent').value = 10;
  document.getElementById('editCouponMaxUses').value = 100;
  
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  document.getElementById('editCouponExpiryDate').value = nextYear.toISOString().split('T')[0];

  const container = document.getElementById('editCouponFormContainer');
  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }

  const formTitle = document.getElementById('couponFormTitle');
  if (formTitle) formTitle.textContent = "إنشاء كوبون خصم جديد";
};

window.editCoupon = function(code) {
  const c = adminCoupons.find(coupon => coupon.code === code);
  if (!c) return;

  document.getElementById('editCouponIsNew').value = "false";
  document.getElementById('editCouponCode').value = c.code;
  document.getElementById('editCouponCode').disabled = true;
  document.getElementById('editCouponPercent').value = c.percent;
  document.getElementById('editCouponMaxUses').value = c.maxUses || 100;
  document.getElementById('editCouponExpiryDate').value = c.expiryDate || "";

  const container = document.getElementById('editCouponFormContainer');
  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }

  const formTitle = document.getElementById('couponFormTitle');
  if (formTitle) formTitle.textContent = "تعديل كوبون الخصم";
};

window.cancelEditCoupon = function() {
  const container = document.getElementById('editCouponFormContainer');
  if (container) container.style.display = 'none';
};

window.saveCouponConfig = async function(event) {
  event.preventDefault();
  const isNew = document.getElementById('editCouponIsNew').value === "true";
  const code = document.getElementById('editCouponCode').value.toUpperCase().trim();
  const percent = parseFloat(document.getElementById('editCouponPercent').value);
  const maxUses = parseInt(document.getElementById('editCouponMaxUses').value, 10);
  const expiryDate = document.getElementById('editCouponExpiryDate').value;

  if (!code) {
    showStatus("يرجى إدخال رمز الكوبون بشكل صحيح.", "error");
    return;
  }

  let usedCount = 0;
  if (!isNew) {
    const existing = adminCoupons.find(c => c.code === code);
    if (existing) usedCount = existing.usedCount || 0;
  }

  const couponPayload = {
    code,
    percent,
    maxUses,
    usedCount,
    expiryDate
  };

  try {
    const res = await adminService.saveCoupon(couponPayload);
    if (res.success) {
      adminCoupons = res.coupons;
      window.renderCoupons(adminCoupons);
      window.cancelEditCoupon();
      showStatus("✅ تم حفظ الكوبون بنجاح!", "success");
    }
  } catch (err) {
    showStatus("فشل حفظ الكوبون: " + err.message, "error");
  }
};

window.deleteCoupon = async function(code) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف الكوبون التسويقي "${code}"؟`)) return;
  try {
    const res = await adminService.deleteCoupon(code);
    if (res.success) {
      adminCoupons = res.coupons;
      window.renderCoupons(adminCoupons);
      window.cancelEditCoupon();
      showStatus("✅ تم حذف الكوبون بنجاح!", "success");
    }
  } catch (err) {
    showStatus("فشل حذف الكوبون: " + err.message, "error");
  }
};

// ==========================================
// INTERACTIVE ORDERS & SALES ANALYTICS PANEL
// ==========================================
let analyticsTimeRange = '7d';
let chartDailySalesInstance = null;
let chartPlatformShareInstance = null;
let chartServicesShareInstance = null;
let chartRevenueProfitTimelineInstance = null;
let chartOrderStatusFunnelInstance = null;
let chartCurrencyDistributionInstance = null;
let chartPopularCoinsInstance = null;
let chartCancellationTrendInstance = null;
let chartNetProfitTimelineInstance = null;
let chartExpensesBreakdownInstance = null;
let chartRevenueVsCostsInstance = null;

// Expose filtering handler to window
window.filterAnalyticsTimeRange = function(range, element) {
  analyticsTimeRange = range;
  
  // Highlight active button style
  const container = document.querySelector('.analytics-filter-btns');
  if (container) {
    const btns = container.querySelectorAll('.admin-btn');
    btns.forEach(btn => {
      btn.classList.remove('admin-btn-success');
      btn.style.background = 'rgba(48,83,136,0.06)';
      btn.style.color = 'var(--blue-500)';
    });
  }
  if (element) {
    element.classList.add('admin-btn-success');
    element.style.background = '';
    element.style.color = '';
  }

  // Regenerate charts and metrics
  if (adminActiveOrders && adminActiveOrders.length > 0) {
    window.initOrdersAnalytics(adminActiveOrders);
  }
};

window.initOrdersAnalytics = function(orders) {
  if (!orders || orders.length === 0) return;

  const now = new Date();
  let filterDate = new Date();

  if (analyticsTimeRange === '7d') {
    filterDate.setDate(now.getDate() - 7);
    document.getElementById('analytics-date-range-lbl').textContent = `الفترة: من ${filterDate.toLocaleDateString('ar-EG')} إلى اليوم`;
  } else if (analyticsTimeRange === '30d') {
    filterDate.setDate(now.getDate() - 30);
    document.getElementById('analytics-date-range-lbl').textContent = `الفترة: من ${filterDate.toLocaleDateString('ar-EG')} إلى اليوم`;
  } else {
    document.getElementById('analytics-date-range-lbl').textContent = 'الفترة: كافة الأوقات المسجلة';
  }

  // Filter orders by time range
  const filteredOrders = orders.filter(o => {
    if (analyticsTimeRange === 'all') return true;
    const orderDate = new Date(o.timestamp || o.createdAt);
    return orderDate >= filterDate;
  });

  // Calculate Metrics
  let totalSalesSAR = 0;
  let totalSalesUSD = 0;
  let totalCostSAR = 0;
  let totalCostUSD = 0;
  let completedCount = 0;
  let activeCount = 0;

  filteredOrders.forEach(o => {
    // Note: server maps all price and cost fields to USD in /api/admin/orders
    const priceUSD = o.priceSAR || 0;
    
    // Total revenue regardless of status (exclude cancelled)
    if (o.status !== 'cancelled') {
      totalSalesUSD += priceUSD;
    }

    if (o.status === 'completed') {
      completedCount++;
      const costUSD = o.supplierCost || 0;
      totalCostUSD += costUSD;
    } else if (o.status === 'pending' || o.status === 'paid' || o.status === 'in_progress') {
      activeCount++;
    }
  });

  const totalCount = filteredOrders.length;
  const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const avgOrderValueUSD = completedCount > 0 ? (totalSalesUSD / completedCount) : (totalCount > 0 ? totalSalesUSD / totalCount : 0);
  const netProfitUSD = totalSalesUSD - totalCostUSD;

  // Update UI Elements
  const elTotalSalesUSD = document.getElementById('an-total-sales-usd');
  if (elTotalSalesUSD) elTotalSalesUSD.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalSalesUSD);
  
  const elTotalCostUSD = document.getElementById('an-total-cost-usd');
  if (elTotalCostUSD) elTotalCostUSD.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCostUSD);
  
  const elNetProfitUSD = document.getElementById('an-net-profit-usd');
  if (elNetProfitUSD) elNetProfitUSD.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(netProfitUSD);

  const elTotalOrders = document.getElementById('an-total-orders');
  if (elTotalOrders) elTotalOrders.textContent = totalCount.toLocaleString();

  const elCompletedPct = document.getElementById('an-completed-orders-pct');
  if (elCompletedPct) elCompletedPct.textContent = `${completedPct}% من الطلبات مكتملة (${completedCount} طلب)`;

  const elAvgValue = document.getElementById('an-avg-order-value');
  if (elAvgValue) elAvgValue.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgOrderValueUSD);

  const elActiveCount = document.getElementById('an-active-orders-lbl');
  if (elActiveCount) elActiveCount.textContent = `${activeCount} طلبات قيد التنفيذ/معلقة`;

  // ── Compute average fulfillment speed ──
  let totalFulfillMs = 0;
  let completedWithTime = 0;
  filteredOrders.forEach(o => {
    if (o.status === 'completed' && o.completedAt) {
      const start = new Date(o.timestamp || o.createdAt);
      const end = new Date(o.completedAt);
      const diff = end - start;
      if (diff > 0) {
        totalFulfillMs += diff;
        completedWithTime++;
      }
    }
  });
  const avgFulfillHours = completedWithTime > 0 ? (totalFulfillMs / (1000 * 60 * 60) / completedWithTime).toFixed(1) : '0.0';
  const elAvgFulfill = document.getElementById('an-avg-fulfill-speed');
  if (elAvgFulfill) elAvgFulfill.textContent = avgFulfillHours + ' س';

  // ── Compute cancellation rate ──
  const cancelledCount = filteredOrders.filter(o => o.status === 'cancelled').length;
  const cancelRate = totalCount > 0 ? ((cancelledCount / totalCount) * 100).toFixed(1) : '0.0';
  const elCancelRate = document.getElementById('an-cancel-rate');
  if (elCancelRate) elCancelRate.textContent = cancelRate + '%';
  const elCancelCount = document.getElementById('an-cancel-count');
  if (elCancelCount) elCancelCount.textContent = `${cancelledCount} طلب ملغي بالفترة`;

  // Draw Charts
  drawDailySalesChart(filteredOrders);
  drawPlatformShareChart(filteredOrders);
  drawServicesShareChart(filteredOrders);
  drawRevenueProfitTimelineChart(filteredOrders);
  populatePlatformPerformance(filteredOrders);
  populateTopServicesTable(filteredOrders);
  drawOrderStatusFunnelChart(filteredOrders);
  populateTopVIPCustomers(filteredOrders);

  // New Batch 2 Charts and Tables
  drawCurrencyDistributionChart(filteredOrders);
  drawPopularCoinsChart(filteredOrders);
  populateFulfillmentSpeedTable(filteredOrders);
  drawCancellationTrendChart(filteredOrders);
  populateOrdersHeatmap(filteredOrders);

  // Initialize weekly report using full unfiltered orders
  window.initWeeklyReport(orders);
};

function drawDailySalesChart(orders) {
  // Aggregate sales by date
  const salesByDate = {};
  
  // Initialize date list based on selected range
  const daysToLoad = analyticsTimeRange === '7d' ? 7 : (analyticsTimeRange === '30d' ? 30 : 0);
  
  if (daysToLoad > 0) {
    for (let i = daysToLoad - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      salesByDate[dateKey] = 0;
    }
  }

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const priceSAR = o.priceSAR || (o.priceUSD ? o.priceUSD * 3.75 : 0);
    const dateObj = new Date(o.timestamp || o.createdAt);
    const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (daysToLoad > 0) {
      if (salesByDate[dateKey] !== undefined) {
        salesByDate[dateKey] += priceSAR;
      }
    } else {
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + priceSAR;
    }
  });

  const labels = Object.keys(salesByDate);
  const data = Object.values(salesByDate);

  const ctx = document.getElementById('chartDailySales');
  if (!ctx) return;

  if (chartDailySalesInstance) {
    chartDailySalesInstance.destroy();
  }

  chartDailySalesInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'المبيعات اليومية (ر.س)',
        data: data,
        borderColor: '#305388',
        backgroundColor: 'rgba(48, 83, 136, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#ca8a04',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: 'Cairo' },
            callback: value => value + ' ر.س'
          }
        },
        x: {
          ticks: { font: { family: 'Cairo' } }
        }
      }
    }
  });
}

function drawPlatformShareChart(orders) {
  let consoleCount = 0;
  let pcCount = 0;

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const plat = (o.platform || 'console').toLowerCase();
    if (plat === 'pc') {
      pcCount++;
    } else {
      consoleCount++;
    }
  });

  const ctx = document.getElementById('chartPlatformShare');
  if (!ctx) return;

  if (chartPlatformShareInstance) {
    chartPlatformShareInstance.destroy();
  }

  chartPlatformShareInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['كونسول (PS/Xbox)', 'كمبيوتر شخصي (PC)'],
      datasets: [{
        data: [consoleCount, pcCount],
        backgroundColor: ['#305388', '#ca8a04'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Cairo', weight: 'bold' } }
        }
      }
    }
  });
}

function drawServicesShareChart(orders) {
  const serviceCounts = {
    coins: 0,
    sbc: 0,
    rivals: 0,
    champions: 0,
    coaching: 0,
    packages: 0,
    objectives: 0
  };

  const serviceNames = {
    coins: 'شحن كوينز',
    sbc: 'تحديات SBC',
    rivals: 'Division Rivals',
    champions: 'شامبيونز',
    coaching: 'تدريب واستشارات',
    packages: 'الباقات المميزة',
    objectives: 'إنجاز مهام'
  };

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    
    let type = (o.type || o.category || '').toLowerCase();
    if (!type && o.service) {
      const name = o.service.toLowerCase();
      if (name.includes('شحن كوينز') || name.includes('coins') || name.includes('شحن الكوينز') || name.includes('مليون')) type = 'coins';
      else if (name.includes('sbc') || name.includes('تحدي') || name.includes('بناء التشكيل')) type = 'sbc';
      else if (name.includes('رايفلز') || name.includes('rivals')) type = 'rivals';
      else if (name.includes('فوت') || name.includes('champions') || name.includes('شامبيونز') || name.includes('ويكند')) type = 'champions';
      else if (name.includes('تدريب') || name.includes('coaching') || name.includes('استشاره') || name.includes('استشارة')) type = 'coaching';
      else if (name.includes('باقة') || name.includes('packages') || name.includes('باقات')) type = 'packages';
      else if (name.includes('مهام') || name.includes('objectives') || name.includes('إنجاز') || name.includes('انجاز')) type = 'objectives';
    }
    if (!type) type = 'coins';

    if (serviceCounts[type] !== undefined) {
      serviceCounts[type]++;
    } else {
      serviceCounts.coins++;
    }
  });

  const labels = Object.keys(serviceCounts).map(k => serviceNames[k]);
  const data = Object.values(serviceCounts);

  const ctx = document.getElementById('chartServicesShare');
  if (!ctx) return;

  if (chartServicesShareInstance) {
    chartServicesShareInstance.destroy();
  }

  chartServicesShareInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: '#10b981',
        borderRadius: 6,
        barThickness: 18
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { family: 'Cairo' }, stepSize: 1 }
        },
        x: {
          ticks: { font: { family: 'Cairo', size: 10 } }
        }
      }
    }
  });
}

// ============================================================================
// ── ADVANCED ADMIN MODULES (EXPENSES, TRAFFIC ANALYTICS, CHIME ALERT, CSV EXPORT) ──
// ============================================================================

// 1. Chime Synthesizer Chime
function playChimeAlert() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // Beautiful FIFA-like slide chime: E5 decaying into A5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
    osc.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (err) {
    console.warn("Audio chime syntax ignored/prevented by browser security or error:", err);
  }
}

// 2. Background Polling for New Orders
function startOrdersAlertPolling() {
  setInterval(async () => {
    try {
      const orders = await adminService.getOrdersList();
      if (!orders) return;
      
      if (lastOrdersCount === null) {
        lastOrdersCount = orders.length;
        return;
      }
      
      if (orders.length > lastOrdersCount) {
        // Look for any pending/paid orders in the new items
        const newOrders = orders.slice(0, orders.length - lastOrdersCount);
        const hasAlert = newOrders.some(o => o.status === 'pending' || o.status === 'paid');
        
        if (hasAlert) {
          playChimeAlert();
          showStatus("🔔 تنبيه: تم استقبال طلب جديد في النظام!", "success");
          
          // Force update local cache and redraw UI if on appropriate panels
          adminActiveOrders = orders;
          const activePanel = localStorage.getItem('adminActivePanel');
          if (activePanel === 'orders-panel') {
            renderOrdersList(orders);
          } else if (activePanel === 'orders-analytics-panel') {
            if (window.initOrdersAnalytics) window.initOrdersAnalytics(orders);
          }
        }
        lastOrdersCount = orders.length;
      }
    } catch (e) {
      console.warn("Alert Polling check failed:", e);
    }
  }, 12000); // Check every 12 seconds
}

// 3. Load & Render Expenses List
async function loadExpensesList() {
  try {
    const expenses = await adminService.getExpenses();
    adminExpenses = expenses;
    renderExpensesList(expenses);
    if (adminActiveOrders && adminActiveOrders.length > 0) {
      window.initProfitDashboard(adminActiveOrders, expenses);
    }
  } catch (err) {
    console.error("Error loading expenses list:", err);
  }
}

function renderExpensesList(expenses) {
  const tbody = document.getElementById('expensesTableBody');
  if (!tbody) return;

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: var(--text-gray);">
          <i class="fas fa-receipt" style="font-size: 1.5rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
          لا توجد أي مصروفات إدارية مسجلة حالياً
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = expenses.map(e => {
    const dateStr = new Date(e.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    const categoryLabels = {
      hosting: "سيرفرات واستضافة",
      marketing: "تسويق وإعلانات",
      salaries: "رواتب وعمولات",
      other: "مصاريف أخرى"
    };
    const cat = categoryLabels[e.category] || "أخرى";
    
    return `
      <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
        <td style="padding: 12px 8px; font-family: Cairo, sans-serif; font-weight: 600; color: var(--text-gray);">${dateStr}</td>
        <td style="padding: 12px 8px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${e.title}</td>
        <td style="padding: 12px 8px;">
          <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: rgba(48,83,136,0.08); color: var(--blue-500); font-family: Cairo, sans-serif;">${cat}</span>
        </td>
        <td style="padding: 12px 8px; font-family: Montserrat, sans-serif; font-weight: 800; color: #ef4444;">$${e.amountUSD.toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: left;">
          <button onclick="deleteExpenseItem('${e.id}')" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-family: Cairo, sans-serif; cursor: pointer; transition: all 0.2s;">
            <i class="fas fa-trash-alt"></i> حذف
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. Handle Add Expense Submit Form
async function handleAddExpenseSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('expTitle').value;
  const amountUSD = parseFloat(document.getElementById('expAmountUSD').value);
  const category = document.getElementById('expCategory').value;
  
  if (!title || isNaN(amountUSD) || amountUSD <= 0) {
    showStatus("الرجاء إدخال بيانات صحيحة للمصروف", "error");
    return;
  }

  try {
    const res = await adminService.addExpense({ title, amountUSD, category });
    if (res.success) {
      showStatus("✅ تم إضافة وحفظ المصروف بنجاح", "success");
      document.getElementById('addExpenseForm').reset();
      
      // Reload expenses lists
      loadExpensesList();
      loadQuickStats();
    }
  } catch (err) {
    showStatus("خطأ في إضافة المصروف الإداري.", "error");
  }
}

// 5. Delete Expense Item
window.deleteExpenseItem = async function(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;

  try {
    const res = await adminService.deleteExpense(id);
    if (res.success) {
      showStatus("✅ تم حذف المصروف الإداري بنجاح", "success");
      loadExpensesList();
      loadQuickStats();
    }
  } catch (err) {
    showStatus("خطأ في حذف المصروف.", "error");
  }
};

// 6. Draw Profit Dashboard
window.initProfitDashboard = function(orders, expenses) {
  let totalSalesUSD = 0;
  let totalCostUSD = 0;

  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    
    totalSalesUSD += (o.priceSAR || 0);
    if (o.status === 'completed') {
      totalCostUSD += (o.supplierCost || 0);
    }
  });

  const totalExpensesUSD = (expenses || []).reduce((sum, e) => sum + (e.amountUSD || 0), 0);
  const trueProfitUSD = totalSalesUSD - totalCostUSD - totalExpensesUSD;

  // Render cards
  const elSales = document.getElementById('pr-total-sales');
  if (elSales) elSales.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalSalesUSD);

  const elCosts = document.getElementById('pr-supplier-costs');
  if (elCosts) elCosts.textContent = '-$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCostUSD);

  const elExpenses = document.getElementById('pr-admin-expenses');
  if (elExpenses) elExpenses.textContent = '-$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalExpensesUSD);

  const elTrueProfit = document.getElementById('pr-true-profit');
  if (elTrueProfit) {
    elTrueProfit.textContent = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(trueProfitUSD);
    const card = elTrueProfit.parentElement;
    if (trueProfitUSD >= 0) {
      card.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
    } else {
      card.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
    }
  }

  // Calculate Net Profit Margin %
  const profitMargin = totalSalesUSD > 0 ? ((trueProfitUSD / totalSalesUSD) * 100).toFixed(1) : '0.0';
  const elMargin = document.getElementById('pr-profit-margin');
  if (elMargin) elMargin.textContent = profitMargin + '%';

  // Draw Charts & Tables
  drawNetProfitTimelineChart(orders, expenses);
  drawExpensesBreakdownChart(expenses);
  drawRevenueVsCostsChart(orders, expenses);
  populateMonthlyFinancialSummary(orders, expenses);
};

// 7. Draw Visitors Analytics charts
window.initVisitorsAnalytics = function(analytics) {
  if (!analytics) return;

  // 1. Total Visits
  const totalVisits = analytics.totalVisits || 0;
  const elTotal = document.getElementById('an-total-visits');
  if (elTotal) elTotal.textContent = totalVisits.toLocaleString();

  // 2. Average Daily Visits
  const dailyVisits = analytics.daily || {};
  const dates = Object.keys(dailyVisits);
  const visitCounts = Object.values(dailyVisits);
  const avgVisits = dates.length > 0 ? Math.round(totalVisits / dates.length) : totalVisits;
  const elAvg = document.getElementById('an-avg-daily-visits');
  if (elAvg) elAvg.textContent = avgVisits.toLocaleString();

  // 3. Conversion Rate (Completed Orders / Total Visits)
  const completedCount = (adminActiveOrders || []).filter(o => o.status === 'completed').length;
  const conversionRate = totalVisits > 0 ? ((completedCount / totalVisits) * 100).toFixed(1) : '0.0';
  const elConv = document.getElementById('an-conversion-rate');
  if (elConv) elConv.textContent = `${conversionRate}%`;

  // 4. Returning Visitor Rate
  const visitorTypes = analytics.visitorTypes || { new: 0, returning: 0 };
  const totalTypeVisits = (visitorTypes.new || 0) + (visitorTypes.returning || 0);
  const returningRate = totalTypeVisits > 0 ? ((visitorTypes.returning / totalTypeVisits) * 100).toFixed(1) : '0.0';
  const elReturn = document.getElementById('an-returning-rate');
  if (elReturn) elReturn.textContent = `${returningRate}%`;

  // 5. Line Chart: Daily Traffic
  const ctxDaily = document.getElementById('chartVisitorsDaily');
  if (ctxDaily) {
    const recentDates = dates.slice(-10);
    const recentCounts = visitCounts.slice(-10);

    if (window.chartVisitorsDailyInstance) {
      window.chartVisitorsDailyInstance.destroy();
    }

    window.chartVisitorsDailyInstance = new Chart(ctxDaily, {
      type: 'line',
      data: {
        labels: recentDates,
        datasets: [{
          label: 'الزيارات اليومية',
          data: recentCounts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#305388',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
          x: { ticks: { font: { family: 'Cairo', size: 10 } } }
        }
      }
    });
  }

  // 6. Line Chart: Peak Hours (Hourly Traffic)
  const ctxHours = document.getElementById('chartPeakHours');
  if (ctxHours) {
    const hoursData = analytics.hours || {};
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const hourValues = Array.from({ length: 24 }, (_, i) => hoursData[i] || 0);

    if (window.chartPeakHoursInstance) {
      window.chartPeakHoursInstance.destroy();
    }

    window.chartPeakHoursInstance = new Chart(ctxHours, {
      type: 'line',
      data: {
        labels: hourLabels,
        datasets: [{
          label: 'عدد الزيارات بالساعة',
          data: hourValues,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ca8a04',
          pointBorderColor: '#fff',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
          x: { ticks: { font: { family: 'Cairo', size: 9 } } }
        }
      }
    });
  }

  // 7. Doughnut Chart: Device Share
  const ctxDevice = document.getElementById('chartDeviceShare');
  if (ctxDevice) {
    const devices = analytics.devices || { mobile: 0, desktop: 0, tablet: 0 };
    
    if (window.chartDeviceShareInstance) {
      window.chartDeviceShareInstance.destroy();
    }

    window.chartDeviceShareInstance = new Chart(ctxDevice, {
      type: 'doughnut',
      data: {
        labels: ['جوال (Mobile)', 'كمبيوتر (Desktop)', 'تابلت (Tablet)'],
        datasets: [{
          data: [devices.mobile || 0, devices.desktop || 0, devices.tablet || 0],
          backgroundColor: ['#305388', '#ca8a04', '#ef4444'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } }
          }
        }
      }
    });
  }

  // 8. Doughnut Chart: Traffic Referrers (Sources)
  const ctxSources = document.getElementById('chartTrafficSources');
  if (ctxSources) {
    const refs = analytics.referrers || { direct: 0, google: 0, tiktok: 0, snapchat: 0, instagram: 0, twitter: 0, whatsapp: 0, other: 0 };
    
    if (window.chartTrafficSourcesInstance) {
      window.chartTrafficSourcesInstance.destroy();
    }

    window.chartTrafficSourcesInstance = new Chart(ctxSources, {
      type: 'doughnut',
      data: {
        labels: ['مباشر (Direct)', 'جوجل', 'تيك توك', 'سناب شات', 'إنستغرام', 'تويتر/X', 'واتساب', 'أخرى'],
        datasets: [{
          data: [
            refs.direct || 0,
            refs.google || 0,
            refs.tiktok || 0,
            refs.snapchat || 0,
            refs.instagram || 0,
            refs.twitter || 0,
            refs.whatsapp || 0,
            refs.other || 0
          ],
          backgroundColor: ['#475569', '#3b82f6', '#000000', '#fffc00', '#e1306c', '#1da1f2', '#25d366', '#a855f7'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } }
          }
        }
      }
    });
  }

  // 9. Horizontal Bar Chart: Countries
  const ctxCountries = document.getElementById('chartVisitorCountries');
  if (ctxCountries) {
    const c = analytics.countries || { sa: 0, ae: 0, kw: 0, qa: 0, bh: 0, om: 0, eg: 0, jo: 0, other: 0 };
    
    if (window.chartVisitorCountriesInstance) {
      window.chartVisitorCountriesInstance.destroy();
    }

    window.chartVisitorCountriesInstance = new Chart(ctxCountries, {
      type: 'bar',
      data: {
        labels: ['السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان', 'مصر', 'الأردن', 'أخرى'],
        datasets: [{
          label: 'عدد الزيارات الجغرافية',
          data: [c.sa || 0, c.ae || 0, c.kw || 0, c.qa || 0, c.bh || 0, c.om || 0, c.eg || 0, c.jo || 0, c.other || 0],
          backgroundColor: ['#10b981', '#3b82f6', '#ca8a04', '#ef4444', '#a855f7', '#14b8a6', '#f97316', '#6366f1', '#94a3b8'],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', // Makes it horizontal!
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { font: { family: 'Cairo', size: 9 } } },
          y: { ticks: { font: { family: 'Cairo', size: 10, weight: 'bold' } } }
        }
      }
    });
  }

  // 10. Table: Top Pages Visited
  const pagesBody = document.getElementById('topPagesTableBody');
  if (pagesBody) {
    const p = analytics.pages || { home: 0, coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };
    const pageMapping = [
      { name: "🏠 الصفحة الرئيسية", count: p.home || 0 },
      { name: "🪙 شحن الكوينز (Comfort Trade)", count: p.coins || 0 },
      { name: "🧩 تحديات تشكيل الفريق (SBC)", count: p.sbc || 0 },
      { name: "⚔️ تصنيف رايفلز (Division Rivals)", count: p.rivals || 0 },
      { name: "🏆 فوت شامبيونز (FUT Champions)", count: p.champions || 0 },
      { name: "📅 إنجاز المهام (Objectives)", count: p.objectives || 0 },
      { name: "🎓 التدريب المباشر (Coaching)", count: p.coaching || 0 },
      { name: "📦 حزم وباقات الخدمات (Packages)", count: p.packages || 0 }
    ];

    // Sort descending by count
    pageMapping.sort((x, y) => y.count - x.count);

    pagesBody.innerHTML = pageMapping.map(pg => `
      <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
        <td style="padding: 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${pg.name}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--blue-500); text-align: left;">${pg.count.toLocaleString()} مشاهدة</td>
      </tr>
    `).join('');
  }

  // 11. Table: Service CTA Clicks Funnel
  const clicksBody = document.getElementById('serviceClicksTableBody');
  if (clicksBody) {
    const cl = analytics.clicks || { coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };
    const clicksMapping = [
      { name: "🪙 شحن الكوينز (Comfort Trade)", count: cl.coins || 0 },
      { name: "🧩 تحديات تشكيل الفريق (SBC)", count: cl.sbc || 0 },
      { name: "⚔️ تصنيف رايفلز (Division Rivals)", count: cl.rivals || 0 },
      { name: "🏆 فوت شامبيونز (FUT Champions)", count: cl.champions || 0 },
      { name: "📅 إنجاز المهام (Objectives)", count: cl.objectives || 0 },
      { name: "🎓 التدريب المباشر (Coaching)", count: cl.coaching || 0 },
      { name: "📦 حزم وباقات الخدمات (Packages)", count: cl.packages || 0 }
    ];

    // Sort descending
    clicksMapping.sort((x, y) => y.count - x.count);

    clicksBody.innerHTML = clicksMapping.map(svc => `
      <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
        <td style="padding: 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${svc.name}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #ca8a04; text-align: left;">${svc.count.toLocaleString()} نقرة</td>
      </tr>
    `).join('');
  }
};

// 8. Export Orders Log to CSV file (UTF-8 BOM support)
window.exportOrdersToCSV = function() {
  if (!adminActiveOrders || adminActiveOrders.length === 0) {
    showStatus("لا توجد طلبات لتصديرها", "error");
    return;
  }

  const headers = ["رقم الطلب", "التاريخ", "اسم العميل", "رقم الهاتف", "الخدمة", "المنصة", "القيمة المدفوعة ($)", "تكلفة المورد ($)", "صافي الربح ($)", "حالة الطلب"];
  
  const rows = adminActiveOrders.map(o => {
    const dateStr = new Date(o.timestamp || o.createdAt).toLocaleDateString('ar-EG');
    const statusLabel = {
      pending: "معلق",
      paid: "تم الدفع",
      in_progress: "قيد التنفيذ",
      completed: "مكتمل",
      cancelled: "ملغي"
    }[o.status] || o.status;

    return [
      o.id.substring(6, 14),
      dateStr,
      o.customerName || "غير محدد",
      o.customerPhone || "غير محدد",
      o.service || "شحن كوينز",
      o.platform || "Console",
      o.priceSAR || 0,
      o.supplierCost || 0,
      o.profit || 0,
      statusLabel
    ];
  });

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += headers.join(",") + "\n";
  
  rows.forEach(row => {
    const escapedRow = row.map(val => {
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvContent += escapedRow.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `تقرير_مبيعات_تريفيلا_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showStatus("✅ تم تصدير وتحميل تقرير CSV بنجاح!", "success");
};

// ── Search & Filter triggers ──
window.triggerOrdersFilter = function() {
  renderOrdersList(adminActiveOrders);
};

// ── WhatsApp Status Message Templates ──
window.contactCustomerWhatsAppInProgress = function(orderId) {
  try {
    const order = adminActiveOrders.find(o => String(o.id) === String(orderId));
    if (!order) return alert("لم يتم العثور على بيانات الطلب.");
    let phone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    if (!phone) return alert("رقم الهاتف غير متاح.");
    if (!phone.startsWith('966') && phone.startsWith('05')) phone = '966' + phone.slice(1);
    
    const shortId = order.id.substring(6, 14);
    const msg = `👋 مرحباً بك ${order.customerName}، معك الدعم الفني لمتجر Trivela 🎮\n\n` +
                `⏳ طلبك رقم #${shortId} (${order.service}) أصبح الآن *قيد التنفيذ* من خلال المورد الخاص بنا.\n\n` +
                `⚠️ *تنبيه هام جداً*:\n` +
                `نرجو منك *عدم تسجيل الدخول* إلى حساب EA / Web App / اللعبة نهائياً حتى نبلغك بانتهاء العمل، لضمان سلامة الشحن وتجنب أي تعارض. شكراً لك! 🌟`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  } catch (err) {
    console.error(err);
  }
};

window.contactCustomerWhatsAppCompleted = function(orderId) {
  try {
    const order = adminActiveOrders.find(o => String(o.id) === String(orderId));
    if (!order) return alert("لم يتم العثور على بيانات الطلب.");
    let phone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    if (!phone) return alert("رقم الهاتف غير متاح.");
    if (!phone.startsWith('966') && phone.startsWith('05')) phone = '966' + phone.slice(1);
    
    const shortId = order.id.substring(6, 14);
    const msg = `👋 مرحباً بك ${order.customerName}، معك الدعم الفني لمتجر Trivela 🎮\n\n` +
                `🎉 أبشرك! تم إكمال وشحن طلبك رقم #${shortId} بنجاح وتوصيل الكوينز/المهام لحسابك.\n\n` +
                `🔐 *تنبيه أمني هام للغاية*:\n` +
                `الرجاء الدخول الآن و*تغيير كلمة المرور* لحساب EA / PlayStation الخاص بك فوراً لضمان الأمان التام لبياناتك.\n\n` +
                `❤️ شكراً لثقتك بمتجر تريفيلا، ويسعدنا دائماً خدمتك!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  } catch (err) {
    console.error(err);
  }
};

// ── Copy supplier credential string ──
window.copyOrderSupplierPayload = function(orderId) {
  try {
    const order = adminActiveOrders.find(o => String(o.id) === String(orderId));
    if (!order) return alert("لم يتم العثور على الطلب.");
    
    let text = "";
    if (order.eaEmail) {
      const codes = (order.backupCodes && order.backupCodes.length > 0) 
        ? order.backupCodes 
        : [order.backupCode1, order.backupCode2, order.backupCode3].filter(Boolean);
      text += `EA Email: ${order.eaEmail} | EA Pass: ${order.eaPassword} | Backup Codes: ${codes.join(', ')}`;
    }
    if (order.sonyEmail) {
      if (text) text += "\n";
      const codes = (order.backupCodes && order.backupCodes.length > 0) 
        ? order.backupCodes 
        : [order.sonyBackupCode1 || order.backupCode1, order.sonyBackupCode2 || order.backupCode2, order.sonyBackupCode3 || order.backupCode3].filter(Boolean);
      text += `Sony Email: ${order.sonyEmail} | Sony Pass: ${order.sonyPassword} | Backup Codes: ${codes.join(', ')}`;
    }

    if (!text) {
      alert("لا توجد بيانات حسابات مسجلة لهذا الطلب.");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showStatus("📋 تم نسخ بيانات الحساب للمورد بنجاح!", "success");
    }).catch(err => {
      alert("فشل نسخ النص تلقائياً: " + err.message);
    });
  } catch (err) {
    console.error(err);
  }
};

// ── Edit credentials modal functions ──
window.openEditOrderModal = function(orderId) {
  try {
    const order = adminActiveOrders.find(o => String(o.id) === String(orderId));
    if (!order) return alert("الطلب غير موجود.");

    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editModalTitle').textContent = `تعديل بيانات وملاحظات الطلب #${order.id.substring(6, 14)}`;

    const eaFields = document.getElementById('eaCredsFields');
    const sonyFields = document.getElementById('sonyCredsFields');

    if (order.eaEmail) {
      eaFields.style.display = 'block';
      document.getElementById('editEaEmail').value = order.eaEmail || '';
      document.getElementById('editEaPassword').value = order.eaPassword || '';
    } else {
      eaFields.style.display = 'none';
      document.getElementById('editEaEmail').value = '';
      document.getElementById('editEaPassword').value = '';
    }

    if (order.sonyEmail) {
      sonyFields.style.display = 'block';
      document.getElementById('editSonyEmail').value = order.sonyEmail || '';
      document.getElementById('editSonyPassword').value = order.sonyPassword || '';
    } else {
      sonyFields.style.display = 'none';
      document.getElementById('editSonyEmail').value = '';
      document.getElementById('editSonyPassword').value = '';
    }

    const codes = (order.backupCodes && order.backupCodes.length > 0) 
      ? order.backupCodes 
      : [order.backupCode1 || order.sonyBackupCode1, order.backupCode2 || order.sonyBackupCode2, order.backupCode3 || order.sonyBackupCode3].filter(Boolean);
    document.getElementById('editBackupCodes').value = codes.join(', ');

    document.getElementById('editAdminNotes').value = order.adminNotes || '';

    document.getElementById('editOrderModal').style.display = 'flex';
  } catch (err) {
    console.error(err);
  }
};

window.closeEditOrderModal = function() {
  document.getElementById('editOrderModal').style.display = 'none';
};

async function handleEditOrderDetailsSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('editOrderId').value;
  const eaEmail = document.getElementById('editEaEmail').value;
  const eaPassword = document.getElementById('editEaPassword').value;
  const sonyEmail = document.getElementById('editSonyEmail').value;
  const sonyPassword = document.getElementById('editSonyPassword').value;
  const backupCodesStr = document.getElementById('editBackupCodes').value;
  const adminNotes = document.getElementById('editAdminNotes').value;

  const payload = {
    eaEmail,
    eaPassword,
    sonyEmail,
    sonyPassword,
    backupCodes: backupCodesStr.split(',').map(c => c.trim()).filter(Boolean),
    adminNotes
  };

  try {
    const res = await adminService.updateOrderDetails(id, payload);
    if (res.success) {
      showStatus("✅ تم حفظ التعديلات والملاحظات بنجاح!", "success");
      closeEditOrderModal();
      loadOrdersList();
    } else {
      showStatus("فشل حفظ التعديلات: " + res.error, "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر: " + err.message, "error");
  }
}

// ── Revenue vs Profit Timeline Chart ──
function drawRevenueProfitTimelineChart(orders) {
  const dataMap = {};
  const daysToLoad = analyticsTimeRange === '7d' ? 7 : (analyticsTimeRange === '30d' ? 30 : 0);
  
  if (daysToLoad > 0) {
    for (let i = daysToLoad - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateKey] = { revenue: 0, cost: 0, profit: 0 };
    }
  }

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const dateObj = new Date(o.timestamp || o.createdAt);
    const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const revenue = o.priceSAR || 0;
    const cost = o.status === 'completed' ? (o.supplierCost || 0) : 0;
    const profit = o.status === 'completed' ? (revenue - cost) : 0;

    if (daysToLoad > 0) {
      if (dataMap[dateKey] !== undefined) {
        dataMap[dateKey].revenue += revenue;
        dataMap[dateKey].cost += cost;
        dataMap[dateKey].profit += profit;
      }
    } else {
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { revenue: 0, cost: 0, profit: 0 };
      }
      dataMap[dateKey].revenue += revenue;
      dataMap[dateKey].cost += cost;
      dataMap[dateKey].profit += profit;
    }
  });

  const labels = Object.keys(dataMap);
  const revenues = Object.values(dataMap).map(v => v.revenue);
  const costs = Object.values(dataMap).map(v => v.cost);
  const profits = Object.values(dataMap).map(v => v.profit);

  const ctx = document.getElementById('chartRevenueProfitTimeline');
  if (!ctx) return;

  if (chartRevenueProfitTimelineInstance) {
    chartRevenueProfitTimelineInstance.destroy();
  }

  chartRevenueProfitTimelineInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'الإيرادات ($)',
          data: revenues,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.3
        },
        {
          label: 'تكلفة التوريد ($)',
          data: costs,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.3
        },
        {
          label: 'صافي الربح ($)',
          data: profits,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: 'Cairo' },
            callback: value => '$' + value
          }
        },
        x: {
          ticks: { font: { family: 'Cairo', size: 10 } }
        }
      }
    }
  });
}

// ── Platform Details performance populator ──
function populatePlatformPerformance(orders) {
  let pcOrders = 0, pcRevenue = 0, pcProfit = 0;
  let consoleOrders = 0, consoleRevenue = 0, consoleProfit = 0;

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const plat = (o.platform || 'console').toLowerCase();
    const revenue = o.priceSAR || 0;
    const cost = o.status === 'completed' ? (o.supplierCost || 0) : 0;
    const profit = o.status === 'completed' ? (revenue - cost) : 0;

    if (plat === 'pc') {
      pcOrders++;
      pcRevenue += revenue;
      pcProfit += profit;
    } else {
      consoleOrders++;
      consoleRevenue += revenue;
      consoleProfit += profit;
    }
  });

  const f = val => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const elPcOrders = document.getElementById('an-pc-orders');
  if (elPcOrders) elPcOrders.textContent = pcOrders.toLocaleString();
  const elPcRev = document.getElementById('an-pc-revenue');
  if (elPcRev) elPcRev.textContent = f(pcRevenue);
  const elPcProf = document.getElementById('an-pc-profit');
  if (elPcProf) elPcProf.textContent = f(pcProfit);

  const elConsoleOrders = document.getElementById('an-console-orders');
  if (elConsoleOrders) elConsoleOrders.textContent = consoleOrders.toLocaleString();
  const elConsoleRev = document.getElementById('an-console-revenue');
  if (elConsoleRev) elConsoleRev.textContent = f(consoleRevenue);
  const elConsoleProf = document.getElementById('an-console-profit');
  if (elConsoleProf) elConsoleProf.textContent = f(consoleProfit);
}

// ── Top Services Leaderboard ──
function populateTopServicesTable(orders) {
  const serviceStats = {};

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const svc = o.service || 'شحن كوينز';
    if (!serviceStats[svc]) {
      serviceStats[svc] = { count: 0, revenue: 0, cost: 0, profit: 0 };
    }
    const stats = serviceStats[svc];
    stats.count++;
    stats.revenue += (o.priceSAR || 0);
    if (o.status === 'completed') {
      const cost = o.supplierCost || 0;
      stats.cost += cost;
      stats.profit += ((o.priceSAR || 0) - cost);
    }
  });

  const list = Object.keys(serviceStats).map(name => {
    const s = serviceStats[name];
    const margin = s.revenue > 0 ? ((s.profit / s.revenue) * 100).toFixed(1) : '0.0';
    return { name, ...s, margin };
  });

  list.sort((a, b) => b.profit - a.profit);

  const tbody = document.getElementById('topServicesTableBody');
  if (tbody) {
    const f = val => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    tbody.innerHTML = list.map(item => `
      <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
        <td style="padding: 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${item.name}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--text-gray); text-align: center;">${item.count}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--blue-500); text-align: left;">${f(item.revenue)}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #10b981; text-align: left;">${f(item.profit)}</td>
        <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #ca8a04; text-align: left;">${item.margin}%</td>
      </tr>
    `).join('');
  }
}

// ── Order Status Funnel Chart ──
function drawOrderStatusFunnelChart(orders) {
  const counts = { pending: 0, paid: 0, in_progress: 0, completed: 0, cancelled: 0 };
  orders.forEach(o => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });

  const ctx = document.getElementById('chartOrderStatusFunnel');
  if (!ctx) return;

  if (chartOrderStatusFunnelInstance) {
    chartOrderStatusFunnelInstance.destroy();
  }

  chartOrderStatusFunnelInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['معلق (Pending)', 'مدفوع (Paid)', 'قيد التنفيذ (Active)', 'مكتمل (Completed)', 'ملغي (Cancelled)'],
      datasets: [{
        label: 'عدد الطلبات بالفئة',
        data: [counts.pending, counts.paid, counts.in_progress, counts.completed, counts.cancelled],
        backgroundColor: ['#f97316', '#3b82f6', '#a855f7', '#10b981', '#ef4444'],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { font: { family: 'Cairo', size: 10 } } },
        y: { ticks: { font: { family: 'Cairo', size: 10, weight: 'bold' } } }
      }
    }
  });
}

// ── VIP Customers list ──
function populateTopVIPCustomers(orders) {
  const customerStats = {};

  orders.forEach(o => {
    if (o.status !== 'completed') return;
    const name = o.customerName || 'عميل مجهول';
    if (!customerStats[name]) {
      customerStats[name] = { count: 0, totalSpend: 0 };
    }
    customerStats[name].count++;
    customerStats[name].totalSpend += (o.priceSAR || 0);
  });

  const list = Object.keys(customerStats).map(name => {
    const s = customerStats[name];
    const aov = s.count > 0 ? (s.totalSpend / s.count) : 0;
    return { name, ...s, aov };
  });

  list.sort((a, b) => b.totalSpend - a.totalSpend);

  const tbody = document.getElementById('topVipCustomersTableBody');
  if (tbody) {
    const f = val => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const top10 = list.slice(0, 10);
    
    if (top10.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-gray);padding:20px;">لا يوجد عملاء VIP مكتملون بالفترة المحددة</td></tr>';
    } else {
      tbody.innerHTML = top10.map(item => `
        <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
          <td style="padding: 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${item.name}</td>
          <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--text-gray); text-align: center;">${item.count}</td>
          <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #10b981; text-align: left;">${f(item.totalSpend)}</td>
          <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--blue-500); text-align: left;">${f(item.aov)}</td>
        </tr>
      `).join('');
    }
  }
}

// ── Currency Distribution Chart ──
function drawCurrencyDistributionChart(orders) {
  const counts = {};
  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    let phone = (o.customerPhone || '').replace(/\D/g, '');
    let currency = 'USD';
    
    if (phone.startsWith('966') || phone.startsWith('05') || phone.startsWith('5')) {
      currency = 'SAR';
    } else if (phone.startsWith('971')) {
      currency = 'AED';
    } else if (phone.startsWith('965')) {
      currency = 'KWD';
    } else if (phone.startsWith('973')) {
      currency = 'BHD';
    } else if (phone.startsWith('974')) {
      currency = 'QAR';
    } else if (phone.startsWith('968')) {
      currency = 'OMR';
    } else if (phone.startsWith('962')) {
      currency = 'JOD';
    } else if (phone.startsWith('20')) {
      currency = 'EGP';
    } else {
      const val = o.priceSAR || 0;
      if (val > 25) {
        currency = 'SAR';
      } else {
        currency = 'USD';
      }
    }
    
    counts[currency] = (counts[currency] || 0) + (o.priceSAR || 0);
  });

  const labels = Object.keys(counts).map(c => c === 'SAR' ? 'ريال سعودي (SAR)' : c === 'AED' ? 'درهم إماراتي (AED)' : c === 'KWD' ? 'دينار كويتي (KWD)' : c === 'BHD' ? 'دينار بحريني (BHD)' : c === 'QAR' ? 'ريال قطري (QAR)' : c === 'OMR' ? 'ريال عماني (OMR)' : c === 'JOD' ? 'دينار أردني (JOD)' : c === 'EGP' ? 'جنيه مصري (EGP)' : 'دولار أمريكي (USD)');
  const data = Object.values(counts);

  const ctx = document.getElementById('chartCurrencyDistribution');
  if (!ctx) return;

  if (chartCurrencyDistributionInstance) {
    chartCurrencyDistributionInstance.destroy();
  }

  chartCurrencyDistributionInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#305388', '#ca8a04', '#10b981', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#3b82f6', '#ef4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

// ── Popular Coin Amounts Chart ──
function drawPopularCoinsChart(orders) {
  const categories = {};
  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const svc = o.service || '';
    if (svc.includes('شحن كوينز')) {
      const clean = svc.replace(/,/g, '');
      const match = clean.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        let label = '';
        if (val >= 1000000) {
          label = (val / 1000000) + 'M';
        } else if (val >= 1000) {
          label = (val / 1000) + 'K';
        } else {
          label = val + '';
        }
        categories[label] = (categories[label] || 0) + 1;
      } else {
        categories['أخرى'] = (categories['أخرى'] || 0) + 1;
      }
    }
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  const ctx = document.getElementById('chartPopularCoins');
  if (!ctx) return;

  if (chartPopularCoinsInstance) {
    chartPopularCoinsInstance.destroy();
  }

  chartPopularCoinsInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'عدد الطلبات',
        data: data,
        backgroundColor: '#ca8a04',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
        x: { ticks: { font: { family: 'Cairo', size: 10, weight: 'bold' } } }
      }
    }
  });
}

// ── Fulfillment Speed by Service Table ──
function populateFulfillmentSpeedTable(orders) {
  const stats = {};
  orders.forEach(o => {
    if (o.status !== 'completed' || !o.completedAt) return;
    const svc = o.service || 'شحن كوينز';
    const start = new Date(o.timestamp || o.createdAt);
    const end = new Date(o.completedAt);
    const diff = end - start;
    if (diff > 0) {
      if (!stats[svc]) stats[svc] = { count: 0, totalMs: 0 };
      stats[svc].count++;
      stats[svc].totalMs += diff;
    }
  });

  const list = Object.keys(stats).map(name => {
    const avgHours = (stats[name].totalMs / (1000 * 60 * 60) / stats[name].count).toFixed(1);
    return { name, count: stats[name].count, avgHours: parseFloat(avgHours) };
  });

  list.sort((a, b) => b.count - a.count);

  const tbody = document.getElementById('fulfillmentSpeedTableBody');
  if (tbody) {
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-gray);padding:20px;">لا يوجد طلبات مكتملة بالفترة المحددة</td></tr>';
    } else {
      tbody.innerHTML = list.map(item => `
        <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
          <td style="padding: 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${item.name}</td>
          <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--text-gray); text-align: center;">${item.count}</td>
          <td style="padding: 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #8b5cf6; text-align: left;">${item.avgHours} ساعة</td>
        </tr>
      `).join('');
    }
  }
}

// ── Cancellation Trend Chart ──
function drawCancellationTrendChart(orders) {
  const trend = {};
  const daysToLoad = analyticsTimeRange === '7d' ? 7 : (analyticsTimeRange === '30d' ? 30 : 0);

  if (daysToLoad > 0) {
    for (let i = daysToLoad - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trend[dateKey] = { total: 0, cancelled: 0 };
    }
  }

  orders.forEach(o => {
    const dateObj = new Date(o.timestamp || o.createdAt);
    const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isCancelled = o.status === 'cancelled';

    if (daysToLoad > 0) {
      if (trend[dateKey] !== undefined) {
        trend[dateKey].total++;
        if (isCancelled) trend[dateKey].cancelled++;
      }
    } else {
      if (!trend[dateKey]) trend[dateKey] = { total: 0, cancelled: 0 };
      trend[dateKey].total++;
      if (isCancelled) trend[dateKey].cancelled++;
    }
  });

  const labels = Object.keys(trend);
  const rates = Object.values(trend).map(v => v.total > 0 ? parseFloat(((v.cancelled / v.total) * 100).toFixed(1)) : 0);

  const ctx = document.getElementById('chartCancellationTrend');
  if (!ctx) return;

  if (chartCancellationTrendInstance) {
    chartCancellationTrendInstance.destroy();
  }

  chartCancellationTrendInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'معدل إلغاء الطلبات (%)',
        data: rates,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { family: 'Cairo' }, callback: value => value + '%' }
        },
        x: { ticks: { font: { family: 'Cairo', size: 10 } } }
      }
    }
  });
}

// ── Orders Heatmap ──
function populateOrdersHeatmap(orders) {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const matrix = Array(7).fill(0).map(() => Array(24).fill(0));

  orders.forEach(o => {
    const date = new Date(o.timestamp || o.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    matrix[day][hour]++;
  });

  let maxVal = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d][h] > maxVal) maxVal = matrix[d][h];
    }
  }

  const tbody = document.getElementById('ordersHeatmapTableBody');
  if (tbody) {
    let html = '';
    const dayOrder = [6, 0, 1, 2, 3, 4, 5]; // Sat to Fri

    dayOrder.forEach(dayIdx => {
      html += `<tr style="border-bottom: 1px solid var(--border-color); height: 28px;">`;
      html += `<td style="font-family: Cairo; font-weight: 700; color: var(--text-dark); text-align: right; padding: 4px; border-left: 1px solid var(--border-color);">${days[dayIdx]}</td>`;
      
      for (let h = 0; h < 24; h++) {
        const count = matrix[dayIdx][h];
        let bg = 'transparent';
        let color = 'var(--text-gray)';
        if (count > 0 && maxVal > 0) {
          const opacity = (count / maxVal) * 0.7 + 0.1;
          bg = `rgba(59, 130, 246, ${opacity})`;
          color = opacity > 0.45 ? '#fff' : 'var(--text-dark)';
        }
        
        html += `<td style="background: ${bg}; color: ${color}; font-size: 0.72rem; padding: 4px; border-left: 1px dashed rgba(0,0,0,0.03);" title="${count} طلبات في هذا الوقت">${count > 0 ? count : ''}</td>`;
      }
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }
}

// ── Net Profit Timeline Chart ──
function drawNetProfitTimelineChart(orders, expenses) {
  const profitByDate = {};
  const allDates = new Set();
  
  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    const dateKey = new Date(o.timestamp || o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    allDates.add(dateKey);
  });
  
  (expenses || []).forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    allDates.add(dateKey);
  });

  const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

  sortedDates.forEach(date => {
    profitByDate[date] = { revenue: 0, cost: 0, expenses: 0 };
  });

  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    const dateKey = new Date(o.timestamp || o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (profitByDate[dateKey]) {
      profitByDate[dateKey].revenue += (o.priceSAR || 0);
      if (o.status === 'completed') {
        profitByDate[dateKey].cost += (o.supplierCost || 0);
      }
    }
  });

  (expenses || []).forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (profitByDate[dateKey]) {
      profitByDate[dateKey].expenses += (e.amountUSD || 0);
    }
  });

  const labels = Object.keys(profitByDate);
  const profits = Object.values(profitByDate).map(v => parseFloat((v.revenue - v.cost - v.expenses).toFixed(2)));

  const ctx = document.getElementById('chartNetProfitTimeline');
  if (!ctx) return;

  if (chartNetProfitTimelineInstance) {
    chartNetProfitTimelineInstance.destroy();
  }

  chartNetProfitTimelineInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'صافي الأرباح الفعلية ($)',
        data: profits,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { font: { family: 'Cairo' }, callback: value => '$' + value } },
        x: { ticks: { font: { family: 'Cairo', size: 10 } } }
      }
    }
  });
}

// ── Expenses Breakdown Chart ──
function drawExpensesBreakdownChart(expenses) {
  const counts = { hosting: 0, marketing: 0, salaries: 0, other: 0 };
  (expenses || []).forEach(e => {
    const cat = e.category || 'other';
    if (counts[cat] !== undefined) {
      counts[cat] += (e.amountUSD || 0);
    } else {
      counts.other += (e.amountUSD || 0);
    }
  });

  const labels = ['سيرفرات واستضافة', 'تسويق وإعلانات', 'رواتب وعمولات', 'مصاريف أخرى'];
  const data = [counts.hosting, counts.marketing, counts.salaries, counts.other];

  const ctx = document.getElementById('chartExpensesBreakdown');
  if (!ctx) return;

  if (chartExpensesBreakdownInstance) {
    chartExpensesBreakdownInstance.destroy();
  }

  chartExpensesBreakdownInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#6366f1', '#ca8a04', '#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } }
        }
      }
    }
  });
}

// ── Revenue vs Total Costs Chart ──
function drawRevenueVsCostsChart(orders, expenses) {
  const dataMap = {};
  const allDates = new Set();
  
  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    const dateKey = new Date(o.timestamp || o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    allDates.add(dateKey);
  });
  
  (expenses || []).forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    allDates.add(dateKey);
  });

  const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b)).slice(-10);

  sortedDates.forEach(date => {
    dataMap[date] = { revenue: 0, cost: 0 };
  });

  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    const dateKey = new Date(o.timestamp || o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dataMap[dateKey]) {
      dataMap[dateKey].revenue += (o.priceSAR || 0);
      if (o.status === 'completed') {
        dataMap[dateKey].cost += (o.supplierCost || 0);
      }
    }
  });

  (expenses || []).forEach(e => {
    const dateKey = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dataMap[dateKey]) {
      dataMap[dateKey].cost += (e.amountUSD || 0);
    }
  });

  const labels = Object.keys(dataMap);
  const revenues = Object.values(dataMap).map(v => parseFloat(v.revenue.toFixed(2)));
  const costs = Object.values(dataMap).map(v => parseFloat(v.cost.toFixed(2)));

  const ctx = document.getElementById('chartRevenueVsCosts');
  if (!ctx) return;

  if (chartRevenueVsCostsInstance) {
    chartRevenueVsCostsInstance.destroy();
  }

  chartRevenueVsCostsInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'الإيرادات ($)',
          data: revenues,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        },
        {
          label: 'التكاليف الإجمالية ($)',
          data: costs,
          backgroundColor: '#ef4444',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Cairo', size: 10, weight: 'bold' } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
        x: { ticks: { font: { family: 'Cairo', size: 10 } } }
      }
    }
  });
}

// ── Monthly Financial Summary ──
function populateMonthlyFinancialSummary(orders, expenses) {
  const monthlyData = {};

  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    const date = new Date(o.timestamp || o.createdAt);
    const monthKey = date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, supplierCost: 0, adminExpenses: 0, sortKey: date.getTime() };
    }
    
    monthlyData[monthKey].revenue += (o.priceSAR || 0);
    if (o.status === 'completed') {
      monthlyData[monthKey].supplierCost += (o.supplierCost || 0);
    }
  });

  (expenses || []).forEach(e => {
    const date = new Date(e.date);
    const monthKey = date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, supplierCost: 0, adminExpenses: 0, sortKey: date.getTime() };
    }
    
    monthlyData[monthKey].adminExpenses += (e.amountUSD || 0);
  });

  const sortedMonths = Object.keys(monthlyData).sort((a, b) => monthlyData[a].sortKey - monthlyData[b].sortKey);

  const tbody = document.getElementById('monthlyFinancialSummaryBody');
  if (tbody) {
    if (sortedMonths.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-gray);padding:20px;">لا يوجد بيانات مالية مسجلة بعد</td></tr>';
    } else {
      const f = val => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
      tbody.innerHTML = sortedMonths.map(month => {
        const m = monthlyData[month];
        const netProfit = m.revenue - m.supplierCost - m.adminExpenses;
        const margin = m.revenue > 0 ? ((netProfit / m.revenue) * 100).toFixed(1) + '%' : '0.0%';
        return `
          <tr style="border-bottom: 1px solid var(--border-color); height: 38px;">
            <td style="padding: 8px 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${month}</td>
            <td style="padding: 8px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #3b82f6; text-align: left;">${f(m.revenue)}</td>
            <td style="padding: 8px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #a16207; text-align: left;">${f(m.supplierCost)}</td>
            <td style="padding: 8px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #ef4444; text-align: left;">${f(m.adminExpenses)}</td>
            <td style="padding: 8px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #10b981; text-align: left;">${f(netProfit)}</td>
            <td style="padding: 8px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--blue-500); text-align: left;">${margin}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

// ── Weekly Executive Report System ──
window.initWeeklyReport = function(orders) {
  if (!orders || orders.length === 0) return;

  function getStartOfWeek(d) {
    const day = d.getDay();
    const diff = (day === 6) ? 0 : -(day + 1);
    const sat = new Date(d);
    sat.setDate(sat.getDate() + diff);
    sat.setHours(0, 0, 0, 0);
    return sat;
  }

  const weeklyData = {};

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const date = new Date(o.timestamp || o.createdAt);
    const start = getStartOfWeek(date);
    const timeKey = start.getTime();

    if (!weeklyData[timeKey]) {
      // Calculate start and end date labels cleanly
      const weekEnd = new Date(start);
      weekEnd.setDate(start.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      weeklyData[timeKey] = {
        start: start,
        end: weekEnd,
        revenue: 0,
        completedCount: 0,
        orders: []
      };
    }

    weeklyData[timeKey].revenue += (o.priceSAR || 0);
    weeklyData[timeKey].orders.push(o);
    if (o.status === 'completed') {
      weeklyData[timeKey].completedCount++;
    }
  });

  const sortedWeekTimes = Object.keys(weeklyData).map(Number).sort((a, b) => a - b);
  const last6WeekTimes = sortedWeekTimes.slice(-6);

  const tbody = document.getElementById('weeklyGrowthTableBody');
  if (tbody) {
    const f = val => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    let html = '';

    last6WeekTimes.forEach((time, index) => {
      const w = weeklyData[time];
      const startStr = w.start.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      const endStr = w.end.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      const dateRangeLabel = `من ${startStr} إلى ${endStr}`;
      
      let growthLabel = '—';
      let growthColor = 'var(--text-gray)';
      if (index > 0) {
        const prevTime = last6WeekTimes[index - 1];
        const prevW = weeklyData[prevTime];
        if (prevW && prevW.revenue > 0) {
          const pct = ((w.revenue - prevW.revenue) / prevW.revenue) * 100;
          if (pct > 0) {
            growthLabel = `↗️ +${pct.toFixed(1)}%`;
            growthColor = '#10b981';
          } else if (pct < 0) {
            growthLabel = `↘️ ${pct.toFixed(1)}%`;
            growthColor = '#ef4444';
          } else {
            growthLabel = '0.0%';
          }
        }
      }

      const aov = w.completedCount > 0 ? (w.revenue / w.completedCount) : 0;

      html = `
        <tr style="border-bottom: 1px solid var(--border-color); height: 42px;">
          <td style="padding: 10px 6px; font-family: Cairo, sans-serif; font-weight: 700; color: var(--text-dark);">${dateRangeLabel}</td>
          <td style="padding: 10px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--blue-500); text-align: left;">${f(w.revenue)}</td>
          <td style="padding: 10px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: ${growthColor}; text-align: left; direction: ltr;">${growthLabel}</td>
          <td style="padding: 10px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: var(--text-gray); text-align: center;">${w.completedCount}</td>
          <td style="padding: 10px 6px; font-family: Montserrat, sans-serif; font-weight: 800; color: #ca8a04; text-align: left;">${f(aov)}</td>
        </tr>
      ` + html;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;padding:20px;">لا يوجد مبيعات كافية لاحتساب النمو الأسبوعي</td></tr>';
  }

  const now = new Date();
  const currentWeekStart = getStartOfWeek(now).getTime();
  const currentWeek = weeklyData[currentWeekStart] || {
    revenue: 0,
    completedCount: 0,
    orders: [],
    start: getStartOfWeek(now),
    end: new Date(getStartOfWeek(now).getTime() + 6 * 24 * 60 * 60 * 1000)
  };

  const savedGoal = parseFloat(localStorage.getItem('weekly_sales_goal')) || 2000;
  const inputEl = document.getElementById('weeklyGoalInput');
  if (inputEl) inputEl.value = savedGoal;
  
  const lblGoalVal = document.getElementById('lblWeeklyGoalValue');
  if (lblGoalVal) lblGoalVal.textContent = '$' + savedGoal.toLocaleString();

  const lblGoalCurr = document.getElementById('lblWeeklyGoalCurrent');
  if (lblGoalCurr) lblGoalCurr.textContent = '$' + currentWeek.revenue.toFixed(2);

  const goalPct = savedGoal > 0 ? Math.min(100, Math.round((currentWeek.revenue / savedGoal) * 100)) : 0;
  const bar = document.getElementById('weeklyGoalProgressBar');
  if (bar) bar.style.width = goalPct + '%';

  const lblGoalPct = document.getElementById('lblWeeklyGoalPct');
  if (lblGoalPct) lblGoalPct.textContent = goalPct + '%';

  const textSummaryEl = document.getElementById('weeklyExecutiveTextSummary');
  if (textSummaryEl) {
    let growthText = 'مستقر بالنسبة للفترة السابقة';
    if (last6WeekTimes.length > 1) {
      const currIdx = last6WeekTimes.indexOf(currentWeekStart);
      if (currIdx > 0) {
        const prevTime = last6WeekTimes[currIdx - 1];
        const prevW = weeklyData[prevTime];
        if (prevW && prevW.revenue > 0) {
          const diffPct = ((currentWeek.revenue - prevW.revenue) / prevW.revenue) * 100;
          if (diffPct > 0) {
            growthText = `زيادة إيجابية ملحوظة بمعدل **+${diffPct.toFixed(1)}%** مقارنة بالأسبوع المنصرم`;
          } else if (diffPct < 0) {
            growthText = `تراجع طفيف بمعدل **${diffPct.toFixed(1)}%** مقارنة بالأسبوع الماضي`;
          }
        }
      }
    }

    const startStr = currentWeek.start.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' });
    const endStr = currentWeek.end.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' });

    let statusGoalText = 'نسير بخطى جيدة نحو تحقيق الهدف المالي الأسبوعي.';
    if (goalPct >= 100) {
      statusGoalText = '🎉 تهانينا! تم تجاوز هدف المبيعات الأسبوعي بنجاح كبير.';
    } else if (goalPct >= 50) {
      statusGoalText = 'حققنا أكثر من نصف الهدف المالي، نقترب من خط النهاية.';
    }

    textSummaryEl.innerHTML = `
      خلال الأسبوع الجاري الممتد من **${startStr}** إلى **${endStr}**، سجل المتجر حجم مبيعات بلغ **$${currentWeek.revenue.toFixed(2)}** من خلال إتمام **${currentWeek.completedCount}** طلب بنجاح.
      <br/><br/>
      تشير الأرقام إلى **${growthText}**. ${statusGoalText} كما تشهد خدمات التوريد كفاءة جيدة في سرعة التسليم.
    `;
  }

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daySales = Array(7).fill(0);
  const hourCounts = Array(24).fill(0);

  currentWeek.orders.forEach(o => {
    const d = new Date(o.timestamp || o.createdAt);
    daySales[d.getDay()] += (o.priceSAR || 0);
    hourCounts[d.getHours()]++;
  });

  let bestDayIdx = 0;
  let maxDaySales = 0;
  daySales.forEach((s, idx) => {
    if (s > maxDaySales) {
      maxDaySales = s;
      bestDayIdx = idx;
    }
  });

  let bestHour = 0;
  let maxHourOrders = 0;
  hourCounts.forEach((c, idx) => {
    if (c > maxHourOrders) {
      maxHourOrders = c;
      bestHour = idx;
    }
  });

  const bestDayEl = document.getElementById('weekly-best-day');
  if (bestDayEl) {
    bestDayEl.textContent = maxDaySales > 0 ? `${dayNames[bestDayIdx]} ($${maxDaySales.toFixed(2)})` : 'لا توجد مبيعات كافية هذا الأسبوع';
  }

  const bestHourEl = document.getElementById('weekly-best-hour');
  if (bestHourEl) {
    bestHourEl.textContent = maxHourOrders > 0 ? `الساعة ${String(bestHour).padStart(2, '0')}:00 (${maxHourOrders} طلبات)` : 'لا توجد بيانات';
  }
};

window.updateWeeklyGoal = function() {
  const inputEl = document.getElementById('weeklyGoalInput');
  if (inputEl) {
    const val = parseFloat(inputEl.value) || 2000;
    localStorage.setItem('weekly_sales_goal', val);
    showStatus("✅ تم تحديث الهدف المالي الأسبوعي بنجاح", "success");
    if (adminActiveOrders && adminActiveOrders.length > 0) {
      window.initWeeklyReport(adminActiveOrders);
    }
  }
};

window.printExecutiveReport = function() {
  window.print();
};

window.openPointAdjustmentModal = function(userId, userName) {
  const modal = document.getElementById('pointAdjustmentModal');
  const idInput = document.getElementById('adjustModalUserId');
  const nameEl = document.getElementById('adjustModalUserName');
  const amountInput = document.getElementById('adjustModalAmount');
  const reasonInput = document.getElementById('adjustModalReason');

  if (modal && idInput && nameEl) {
    idInput.value = userId;
    nameEl.textContent = userName;
    if (amountInput) amountInput.value = "";
    if (reasonInput) reasonInput.value = "";
    modal.style.display = 'flex';
  }
};

window.closePointAdjustmentModal = function() {
  const modal = document.getElementById('pointAdjustmentModal');
  if (modal) modal.style.display = 'none';
};

window.submitPointAdjustment = async function(event) {
  event.preventDefault();
  const userId = document.getElementById('adjustModalUserId').value;
  const action = document.getElementById('adjustModalAction').value;
  const amountVal = parseInt(document.getElementById('adjustModalAmount').value, 10);
  const reason = document.getElementById('adjustModalReason').value.trim();

  if (!userId || isNaN(amountVal) || amountVal <= 0 || !reason) {
    alert("يرجى إكمال جميع الحقول وإدخال قيم صالحة.");
    return;
  }

  const signedPoints = action === 'deduct' ? -amountVal : amountVal;

  try {
    const data = await adminService.modifyUserPoints(userId, signedPoints, reason);
    if (data.success) {
      showStatus("✅ تم تعديل نقاط العميل وتحديث السجل بنجاح!", "success");
      window.closePointAdjustmentModal();
      loadAllUsers();
    } else {
      showStatus("❌ فشل تعديل نقاط العميل.", "error");
    }
  } catch (err) {
    showStatus("❌ خطأ: " + err.message, "error");
  }
};

window.openCrmCustomerProfileModal = function(userId) {
  const modal = document.getElementById('crmCustomerProfileModal');
  if (!modal) return;

  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  activeProfileUser = user;

  // Populate info brief
  document.getElementById('crmProfName').textContent = user.name || "—";
  document.getElementById('crmProfPhone').textContent = user.phone || "—";
  document.getElementById('crmProfEmail').textContent = user.email || "—";
  
  const passEl = document.getElementById('crmProfPassword');
  const eyeIcon = document.getElementById('crmProfPasswordEyeIcon');
  if (passEl) {
    const passwordVal = user.rawPassword || user.rawPasswordPlaintext || "pass1234";
    passEl.setAttribute('data-password', passwordVal);
    passEl.setAttribute('data-visible', 'true');
    passEl.style.letterSpacing = 'normal';
    passEl.textContent = passwordVal;
    if (eyeIcon) {
      eyeIcon.className = 'fas fa-eye-slash';
    }
  }

  document.getElementById('crmProfPoints').textContent = `${user.points || 0} نقطة`;

  // Get user orders
  const userOrders = (adminActiveOrders || []).filter(o => 
    (o.customerPhone && user.phone && sanitizePhone(o.customerPhone) === sanitizePhone(user.phone)) ||
    (o.customerEmail && user.email && o.customerEmail.toLowerCase().trim() === user.email.toLowerCase().trim())
  );

  const completedOrders = userOrders.filter(o => o.status === 'completed');
  const totalSpent = completedOrders.reduce((sum, o) => sum + parseFloat(o.priceSAR || 0), 0);

  document.getElementById('crmProfOrdersCount').textContent = userOrders.length;

  // Tier calculation and Progress Bar
  let tierName = "برونزي";
  let nextTierName = "فضي";
  let targetSpend = 250;
  let nextTierProgress = 0;
  let progressText = "";
  
  if (totalSpent >= 2500) {
    tierName = "بلاتيني النخبة";
    nextTierName = "أعلى مستوى وصل إليه";
    nextTierProgress = 100;
    progressText = "🏆 لقد وصل هذا العميل لأعلى فئة عملاء بالمتجر (بلاتيني)!";
  } else if (totalSpent >= 1000) {
    tierName = "ذهبي VIP";
    nextTierName = "بلاتيني النخبة";
    targetSpend = 2500;
    const remaining = targetSpend - totalSpent;
    nextTierProgress = Math.min(100, Math.round((totalSpent / targetSpend) * 100));
    progressText = `أنفق **${remaining.toFixed(2)} ر.س** إضافية للوصول للفئة البلاتينية`;
  } else if (totalSpent >= 250) {
    tierName = "فضي";
    nextTierName = "ذهبي VIP";
    targetSpend = 1000;
    const remaining = targetSpend - totalSpent;
    nextTierProgress = Math.min(100, Math.round((totalSpent / targetSpend) * 100));
    progressText = `أنفق **${remaining.toFixed(2)} ر.س** إضافية للوصول للفئة الذهبية`;
  } else {
    tierName = "برونزي";
    nextTierName = "فضي";
    targetSpend = 250;
    const remaining = targetSpend - totalSpent;
    nextTierProgress = Math.min(100, Math.round((totalSpent / targetSpend) * 100));
    progressText = `أنفق **${remaining.toFixed(2)} ر.س** إضافية للوصول للفئة الفضية`;
  }

  // Populate Tier Progress UI
  const crmProfTierName = document.getElementById('crmProfTierName');
  if (crmProfTierName) crmProfTierName.textContent = tierName;
  const crmProfNextTierName = document.getElementById('crmProfNextTierName');
  if (crmProfNextTierName) crmProfNextTierName.textContent = nextTierName;
  const crmProfTierProgressBar = document.getElementById('crmProfTierProgressBar');
  if (crmProfTierProgressBar) crmProfTierProgressBar.style.width = `${nextTierProgress}%`;
  const crmProfTierProgressLabel = document.getElementById('crmProfTierProgressLabel');
  if (crmProfTierProgressLabel) crmProfTierProgressLabel.textContent = `${totalSpent.toFixed(2)} / ${targetSpend} SAR`;
  const crmProfRemainingLabel = document.getElementById('crmProfRemainingLabel');
  if (crmProfRemainingLabel) {
    crmProfRemainingLabel.innerHTML = progressText;
  }

  // Render orders
  const ordersTable = document.getElementById('crmProfOrdersTableBody');
  if (ordersTable) {
    if (userOrders.length === 0) {
      ordersTable.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 12px; color: var(--text-gray);">لا توجد طلبات سابقة لهذا العميل بالمتجر.</td></tr>`;
    } else {
      ordersTable.innerHTML = userOrders.map(o => {
        const orderDate = new Date(o.timestamp || o.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let statusBadge = "";
        if (o.status === 'completed') statusBadge = `<span class="badge" style="background:#d1fae5;color:#065f46;">مكتمل</span>`;
        else if (o.status === 'processing') statusBadge = `<span class="badge" style="background:#eff6ff;color:#1e40af;">قيد العمل</span>`;
        else statusBadge = `<span class="badge" style="background:#fef3c7;color:#92400e;">معلّق</span>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 8px 6px; font-family: Montserrat; font-weight:700;">${o.id.replace('order_', '')}</td>
            <td style="padding: 8px 6px; font-family: Cairo;">${o.service}</td>
            <td style="padding: 8px 6px; font-family: Montserrat;">${o.platform}</td>
            <td style="padding: 8px 6px; font-family: Montserrat; text-align:left; font-weight:700;">${o.priceSAR.toFixed(2)} ر.س</td>
            <td style="padding: 8px 6px; text-align:center;">${statusBadge}</td>
            <td style="padding: 8px 6px; font-family: Cairo; color: var(--text-gray);">${orderDate}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render loyalty log
  const loyaltyTable = document.getElementById('crmProfLoyaltyTableBody');
  if (loyaltyTable) {
    const history = user.history || [];
    if (history.length === 0) {
      loyaltyTable.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 12px; color: var(--text-gray);">لا يوجد عمليات نقاط سابقة للعميل.</td></tr>`;
    } else {
      loyaltyTable.innerHTML = [...history].reverse().map(h => {
        const logDate = new Date(h.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const changePill = h.amount >= 0 
          ? `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 10px; border-radius: 20px; font-family: Montserrat; font-weight:800; font-size:0.75rem;">+${h.amount} نقطة</span>` 
          : `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 4px 10px; border-radius: 20px; font-family: Montserrat; font-weight:800; font-size:0.75rem;">${h.amount} نقطة</span>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 8px 6px; font-family: Cairo; color: var(--text-gray);">${logDate}</td>
            <td style="padding: 8px 6px; text-align:left;">${changePill}</td>
            <td style="padding: 8px 6px; font-family: Cairo; font-weight:600;">${h.reason || 'تعديل من المشرف'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  modal.style.display = 'flex';
  window.switchCrmTab('orders');
};

window.closeCrmCustomerProfileModal = function() {
  const modal = document.getElementById('crmCustomerProfileModal');
  if (modal) modal.style.display = 'none';
};

window.switchCrmTab = function(tab) {
  currentCrmTab = tab;
  const tabOrders = document.getElementById('tabBtnCrmOrders');
  const tabLoyalty = document.getElementById('tabBtnCrmLoyalty');
  const contentOrders = document.getElementById('crmTabContentOrders');
  const contentLoyalty = document.getElementById('crmTabContentLoyalty');

  if (tab === 'orders') {
    if (tabOrders) {
      tabOrders.style.color = 'var(--blue-500)';
      tabOrders.style.borderBottom = '2px solid var(--blue-500)';
    }
    if (tabLoyalty) {
      tabLoyalty.style.color = 'var(--text-gray)';
      tabLoyalty.style.borderBottom = '2px solid transparent';
    }
    if (contentOrders) contentOrders.style.display = 'block';
    if (contentLoyalty) contentLoyalty.style.display = 'none';
  } else {
    if (tabOrders) {
      tabOrders.style.color = 'var(--text-gray)';
      tabOrders.style.borderBottom = '2px solid transparent';
    }
    if (tabLoyalty) {
      tabLoyalty.style.color = 'var(--blue-500)';
      tabLoyalty.style.borderBottom = '2px solid var(--blue-500)';
    }
    if (contentOrders) contentOrders.style.display = 'none';
    if (contentLoyalty) contentLoyalty.style.display = 'block';
  }
};

window.activateMarketingTemplate = function() {
  const template = document.getElementById('marketingMessageTemplate')?.value.trim();
  if (!template) {
    alert("الرجاء إدخال نص قالب العرض التسويقي أولاً.");
    return;
  }
  isMarketingActive = true;
  showStatus("📢 تم تفعيل قالب الرسالة التسويقية بنجاح! جدول العملاء يعرض الآن أزرار إرسال العروض.", "success");
  filterUsers();
};

window.resetMarketingTemplate = function() {
  isMarketingActive = false;
  showStatus("🔄 تم إلغاء تفعيل قالب الرسالة التسويقية وإعادة لوحة التحكم للوضع الافتراضي.", "success");
  filterUsers();
};

window.filterUsers = filterUsers;

window.loadMarketingPreset = function(type) {
  const templateEl = document.getElementById('marketingMessageTemplate');
  if (!templateEl) return;

  if (type === 'reengage') {
    templateEl.value = "مرحباً {الاسم}، لاحظنا غيابك عن متجر تريفيلا مؤخراً! 🎮\nيسرنا تقديم هدية خاصة لك: كود خصم (WE_MISS_YOU) يمنحك 10% خصم إضافي على شحن الكوينز والخدمات.\nنقاطك الحالية في حسابك: {النقاط} نقطة. لا تفوت العروض:\nhttp://localhost:3000";
  } else if (type === 'vip') {
    templateEl.value = "شكر وتقدير من متجر تريفيلا! 🏆\nعزيزنا العميل المتميز {الاسم}، لأنك مسجل لدينا بصفة ({الترقية})، تم شحن بونص إضافي 50 نقطة لحسابك! رصيدك الجديد أصبح: {النقاط} نقطة.\nاستخدم كود VIP_LOYALTY في طلبك القادم للحصول على هدايا حصرية:\nhttp://localhost:3000";
  } else if (type === 'new') {
    templateEl.value = "أهلاً بك {الاسم} في عائلة متجر تريفيلا! 🌟\nيسعدنا تسجيلك معنا. نوفر لك أفضل أسعار شحن الكوينز وتحديات SBC والـ Rivals بأعلى أمان وضمان.\nاستخدم كود الترحيب (WELCOME27) للحصول على خصم فوري على طلبك الأول:\nhttp://localhost:3000";
  }
  
  showStatus("📋 تم تحميل قالب الحملة التسويقية المحدد بنجاح! يمكنك تعديله أو تفعيله الآن.", "success");
};

// ==========================================
// BENTO GRID FEATURES MANAGER
// ==========================================

let activeFeaturesList = [];
let draggingItemIndex = null;

async function loadFeatures() {
  try {
    const settings = await adminService.getStoreSettings();
    activeFeaturesList = settings.features || [];
    renderFeaturesList();
  } catch (err) {
    console.error("Failed to load features:", err);
    showStatus("حدث خطأ أثناء تحميل المميزات", "error");
  }
}

function renderFeaturesList() {
  const container = document.getElementById('featuresSortableList');
  if (!container) return;

  if (activeFeaturesList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-gray);">
        <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 8px;"></i>
        <div>لا توجد مميزات مضافة حالياً. سيتم استخدام المميزات الافتراضية في الواجهة.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = activeFeaturesList.map((feat, index) => {
    // Check card style badge
    let badgeClass = 'badge-white';
    let badgeText = 'صغير أبيض';
    if (feat.cardClass.includes('bento-big bento-blue')) {
      badgeClass = 'badge-blue-big';
      badgeText = 'كبير كحلي';
    } else if (feat.cardClass.includes('bento-wide')) {
      badgeClass = 'badge-wide';
      badgeText = 'عريض سماوي';
    } else if (feat.cardClass.includes('bento-gradient-border')) {
      badgeClass = 'badge-border';
      badgeText = 'كبير إطار متدرج';
    }

    return `
      <div class="sortable-item" draggable="true" data-index="${index}" data-id="${feat.id}">
        <div class="sortable-item-left">
          <i class="fas fa-grip-lines drag-handle"></i>
          <div class="feature-icon-preview">
            <i class="${feat.icon}"></i>
          </div>
          <div class="feature-preview-content">
            <span class="feature-preview-title">${feat.title}</span>
            <span class="feature-preview-desc">${feat.desc || feat.customHtml || 'كود مخصص'}</span>
          </div>
          <span class="feature-preview-badge ${badgeClass}">${badgeText}</span>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button type="button" class="admin-btn admin-btn-secondary" onclick="editFeature('${feat.id}')" style="padding: 4px 10px; margin: 0; font-size: 0.75rem;"><i class="fas fa-edit"></i> تعديل</button>
          <button type="button" class="admin-btn admin-btn-danger" onclick="deleteFeature('${feat.id}')" style="padding: 4px 10px; margin: 0; font-size: 0.75rem;"><i class="fas fa-trash-alt"></i> حذف</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Drag & Drop Listeners
  attachDragAndDropListeners();
}

function attachDragAndDropListeners() {
  const items = document.querySelectorAll('.sortable-item');
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggingItemIndex = parseInt(item.getAttribute('data-index'), 10);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggingItemIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropIndex = parseInt(item.getAttribute('data-index'), 10);
      if (draggingItemIndex === null || draggingItemIndex === dropIndex) return;

      // Swap elements in the array
      const draggedElement = activeFeaturesList[draggingItemIndex];
      activeFeaturesList.splice(draggingItemIndex, 1);
      activeFeaturesList.splice(dropIndex, 0, draggedElement);

      renderFeaturesList();
    });
  });
}

window.editFeature = function(id) {
  const feat = activeFeaturesList.find(f => f.id === id);
  if (!feat) return;

  document.getElementById('featId').value = feat.id;
  document.getElementById('featTitle').value = feat.title || '';
  document.getElementById('featCardClass').value = feat.cardClass || 'bento-card bento-white';
  document.getElementById('featIcon').value = feat.icon || 'fas fa-star';
  document.getElementById('featIconClass').value = feat.iconClass || '';
  document.getElementById('featDesc').value = feat.desc || '';
  document.getElementById('featDeco').value = feat.deco || '';
  document.getElementById('featStat').value = feat.stat || '';
  document.getElementById('featBadges').value = (feat.badges || []).join(', ');
  document.getElementById('featCustomHtml').value = feat.customHtml || '';

  // Toggle fields visibility
  window.toggleExtraFields(feat.cardClass || 'bento-card bento-white');

  // Match icon preset
  let matchedPreset = false;
  document.querySelectorAll('.preset-icons-grid .icon-preset-btn').forEach(btn => {
    const btnIcon = btn.querySelector('i')?.className || '';
    if (btnIcon === feat.icon || feat.icon.includes(btnIcon.split(' ')[1])) {
      btn.classList.add('active');
      btn.style.background = 'var(--blue-brand)';
      btn.style.borderColor = 'var(--blue-brand)';
      btn.style.color = 'white';
      matchedPreset = true;
    } else {
      btn.classList.remove('active');
      btn.style.background = 'white';
      btn.style.borderColor = 'var(--border-color)';
      btn.style.color = 'var(--text-dark)';
    }
  });

  const submitBtn = document.getElementById('featSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save"></i> تحديث الميزة`;
};

window.resetFeatureForm = function() {
  document.getElementById('featId').value = '';
  document.getElementById('featTitle').value = '';
  document.getElementById('featCardClass').value = 'bento-card bento-white';
  document.getElementById('featIcon').value = 'fas fa-star';
  document.getElementById('featIconClass').value = '';
  document.getElementById('featDesc').value = '';
  document.getElementById('featDeco').value = '';
  document.getElementById('featStat').value = '';
  document.getElementById('featBadges').value = '';
  document.getElementById('featCustomHtml').value = '';

  // Hide extra fields
  window.toggleExtraFields('bento-card bento-white');

  // Reset icon highlights
  document.querySelectorAll('.preset-icons-grid .icon-preset-btn').forEach((btn, index) => {
    if (index === 0) {
      btn.classList.add('active');
      btn.style.background = 'var(--blue-brand)';
      btn.style.borderColor = 'var(--blue-brand)';
      btn.style.color = 'white';
      document.getElementById('featIcon').value = btn.querySelector('i')?.className || 'fas fa-bolt';
    } else {
      btn.classList.remove('active');
      btn.style.background = 'white';
      btn.style.borderColor = 'var(--border-color)';
      btn.style.color = 'var(--text-dark)';
    }
  });

  const submitBtn = document.getElementById('featSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-plus"></i> حفظ الميزة`;
};

window.saveFeature = async function(event) {
  event.preventDefault();
  
  const idInput = document.getElementById('featId').value;
  const title = document.getElementById('featTitle').value.trim();
  const cardClass = document.getElementById('featCardClass').value;
  const icon = document.getElementById('featIcon').value.trim();
  const iconClass = document.getElementById('featIconClass').value;
  const desc = document.getElementById('featDesc').value.trim();
  const deco = document.getElementById('featDeco').value.trim();
  const stat = document.getElementById('featStat').value.trim();
  const badgesRaw = document.getElementById('featBadges').value;
  const customHtml = document.getElementById('featCustomHtml').value.trim();

  // Parse badges
  const badges = badgesRaw ? badgesRaw.split(',').map(b => b.trim()).filter(Boolean) : [];

  const featureData = {
    id: idInput || ('feat_' + Date.now()),
    title,
    cardClass,
    icon,
    iconClass,
    desc,
    deco,
    stat,
    badges,
    customHtml
  };

  try {
    if (idInput) {
      // Update
      const idx = activeFeaturesList.findIndex(f => f.id === idInput);
      if (idx !== -1) activeFeaturesList[idx] = featureData;
    } else {
      // Create
      activeFeaturesList.push(featureData);
    }

    const res = await adminService.saveFeatures(activeFeaturesList);
    if (res.success) {
      showStatus("✅ تم حفظ الميزة وتحديث المتجر بنجاح!", "success");
      resetFeatureForm();
      loadFeatures();
    } else {
      showStatus("فشل حفظ الميزة.", "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر.", "error");
  }
};

window.deleteFeature = async function(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الميزة نهائياً؟")) return;

  try {
    activeFeaturesList = activeFeaturesList.filter(f => f.id !== id);
    const res = await adminService.saveFeatures(activeFeaturesList);
    if (res.success) {
      showStatus("🗑️ تم حذف الميزة بنجاح!", "success");
      loadFeatures();
    } else {
      showStatus("فشل حذف الميزة.", "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر.", "error");
  }
};

window.saveFeaturesOrder = async function() {
  try {
    const res = await adminService.saveFeatures(activeFeaturesList);
    if (res.success) {
      showStatus("↕️ تم حفظ الترتيب الجديد للمميزات بالمتجر بنجاح!", "success");
      loadFeatures();
    } else {
      showStatus("فشل حفظ ترتيب المميزات.", "error");
    }
  } catch (err) {
    showStatus("خطأ بالاتصال بالسيرفر.", "error");
  }
};

window.toggleExtraFields = function(cardClass) {
  const container = document.getElementById('featExtraFields');
  if (!container) return;
  const isLarge = cardClass.includes('bento-big') || cardClass.includes('bento-wide');
  container.style.display = isLarge ? 'block' : 'none';
};

window.setFeatureIcon = function(iconClass, el) {
  const iconInput = document.getElementById('featIcon');
  if (iconInput) iconInput.value = iconClass;

  // Toggle active class in grid
  document.querySelectorAll('.preset-icons-grid .icon-preset-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.background = 'white';
    btn.style.borderColor = 'var(--border-color)';
    btn.style.color = 'var(--text-dark)';
  });

  if (el) {
    el.classList.add('active');
    el.style.background = 'var(--blue-brand)';
    el.style.borderColor = 'var(--blue-brand)';
    el.style.color = 'white';
  }

  // Set smart default icon color background class
  let bgClass = '';
  if (iconClass.includes('shield')) bgClass = 'bc-green';
  else if (iconClass.includes('rotate') || iconClass.includes('backward')) bgClass = 'bc-orange';
  else if (iconClass.includes('headset')) bgClass = 'bc-purple';
  else if (iconClass.includes('tag')) bgClass = 'bc-blue';
  else if (iconClass.includes('ban')) bgClass = 'bc-red';
  else if (iconClass.includes('gamepad')) bgClass = 'bc-blue';

  const hiddenBgInput = document.getElementById('featIconClass');
  if (hiddenBgInput) hiddenBgInput.value = bgClass;
};

window.loadFeatures = loadFeatures;

window.saveCoachingSectionHeader = async function(event) {
  event.preventDefault();
  try {
    const settings = await adminService.getStoreSettings();
    if (!settings.content) settings.content = {};
    if (!settings.content.landing) settings.content.landing = {};

    const badge = document.getElementById('c_coachingSectionBadge').value.trim();
    const title = document.getElementById('c_coachingSectionTitle').value.trim();
    const subtitle = document.getElementById('c_coachingSectionSubTitle').value.trim();

    settings.content.landing.guaranteeBadge = badge;
    settings.content.landing.guaranteeTitle = title;
    settings.content.landing.guaranteeSubTitle = subtitle;

    // Sync back to landing-content-panel forms in case admin looks there
    const c_guaranteeTitle = document.getElementById('c_guaranteeTitle');
    if (c_guaranteeTitle) c_guaranteeTitle.value = title;
    const c_guaranteeSubTitle = document.getElementById('c_guaranteeSubTitle');
    if (c_guaranteeSubTitle) c_guaranteeSubTitle.value = subtitle;

    await adminService.saveStoreContent(settings.content);
    showStatus("✅ تم حفظ نصوص وعناوين قسم التدريب بالصفحة الرئيسية بنجاح!", "success");
  } catch (err) {
    console.error("Failed to save coaching section header:", err);
    showStatus("حدث خطأ أثناء حفظ نصوص القسم.", "error");
  }
};

window.loadEmailPreset = function(type) {
  const subjectInput = document.getElementById('emailSubject');
  const previewInput = document.getElementById('emailPreview');
  const bodyInput = document.getElementById('emailBody');
  if (!subjectInput || !previewInput || !bodyInput) return;

  if (type === 'promo') {
    subjectInput.value = "🔥 عروض تريفيلا الحصرية لـ FIFA 27: خصم 10% فوري لفترة محدودة!";
    previewInput.value = "شحن كوينز آمن، تحديات SBC، و Rivals بخصومات فائقة";
    bodyInput.value = `أهلاً بك يا {الاسم}، 🎮\n\nنود أن نهنئك بمناسبة انطلاق المواسم الجديدة في فيفا 27، ونقدم لك كود خصم ترويجي وحصري:\n\nكود الخصم: (TRIVELA10) يمنحك خصم 10% فوري على كافة خدمات شحن الكوينز وتحديات SBC وتفويض Rivals و FUT Champions!\n\nرصيد نقاط الولاء الحالي الخاص بك: {النقاط} نقطة.\nفئتك الحالية: {الترقية}\n\nشحن آمن 100% وضمان متكامل ضد البند.\n\nتسوّق الآن:\nhttp://localhost:3000`;
  } else if (type === 'welcome') {
    subjectInput.value = "🌟 مرحباً بك في متجر Trivela لشحن كوينز وتحديات فيفا 27!";
    previewInput.value = "تعرف على الطريقة الأكثر أماناً لبناء تشكيلة أحلامك";
    bodyInput.value = `مرحباً بك يا {الاسم} في عائلة تريفيلا! 👋\n\nمتجر تريفيلا هو الخيار الأول في الوطن العربي لشحن الكوينز وإنجاز التحديات باحترافية وسرعة وأمان تام.\n\nخدماتنا المتميزة تشمل:\n- شحن كوينز بطريقة Comfort Trade مع ضمان ضد البند.\n- تفويض إنجاز SBC وحل كافة التحديات فور صدورها.\n- لعب بطولات Champions و Rivals وتحقيق الرتب العليا.\n\nاستخدم كود الترحيب الخاص بك (WELCOME27) للحصول على خصم إضافي فوري في طلبك الأول.\n\nرابط المتجر:\nhttp://localhost:3000`;
  } else if (type === 'reengage') {
    subjectInput.value = "😢 {الاسم}، نفتقدك في متجر تريفيلا! هدية مجانية مخصصة لك بالداخل...";
    previewInput.value = "كود خصم 12% إضافي ورصيد بونص نقاط تم تفعيله لحسابك";
    bodyInput.value = `أهلاً بك يا {الاسم}، 👋\n\nمرت فترة طويلة منذ آخر زيارة لك لمتجر تريفيلا، ويسعدنا أن نقدم لك بونص خاص كشكر على وفائك:\n\nلقد قمنا بإضافة 50 نقطة ولاء مجانية لحسابك ليصبح رصيدك الحالي: {النقاط} نقطة!\n\nكما قمنا بتفعيل كود خصم خاص بك (WE_MISS_YOU) يمنحك 12% خصم إضافي على طلبك القادم لشحن الكوينز أو خدمات Rivals و SBC.\n\nلا تفوت الفرصة وسارع ببناء تشكيلة أحلامك وتجربة خدماتنا الاحترافية المحدثة:\nhttp://localhost:3000`;
  }
};

window.previewEmailCampaign = function() {
  const subject = document.getElementById('emailSubject').value.trim();
  const body = document.getElementById('emailBody').value.trim();

  if (!subject || !body) {
    showStatus("يرجى كتابة عنوان ورسالة الحملة للمعاينة.", "error");
    return;
  }

  const previewSubject = subject.replace(/{الاسم}/g, "أحمد خالد").replace(/{النقاط}/g, "120").replace(/{الترقية}/g, "ذهبي 🥇");
  const previewBody = body.replace(/{الاسم}/g, "أحمد خالد").replace(/{النقاط}/g, "120").replace(/{الترقية}/g, "ذهبي 🥇");

  showStatus(`👀 معاينة الرسالة للعميل (أحمد خالد):\n\nالموضوع: ${previewSubject}\n\n${previewBody}`, "info");
};

window.sendEmailCampaign = async function(event) {
  event.preventDefault();
  const subject = document.getElementById('emailSubject').value.trim();
  const previewText = document.getElementById('emailPreview').value.trim();
  const body = document.getElementById('emailBody').value.trim();

  if (!subject || !body) {
    showStatus("يرجى كتابة عنوان ورسالة الحملة أولاً.", "error");
    return;
  }

  let recipientCount = 0;
  try {
    const users = await adminService.getAllUsers();
    recipientCount = users.length || 0;
  } catch (e) {
    recipientCount = allUsers.length || 5; // fallback
  }

  const progressContainer = document.getElementById('emailSendingProgressContainer');
  const progressBar = document.getElementById('emailProgressBar');
  const progressPercent = document.getElementById('emailProgressPercent');
  
  if (progressContainer) progressContainer.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';
  if (progressPercent) progressPercent.textContent = '0%';

  let percent = 0;
  const interval = setInterval(async () => {
    percent += 5;
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = percent + '%';

    if (percent >= 100) {
      clearInterval(interval);
      
      try {
        const response = await fetch('/api/admin/email-campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject,
            previewText,
            body,
            recipientCount
          })
        });
        const result = await response.json();
        if (result.success) {
          showStatus("✅ تم إرسال حملة البريد الإلكتروني بنجاح لـ " + recipientCount + " عميل!", "success");
          
          document.getElementById('emailSubject').value = '';
          document.getElementById('emailPreview').value = '';
          document.getElementById('emailBody').value = '';
          if (progressContainer) progressContainer.style.display = 'none';

          renderEmailCampaigns(result.campaigns || []);
        } else {
          showStatus("حدث خطأ أثناء حفظ الحملة.", "error");
        }
      } catch (err) {
        console.error("Failed to save email campaign:", err);
        showStatus("فشل إرسال الحملة بسبب عطل في الشبكة.", "error");
      }
    }
  }, 50);
};

async function loadEmailCampaigns() {
  const table = document.getElementById('emailCampaignsTableBody');
  if (!table) return;

  try {
    const response = await fetch('/api/admin/email-campaigns');
    const campaigns = await response.json();
    renderEmailCampaigns(campaigns);
  } catch (err) {
    console.error("Failed to load email campaigns:", err);
  }
}

function renderEmailCampaigns(campaigns) {
  const table = document.getElementById('emailCampaignsTableBody');
  if (!table) return;

  if (!campaigns || campaigns.length === 0) {
    table.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-gray); padding: 30px;">لا توجد حملات مرسلة سابقاً.</td></tr>`;
    return;
  }

  table.innerHTML = campaigns.map(c => {
    const formattedDate = new Date(c.date).toLocaleString('ar-EG', { hour12: true });
    return `
      <tr style="border-bottom: 1px solid var(--border-color); font-family: Cairo, sans-serif;">
        <td style="padding: 12px 8px; font-weight: 700; color: var(--text-dark);">${formattedDate}</td>
        <td style="padding: 12px 8px; color: var(--text-gray);">${c.subject}</td>
        <td style="padding: 12px 8px; text-align: left; font-family: Montserrat; font-weight: 700; color: var(--blue-600);">${c.recipientCount} عميل</td>
        <td style="padding: 12px 8px; text-align: left;"><span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">✅ مكتملة</span></td>
      </tr>
    `;
  }).join('');
}

window.loadEmailCampaigns = loadEmailCampaigns;

window.restoreDefaultFeatures = async function() {
  if (!confirm("هل أنت متأكد من رغبتك في استعادة قائمة المميزات الافتراضية (8 مميزات أساسية)؟ سيؤدي ذلك لاستبدال القائمة الحالية.")) {
    return;
  }
  
  const defaultFeatures = [
    {
      id: 'feat_1',
      cardClass: 'bento-card bento-big bento-blue',
      icon: 'fas fa-bolt',
      title: 'توصيل فوري — كوينز وخدمات',
      desc: 'كوينز تصلك خلال دقائق. SBC ومهام تنجز في ساعات. ويك إند ليج تنهيها قبل انتهاء الوقت.',
      deco: '⚡',
      stat: '<strong>10</strong> دقائق متوسط توصيل الكوينز'
    },
    {
      id: 'feat_2',
      cardClass: 'bento-card bento-white',
      icon: 'fas fa-shield-halved',
      iconClass: 'bc-green',
      title: 'حماية كاملة للحساب',
      desc: '+15,000 عملية بدون أي حظر. نستخدم أسلوب Transfer Market الآمن بالكامل.'
    },
    {
      id: 'feat_3',
      cardClass: 'bento-card bento-white',
      icon: 'fas fa-rotate-left',
      iconClass: 'bc-orange',
      title: 'ضمان استرجاع المال',
      desc: 'لو ما أُنجزت خدمتك لأي سبب — المبلغ يرجع لك فوراً، بدون جدال.'
    },
    {
      id: 'feat_4',
      cardClass: 'bento-card bento-white',
      icon: 'fas fa-headset',
      iconClass: 'bc-purple',
      title: 'دعم بشري 24/7',
      desc: 'موظف حقيقي يرد عليك عبر واتساب لمساعدتك في أي استفسار، في أي وقت.'
    },
    {
      id: 'feat_5',
      cardClass: 'bento-card bento-white',
      icon: 'fas fa-tags',
      iconClass: 'bc-blue',
      title: 'أسعار تنافسية وتحديث يومي',
      desc: 'نراقب السوق يومياً لنضمن لك الحصول على أفضل قيمة مقابل مالك. أسعارنا تتحدث عن نفسها.'
    },
    {
      id: 'feat_6',
      cardClass: 'bento-card bento-white',
      icon: 'fas fa-ban',
      iconClass: 'bc-red',
      title: 'Anti-Ban مضمون',
      desc: 'طريقتنا مجربة على +15,000 عملية. لا حظر، لا تحقيق، لا مشاكل مع EA.'
    },
    {
      id: 'feat_7',
      cardClass: 'bento-card bento-wide bento-blue-light',
      icon: 'fas fa-gamepad',
      iconClass: 'bc-blue',
      title: 'كل المنصات مدعومة',
      desc: '',
      customHtml: '<div class="platform-icons-row"><div class="pi"><div class="pi-ico"><i class=\"fab fa-playstation\"></i></div><span>PS4 / PS5</span></div><div class="pi"><div class="pi-ico"><i class=\"fab fa-xbox\"></i></div><span>Xbox</span></div><div class="pi"><div class="pi-ico"><i class=\"fas fa-desktop\"></i></div><span>PC</span></div></div>'
    },
    {
      id: 'feat_8',
      cardClass: 'bento-card bento-big bento-gradient-border',
      icon: 'fas fa-lock',
      iconClass: 'bc-blue',
      title: 'حماية تامة لمعلوماتك',
      desc: 'بياناتك وحساباتك في أيدٍ أمينة. نطبق أعلى معايير الخصوصية لضمان سرية معلوماتك.',
      badges: [ '✅ تشفير عالي', '✅ سرية تامة', '✅ أمان 100%' ]
    }
  ];

  try {
    const res = await adminService.saveFeatures(defaultFeatures);
    if (res.success) {
      showStatus("✅ تم استعادة المميزات الافتراضية بنجاح وتحديث المتجر!", "success");
      activeFeaturesList = defaultFeatures;
      renderFeaturesList();
    } else {
      showStatus("حدث خطأ أثناء حفظ المميزات الافتراضية.", "error");
    }
  } catch (err) {
    console.error("Failed to restore default features:", err);
    showStatus("فشل الاتصال بالسيرفر لاستعادة المميزات.", "error");
  }
};

window.toggleCrmPasswordVisibility = function() {
  const passEl = document.getElementById('crmProfPassword');
  const eyeIcon = document.getElementById('crmProfPasswordEyeIcon');
  if (!passEl) return;

  const isVisible = passEl.getAttribute('data-visible') === 'true';
  const rawPass = passEl.getAttribute('data-password') || "—";

  if (isVisible) {
    // Hide it
    passEl.setAttribute('data-visible', 'false');
    passEl.style.letterSpacing = '2px';
    passEl.textContent = '••••••';
    if (eyeIcon) eyeIcon.className = 'fas fa-eye';
  } else {
    // Show it
    passEl.setAttribute('data-visible', 'true');
    passEl.style.letterSpacing = 'normal';
    passEl.textContent = rawPass;
    if (eyeIcon) eyeIcon.className = 'fas fa-eye-slash';
  }
};

window.promptResetUserPassword = async function() {
  if (!activeProfileUser) {
    alert("لم يتم اختيار عميل نشط.");
    return;
  }

  const newPass = prompt(`أدخل كلمة المرور الجديدة للعميل "${activeProfileUser.name}":`, "");
  if (newPass === null) return; // cancelled
  if (newPass.trim().length < 4) {
    alert("خطأ: كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل.");
    return;
  }

  try {
    const res = await adminService.resetUserPassword(activeProfileUser.id, newPass.trim());
    if (res.success) {
      alert("✅ تم تحديث كلمة مرور العميل بنجاح!");
      // Update UI displays
      activeProfileUser.rawPassword = newPass.trim();
      activeProfileUser.rawPasswordPlaintext = newPass.trim();
      
      const passEl = document.getElementById('crmProfPassword');
      const eyeIcon = document.getElementById('crmProfPasswordEyeIcon');
      if (passEl) {
        passEl.setAttribute('data-password', newPass.trim());
        passEl.setAttribute('data-visible', 'false');
        passEl.style.letterSpacing = '2px';
        passEl.textContent = '••••••';
        if (eyeIcon) eyeIcon.className = 'fas fa-eye';
      }
      
      // Reload users list to keep state fresh
      loadAllUsers();
    } else {
      alert("خطأ: " + (res.error || "فشل تعيين كلمة المرور الجديدة."));
    }
  } catch (err) {
    console.error("Failed to reset customer password:", err);
    alert("حدث خطأ أثناء الاتصال بالسيرفر لتغيير كلمة المرور.");
  }
};



