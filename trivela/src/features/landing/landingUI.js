import { CURRENCIES, DEFAULT_SETTINGS } from '../../core/config.js';
import { auth } from '../../core/auth.js';
import { api } from '../../core/api.js';
import { calculatePrice } from '../coins/coinsService.js';
import { showOrderSuccessPopup, applyExchangeRates } from '../../core/ui-helpers.js';
import '../../core/theme.js';

// State
let dynamicSettings = { ...DEFAULT_SETTINGS };
let currentPlatform = 'console';
let currentCoins = 1000000;
let currentCurrency = 'SAR';
const FAQS = [];
const REVIEWS = [];
let allCatalogItems = [];
let selectedModalService = null;
let selectedPlatform = 'console';

// DOM content load
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCounters();
  initCalculator();
  initServices();
  initSmoothScroll();
  initAnnBar();

  ['coachingModalOverlay', 'packageModalOverlay'].forEach(id => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          closeModal(id);
        }
      });
    }
  });

  // Load Configurations, FAQs, Reviews
  auth.getPublicSettings().then(data => {
    if (data) {
      dynamicSettings = data.settings || { ...DEFAULT_SETTINGS };
      applyExchangeRates(dynamicSettings.customExchangeRates);
      applyServiceToggles(dynamicSettings);
      updateSupportLinks();
      applyCMSContent();
      
      // Update Floating WhatsApp button
      const floatWa = document.querySelector('.floating-wa');
      if (floatWa) {
        floatWa.href = `https://wa.me/${dynamicSettings.whatsappPhone}`;
      }

      if (data.faqs && data.faqs.length > 0) {
        FAQS.length = 0;
        data.faqs.forEach(f => FAQS.push({ q: f.question || f.q, a: f.answer || f.a }));
      }
      
      if (data.reviews && data.reviews.length > 0) {
        REVIEWS.length = 0;
        data.reviews.forEach(r => REVIEWS.push({
          name: r.name,
          platform: r.platform,
          stars: r.stars,
          text: r.text,
          initial: r.name.charAt(0),
          badge: r.badge || ""
        }));
      }
    }
    
    initReviews();
    initFAQ();
    initReveal();
  });

  // Load Storefront Catalog
  api.get('/players')
    .then(items => {
      allCatalogItems = items;
      renderHomepageCoaching();
      renderHomepagePackages();
    })
    .catch(err => console.error("Error loading homepage catalog:", err));

  // Initialize event bindings
  initOrderForm();
  initScrollTop();
  initCalcBuyBtn();
  initCoinFloats();
  checkUserSession();

  // Bind modal forms
  const coachModalForm = document.querySelector('#coachingModalOverlay form');
  if (coachModalForm) coachModalForm.addEventListener('submit', handleCoachingModalSubmit);

  const pkgModalForm = document.querySelector('#packageModalOverlay form');
  if (pkgModalForm) pkgModalForm.addEventListener('submit', handlePackageModalSubmit);
});

// Mobile navbar menu drawer toggles
export function openMenu() {
  const menu = document.getElementById('navMenu');
  const hb = document.getElementById('hamburger');
  if (menu) menu.classList.add('open');
  if (hb) hb.classList.add('active');
}

export function closeMenu() {
  const menu = document.getElementById('navMenu');
  const hb = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (hb) hb.classList.remove('active');
}

// Check session
async function checkUserSession() {
  const user = await auth.getMe();
  const profileLink = document.getElementById('profileLink');
  const profileMobileLink = document.getElementById('profileMobileLink');
  
  if (user) {
    const text = `<i class="fas fa-user-circle"></i> حسابي`;
    if (profileLink) {
      profileLink.innerHTML = text;
      profileLink.href = 'profile.html';
    }
    if (profileMobileLink) {
      profileMobileLink.innerHTML = text;
      profileMobileLink.href = 'profile.html';
    }
  }
}

function initNavbar() {
  const nav  = document.getElementById('navbar');
  const ham  = document.getElementById('hamburger');
  const menu = document.getElementById('navMenu');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('solid', window.scrollY > 40);
    }, { passive:true });
  }

  if (ham && menu) {
    ham.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }

  updateNavbarMenu();

  if (menu) {
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (!a.classList.contains('dropdown-toggle')) {
          menu.classList.remove('open');
        }
      });
    });
  }

  // Active tab management for mobile bottom navigation bar
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  if (bottomNavItems.length > 0) {
    bottomNavItems.forEach(item => {
      item.addEventListener('click', () => {
        bottomNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }
}

function updateNavbarMenu() {
  const menuEl = document.getElementById('navMenu');
  const userSlotEl = document.getElementById('navUserSlot');
  if (!menuEl) return;
  
  const token = localStorage.getItem('shopcoin_token');
  
  if (userSlotEl) {
    if (token) {
      userSlotEl.innerHTML = `
        <div class="dropdown user-dropdown">
          <a href="javascript:void(0)" class="dropdown-toggle nav-user-btn" onclick="event.stopPropagation()">
            <i class="fas fa-circle-user" style="color: #2563eb;"></i>
            <span>حسابي</span>
            <i class="fas fa-chevron-down nav-chevron"></i>
          </a>
          <ul class="dropdown-content">
            <li>
              <a href="profile.html">
                <span class="drop-icon drop-blue"><i class="fas fa-user"></i></span>
                <div class="drop-text">
                  <strong>الملف الشخصي</strong>
                  <small>إعدادات وبيانات الحساب</small>
                </div>
              </a>
            </li>
            <li>
              <a href="profile.html#orders">
                <span class="drop-icon drop-gold"><i class="fas fa-receipt"></i></span>
                <div class="drop-text">
                  <strong>طلباتي</strong>
                  <small>سجل وتفاصيل المشتريات</small>
                </div>
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" onclick="window.handleNavbarLogout()">
                <span class="drop-icon" style="background: #fee2e2; color: #ef4444;"><i class="fas fa-arrow-right-from-bracket"></i></span>
                <div class="drop-text">
                  <strong style="color: #ef4444;">تسجيل الخروج</strong>
                  <small>إنهاء الجلسة الحالية</small>
                </div>
              </a>
            </li>
          </ul>
        </div>
      `;
    } else {
      userSlotEl.innerHTML = `
        <a href="login.html" class="nav-login-btn">
          <i class="fas fa-arrow-right-to-bracket"></i>
          <span>دخول</span>
        </a>
      `;
    }
  }

  menuEl.innerHTML = `
    <li>
      <a href="#coins-device" class="nav-link nav-highlight">
        <i class="fas fa-bolt" style="color: #eab308;"></i>
        <span>شحن الكوينز</span>
      </a>
    </li>
    <li class="dropdown">
      <a href="javascript:void(0)" class="dropdown-toggle nav-link" onclick="event.stopPropagation()">
        <i class="fas fa-cubes"></i>
        <span>الخدمات</span>
        <i class="fas fa-chevron-down nav-chevron"></i>
      </a>
      <ul class="dropdown-content">
        <li>
          <a href="buy-sbc.html">
            <span class="drop-icon drop-purple"><i class="fas fa-puzzle-piece"></i></span>
            <div class="drop-text">
              <strong>تحديات الـ SBC</strong>
              <small>حل فوري لجميع التحديات</small>
            </div>
          </a>
        </li>
        <li>
          <a href="buy-objectives.html">
            <span class="drop-icon drop-green"><i class="fas fa-list-check"></i></span>
            <div class="drop-text">
              <strong>المهام (Objectives)</strong>
              <small>إنهاء الحزم ومواسم الجوائز</small>
            </div>
          </a>
        </li>
        <li>
          <a href="buy-rivals.html">
            <span class="drop-icon drop-blue"><i class="fas fa-shield-halved"></i></span>
            <div class="drop-text">
              <strong>ترقية Rivals</strong>
              <small>رفع التصنيف الأسبوعي</small>
            </div>
          </a>
        </li>
        <li>
          <a href="buy-champions.html">
            <span class="drop-icon drop-gold"><i class="fas fa-trophy"></i></span>
            <div class="drop-text">
              <strong>بطولة Champions</strong>
              <small>حسم التصفيات والنهائيات</small>
            </div>
          </a>
        </li>
      </ul>
    </li>
    <li>
      <a href="#coaching-section" class="nav-link">
        <i class="fas fa-headset"></i>
        <span>الاستشارات</span>
      </a>
    </li>
    <li>
      <a href="reviews.html" class="nav-link">
        <i class="fas fa-star" style="color: #eab308;"></i>
        <span>التقييمات</span>
      </a>
    </li>
    <li>
      <a href="#faq" class="nav-link">
        <i class="fas fa-circle-question"></i>
        <span>الأسئلة الشائعة</span>
      </a>
    </li>
  `;

  // Bind click toggle for mobile/touch devices
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.closest('.dropdown');
      if (!parent) return;
      const content = parent.querySelector('.dropdown-content');
      if (content) {
        const isOpen = content.style.display === 'block';
        document.querySelectorAll('.dropdown-content').forEach(c => {
          if (c !== content) c.style.display = 'none';
        });
        content.style.display = isOpen ? 'none' : 'block';
      }
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(c => {
      c.style.display = '';
    });
  });
}

window.handleNavbarLogout = function() {
  localStorage.removeItem('shopcoin_token');
  localStorage.removeItem('shopcoin_user');
  window.location.reload();
};

function initCounters() {
  const els = document.querySelectorAll('.counter');
  els.forEach(el => {
    const end = parseInt(el.dataset.to, 10);
    if (isNaN(end)) return;
    const dur = 1400;
    const t0 = performance.now();
    const step = ts => {
      const p = Math.min((ts - t0) / dur, 1);
      const v = Math.round(p * p * (3 - 2 * p) * end);
      const suffix = el.dataset.suffix || '';
      el.textContent = new Intl.NumberFormat('en-US').format(v) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Obsolete calculator on homepage
function initCalculator() {}

// Support links updates
function updateSupportLinks() {
  const waLinks = document.querySelectorAll('a[href^="https://wa.me/"], a.wa-link');
  waLinks.forEach(link => {
    try {
      const urlObj = new URL(link.href);
      const text = urlObj.searchParams.get('text') || '';
      link.href = `https://wa.me/${dynamicSettings.whatsappPhone}` + (text ? `?text=${encodeURIComponent(text)}` : '');
    } catch(e) {
      link.href = `https://wa.me/${dynamicSettings.whatsappPhone}`;
    }
  });
  
  const igLinks = document.querySelectorAll('a[href*="instagram.com"]');
  igLinks.forEach(link => {
    link.href = dynamicSettings.instagramUrl;
    const span = link.querySelector('span');
    if (span && span.textContent.startsWith('@')) {
      const username = dynamicSettings.instagramUrl.split('/').filter(Boolean).pop() || 'ShopCoin';
      span.textContent = `@${username}`;
    }
  });
}

// Dynamic coaching and packages rendering
function renderHomepageCoaching() {
  const grid = document.getElementById('homepageCoachingGrid');
  const items = allCatalogItems.filter(i => i.category === 'coaching');
  if (!grid) return;
  if (items.length === 0) {
    document.getElementById('noHomeCoachingText').style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  
  document.getElementById('noHomeCoachingText').style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = items.map(p => `
    <div class="coaching-card-home" onclick="openBookingModal('${p.id}', 'coaching')" style="cursor: pointer;">
      <div class="prod-img-wrap" style="height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <img src="${p.image}" style="height: 90px; width: auto; object-fit: contain;" alt="${p.name}"/>
      </div>
      <h3 class="product-title" style="font-size: 1.15rem; font-weight: 800; color: #1b355a; margin: 0 0 6px 0;">${p.name}</h3>
      <div style="font-size: 0.85rem; color: #64748b; font-weight: bold; margin-bottom: 12px;">${p.version || 'استشارة فنية'}</div>
      <div style="font-family: Montserrat, sans-serif; font-size: 1.4rem; font-weight: 900; color: #10b981; margin-bottom: 16px;">${p.priceSAR} ر.س</div>
      <button type="button" class="qa-btn" style="background:#14b8a6; color:#fff; border:0; padding:10px 20px; border-radius:20px; font-weight:bold; font-size:0.85rem; width:100%; cursor: pointer;">حجز الخدمة الآن</button>
    </div>
  `).join('');
}

function renderHomepagePackages() {
  const grid = document.getElementById('homepagePackagesGrid');
  const allItems = allCatalogItems;
  const items = allCatalogItems.filter(i => i.category === 'packages').slice(0, 3);
  if (!grid) return;
  if (items.length === 0) {
    document.getElementById('noHomePackagesText').style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  document.getElementById('noHomePackagesText').style.display = 'none';
  grid.style.display = 'grid';

  grid.innerHTML = items.map(p => {
    const discount = p.discountPercent || 0;
    const coinsAmount = p.coinsAmount || 0;
    const coinsFormatted = coinsAmount >= 1000000
      ? (coinsAmount / 1000000).toFixed(coinsAmount % 1000000 === 0 ? 0 : 1) + 'M'
      : coinsAmount >= 1000 ? (coinsAmount / 1000).toFixed(0) + 'K' : coinsAmount.toString();

    // Resolve linked player
    const linkedPlayer = allItems.find(pl => pl.id === p.bundlePlayerId);
    const playerName = linkedPlayer ? linkedPlayer.name : (p.name || 'باقة مميزة');
    const playerImg = linkedPlayer ? linkedPlayer.image : p.image;
    const playerRating = linkedPlayer ? linkedPlayer.rating : p.rating;

    const originalPriceSAR = p.originalPriceSAR || (discount > 0 ? Math.round(p.priceSAR / (1 - discount / 100)) : null);

    return `
      <div class="pkg-bundle-card home-pkg-card" onclick="window.location.href='buy-packages.html?service=${p.id}'" style="cursor:pointer; min-height: 380px;">
        ${discount > 0 ? `<div class="pkg-discount-badge">وفّر ${discount}%</div>` : ''}

        <div class="pkg-header-wrap">
          <div class="pkg-badge-pill">${p.version || 'باقة مميزة'}</div>
          <h3 class="pkg-card-title">${p.name || 'باقة مميزة'}</h3>
        </div>

        <div class="pkg-main-body">
          <div class="pkg-feature-item">
            <div class="pkg-feature-icon">🪙</div>
            <div class="pkg-feature-info">
              <span class="pkg-feature-val">${coinsFormatted}</span>
              <span class="pkg-feature-lbl">كوينز FUT</span>
            </div>
          </div>
          <div class="pkg-feature-item">
            <div class="pkg-feature-icon">🎮</div>
            <div class="pkg-feature-info">
              <span class="pkg-feature-val">${p.position || 'خدمة مجمعة'}</span>
              <span class="pkg-feature-lbl">الخدمة المرفقة</span>
            </div>
          </div>
        </div>

        <div class="pkg-pricing-section" style="border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; padding-bottom: 20px;">
          <div class="pkg-price-label">السعر الإجمالي:</div>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; direction: rtl;">
            <div class="pkg-price-row" style="flex-direction: row-reverse; gap: 8px;">
              ${originalPriceSAR ? `<span class="pkg-old-price">${originalPriceSAR} ر.س</span>` : ''}
              <span class="pkg-new-price">${p.priceSAR} ر.س</span>
            </div>
            <a href="buy-packages.html?service=${p.id}" class="pkg-cta-btn" onclick="event.stopPropagation();" style="margin-top: 0; padding: 8px 16px; font-size: 0.8rem; border-radius: 8px;">
              <i class="fas fa-bolt"></i> اطلب الآن
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Modal bookings handlers
export function selectModalPlatform(platform) {
  selectedPlatform = platform.toLowerCase();
  
  const consoleBtn = document.getElementById('modalPlatformConsole');
  const pcBtn = document.getElementById('modalPlatformPC');
  if (consoleBtn) consoleBtn.classList.toggle('active', platform === 'Console');
  if (pcBtn) pcBtn.classList.toggle('active', platform === 'PC');
  
  const consolePkgBtn = document.getElementById('modalPlatformConsolePkg');
  const pcPkgBtn = document.getElementById('modalPlatformPCPkg');
  if (consolePkgBtn) consolePkgBtn.classList.toggle('active', platform === 'Console');
  if (pcPkgBtn) pcPkgBtn.classList.toggle('active', platform === 'PC');
}

function forceModalFixed(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('z-index', '99999', 'important');
    el.style.setProperty('top', '0', 'important');
    el.style.setProperty('left', '0', 'important');
    el.style.setProperty('right', '0', 'important');
    el.style.setProperty('bottom', '0', 'important');
  }
}

let modalSelectedBookingDate = null;
let modalSelectedBookingTime = null;
let modalCoachingScheduleData = { workingDays: [0, 1, 2, 3, 4, 5, 6], startHour: 14, endHour: 23, slotDurationMinutes: 60, bookedSlots: [] };

function resetModalCoachingCalendarState() {
  modalSelectedBookingDate = null;
  modalSelectedBookingTime = null;
  const banner = document.getElementById('modalSelectedSlotBanner');
  if (banner) banner.style.display = 'none';
  const timeSlotsContainer = document.getElementById('modalTimeSlotsContainer');
  if (timeSlotsContainer) {
    timeSlotsContainer.innerHTML = '<div class="slot-placeholder-msg" style="grid-column: 1 / -1; text-align: center; font-size: 0.8rem; color: #94a3b8;">👈 اختر اليوم أولاً لعرض الأوقات المتاحة.</div>';
  }
}

function loadModalCoachingCalendar() {
  resetModalCoachingCalendarState();
  fetch('/api/public/coaching-schedule')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && Array.isArray(data.workingDays)) modalCoachingScheduleData = data;
      renderModalCalendarDays();
    })
    .catch(() => {
      renderModalCalendarDays();
    });
}

function renderModalCalendarDays() {
  const container = document.getElementById('modalCalendarDaysContainer');
  if (!container) return;
  container.innerHTML = '';

  const dayNamesArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const monthNamesArabic = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const today = new Date();
  const workingDays = modalCoachingScheduleData.workingDays || [0, 1, 2, 3, 4, 5, 6];

  let firstValid = null;

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);

    const dayOfWeek = d.getDay();
    const dateIsoStr = d.toISOString().split('T')[0];
    const isWorking = workingDays.includes(dayOfWeek);

    const dayName = dayNamesArabic[dayOfWeek];
    const dayNum = d.getDate();
    const monthName = monthNamesArabic[d.getMonth()];

    const chip = document.createElement('div');
    chip.className = `day-chip ${isWorking ? '' : 'disabled'}`;
    chip.dataset.date = dateIsoStr;
    chip.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-num">${dayNum}</span>
      <span class="day-month">${monthName}</span>
    `;

    if (isWorking) {
      chip.onclick = () => selectModalBookingDate(dateIsoStr, chip, dayName, dayNum, monthName);
      if (!firstValid) firstValid = { dateIsoStr, chip, dayName, dayNum, monthName };
    }

    container.appendChild(chip);
  }

  if (firstValid) {
    selectModalBookingDate(firstValid.dateIsoStr, firstValid.chip, firstValid.dayName, firstValid.dayNum, firstValid.monthName);
  }
}

function selectModalBookingDate(dateIsoStr, chipElement, dayName, dayNum, monthName) {
  modalSelectedBookingDate = dateIsoStr;
  modalSelectedBookingTime = null;

  const parent = chipElement.parentElement;
  if (parent) {
    const currentActive = parent.querySelector('.day-chip.active');
    if (currentActive) currentActive.classList.remove('active');
  }
  chipElement.classList.add('active');

  const banner = document.getElementById('modalSelectedSlotBanner');
  if (banner) banner.style.display = 'none';

  renderModalTimeSlots(dateIsoStr, `${dayName} ${dayNum} ${monthName}`);
}

function renderModalTimeSlots(dateIsoStr, formattedDayText) {
  const container = document.getElementById('modalTimeSlotsContainer');
  if (!container) return;
  container.innerHTML = '';

  const dateObj = new Date(dateIsoStr + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  const daysConfig = modalCoachingScheduleData.daysConfig || {};
  const dayCfg = daysConfig[dayOfWeek] || {};

  const startHour = dayCfg.startHour !== undefined ? dayCfg.startHour : (modalCoachingScheduleData.startHour || 14);
  const endHour = dayCfg.endHour !== undefined ? dayCfg.endHour : (modalCoachingScheduleData.endHour || 23);
  const booked = modalCoachingScheduleData.bookedSlots || [];

  let firstValidSlot = null;

  for (let hour = startHour; hour < endHour; hour++) {
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const periodStr = hour >= 12 ? 'مساءً' : 'صباحاً';
    const timeLabel = `${displayHour.toString().padStart(2, '0')}:00 ${periodStr}`;

    const isBooked = booked.some(b => b.date === dateIsoStr && (b.time === timeLabel || b.time === `${hour}:00`));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `time-slot-btn ${isBooked ? 'booked' : ''}`;
    btn.innerHTML = `<i class="far fa-clock"></i> <span>${timeLabel}</span>`;

    if (isBooked) {
      btn.title = 'هذا الموعد محجوز مسبقاً';
    } else {
      btn.onclick = () => selectModalBookingTime(timeLabel, btn, formattedDayText);
      if (!firstValidSlot) firstValidSlot = { timeLabel, btn, formattedDayText };
    }

    container.appendChild(btn);
  }

  if (firstValidSlot) {
    selectModalBookingTime(firstValidSlot.timeLabel, firstValidSlot.btn, firstValidSlot.formattedDayText);
  }
}

function selectModalBookingTime(timeLabel, btnElement, formattedDayText) {
  modalSelectedBookingTime = timeLabel;

  const parent = btnElement.parentElement;
  if (parent) {
    const currentActive = parent.querySelector('.time-slot-btn.active');
    if (currentActive) currentActive.classList.remove('active');
  }
  btnElement.classList.add('active');

  const banner = document.getElementById('modalSelectedSlotBanner');
  const txt = document.getElementById('modalLblSelectedSlotText');
  if (banner && txt) {
    txt.textContent = `${formattedDayText} — الساعة ${timeLabel}`;
    banner.style.display = 'flex';
  }
}

export function openStaticCoachingBooking(packageName, priceSAR) {
  const titleEl = document.getElementById('modalCoachingTitle');
  if (titleEl) titleEl.textContent = `حجز باقة: ${packageName}`;
  const priceEl = document.getElementById('modalCoachingPrice');
  if (priceEl) priceEl.textContent = `${priceSAR} ر.س`;
  
  selectedModalService = {
    id: `coaching_static_${packageName}`,
    name: `باقة ${packageName}`,
    priceSAR: priceSAR,
    category: 'coaching'
  };
  
  selectedPlatform = 'console';
  if (typeof selectModalPlatform === 'function') selectModalPlatform('Console');
  
  const nameInput = document.getElementById('modalContactName');
  if (nameInput) nameInput.value = '';
  const instaInput = document.getElementById('modalContactInstagram');
  if (instaInput) instaInput.value = '';
  const notesInput = document.getElementById('modalCoachingNotes');
  if (notesInput) notesInput.value = '';
  
  if (typeof auth !== 'undefined' && auth.getMe) {
    auth.getMe().then(user => {
      if (user && user.name && nameInput) {
        nameInput.value = user.name;
      }
    }).catch(() => {});
  }

  loadModalCoachingCalendar();

  forceModalFixed('coachingModalOverlay');
  const modal = document.getElementById('coachingModalOverlay');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
}

export function openStaticPackageBooking(packageName, priceSAR) {
  const titleEl = document.getElementById('modalPackageTitle');
  if (titleEl) titleEl.textContent = `شراء ${packageName}`;
  const priceEl = document.getElementById('modalPackagePrice');
  if (priceEl) priceEl.textContent = `${priceSAR} ر.س`;
  
  selectedModalService = {
    id: `package_static_${packageName}`,
    name: packageName,
    priceSAR: priceSAR,
    category: 'packages'
  };
  
  selectedPlatform = 'console';
  if (typeof selectModalPlatform === 'function') selectModalPlatform('Console');
  
  const emailInput = document.getElementById('modalEaEmail');
  if (emailInput) emailInput.value = '';
  const passInput = document.getElementById('modalEaPassword');
  if (passInput) passInput.value = '';
  
  forceModalFixed('packageModalOverlay');
  const modal = document.getElementById('packageModalOverlay');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
}

export function openBookingModal(id, category) {
  const service = allCatalogItems.find(item => item.id === id);
  if (!service) return;
  
  selectedModalService = service;
  selectedPlatform = 'console';
  selectModalPlatform('Console');

  if (category === 'coaching') {
    const titleEl = document.getElementById('modalCoachingTitle');
    if (titleEl) titleEl.textContent = `حجز ${service.name}`;
    const priceEl = document.getElementById('modalCoachingPrice');
    if (priceEl) priceEl.textContent = `${service.priceSAR} ر.س`;
    
    loadModalCoachingCalendar();

    forceModalFixed('coachingModalOverlay');
    const modal = document.getElementById('coachingModalOverlay');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  } else {
    const titleEl = document.getElementById('modalPackageTitle');
    if (titleEl) titleEl.textContent = `شراء ${service.name}`;
    const priceEl = document.getElementById('modalPackagePrice');
    if (priceEl) priceEl.textContent = `${service.priceSAR} ر.س`;
    
    forceModalFixed('packageModalOverlay');
    const modal = document.getElementById('packageModalOverlay');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }
}

export function closeModal(modalId) {
  const el = document.getElementById(modalId || 'coachingModalOverlay');
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
  const pkgModal = document.getElementById('packageModalOverlay');
  if (pkgModal && (!modalId || modalId === 'packageModalOverlay')) {
    pkgModal.classList.remove('open');
    pkgModal.style.display = 'none';
  }
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

export function handleCoachingModalSubmit(event) {
  event.preventDefault();
  if (!selectedModalService) return;

  if (!modalSelectedBookingDate || !modalSelectedBookingTime) {
    alert("يرجى اختيار يوم ووقت الجلسة المباشرة من التقويم أولاً.");
    return;
  }
  
  const contactName = document.getElementById('modalContactName').value.trim();
  const contactPhone = document.getElementById('modalContactPhone').value.trim();
  const instaInput = document.getElementById('modalContactInstagram');
  const instagram = instaInput ? instaInput.value.trim() : '';
  const notes = document.getElementById('modalCoachingNotes').value.trim() || 'بدون ملاحظات إضافية';

  const bookingFormatted = `${modalSelectedBookingDate} الساعة ${modalSelectedBookingTime}`;

  const orderPayload = {
    customerName: contactName,
    customerPhone: contactPhone,
    service: `استشارة: ${selectedModalService.name}`,
    platform: selectedPlatform,
    priceSAR: selectedModalService.priceSAR,
    instagramHandle: instagram,
    orderNotes: notes,
    bookingDate: modalSelectedBookingDate,
    bookingTime: modalSelectedBookingTime,
    pointsDiscount: 0,
    pointsDeducted: 0
  };
  
  api.post('/orders', orderPayload)
    .then(data => {
      closeModal('coachingModalOverlay');
      if (data.success && data.order) {
        let extraInfo = '';
        if (instagram) extraInfo += `\n- انستقرام: ${instagram}`;

        const messageText = `تفاصيل الطلب:
- رقم الطلب: #${data.order.id}
- العميل: ${contactName}
- المنصة: ${selectedPlatform.toUpperCase()}
- الخدمة: ${selectedModalService.name}
- موعد الجلسة المباشرة: ${bookingFormatted}${extraInfo}
- إجمالي السعر المتوقع: ${selectedModalService.priceSAR} ر.س`;
        showOrderSuccessPopup(data.order.id, dynamicSettings.whatsappPhone, messageText);
      } else {
        alert("حدث خطأ أثناء حجز الخدمة.");
      }
    })
    .catch(err => {
      console.warn("Could not log order:", err);
      closeModal('coachingModalOverlay');
      alert("حدث خطأ في الاتصال بالخادم.");
    });
}

export function handlePackageModalSubmit(event) {
  event.preventDefault();
  if (!selectedModalService) return;
  
  const name = document.getElementById('modalEaName').value.trim();
  const phone = document.getElementById('modalEaPhone').value.trim();
  const email = document.getElementById('modalEaEmail').value.trim();
  const password = document.getElementById('modalEaPassword').value.trim();
  const code1 = document.getElementById('modalBackup1').value.trim();
  const code2 = document.getElementById('modalBackup2').value.trim();
  const code3 = document.getElementById('modalBackup3').value.trim();
  
  const orderPayload = {
    customerName: name,
    customerPhone: phone,
    service: `باقة مميزة: ${selectedModalService.name}`,
    platform: selectedPlatform,
    priceSAR: selectedModalService.priceSAR,
    pointsDiscount: 0,
    pointsDeducted: 0
  };
  
  api.post('/orders', orderPayload)
    .then(data => {
      closeModal('packageModalOverlay');
      if (data.success && data.order) {
        const messageText = `تفاصيل الطلب:
- رقم الطلب: #${data.order.id}
- العميل: ${name}
- المنصة: ${selectedPlatform.toUpperCase()}
- الخدمة: ${selectedModalService.name}
- إجمالي السعر المتوقع: ${selectedModalService.priceSAR} ر.س`;
        showOrderSuccessPopup(data.order.id, dynamicSettings.whatsappPhone, messageText);
      } else {
        alert("حدث خطأ أثناء حجز الباقة.");
      }
    })
    .catch(err => {
      console.warn("Could not log order:", err);
      closeModal('packageModalOverlay');
      alert("حدث خطأ في الاتصال بالخادم.");
    });
}

// Reviews Carousel population
function initReviews() {
  const container = document.getElementById('reviewsMasonry');
  if (!container) return;

  if (REVIEWS.length === 0) {
    container.innerHTML = `<div style="text-align:center;grid-column:1/-1;color:#64748b;">لا توجد تقييمات معروضة حالياً.</div>`;
    return;
  }

  // Display top 6 reviews on the homepage
  const displayedReviews = REVIEWS.slice(0, 6);

  container.innerHTML = displayedReviews.map(r => `
    <div class="rc">
      <div class="rc-top">
        <div class="rc-avatar">${r.initial}</div>
        <div class="rc-info">
          <strong>${r.name}</strong>
          <span>${r.badge ? r.badge + ' · ' : ''}<i class="fas fa-gamepad" style="margin-left: 3px;"></i> ${r.platform}</span>
        </div>
      </div>
      <div class="rc-stars" style="color: #f59e0b; margin: 8px 0; font-size: 0.95rem;">${'<i class="fas fa-star"></i>'.repeat(r.stars)}</div>
      <p class="rc-text" style="line-height: 1.6; color: #334155; font-size: 0.9rem;">"${r.text}"</p>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px; font-size: 0.76rem; color: #64748b;">
        <span style="color: #10b981; font-weight: 700;"><i class="fas fa-shield-check"></i> عملية شراء موثقة</span>
        <span>FIFA 27 Ultimate Team</span>
      </div>
    </div>
  `).join('');
}

// FAQ Accordion
function initFAQ() {
  const list = document.getElementById('faqList');
  if (!list) return;

  if (FAQS.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:#64748b;">لا توجد أسئلة شائعة حالياً.</p>`;
    return;
  }

  list.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item ${i === 0 ? 'open' : ''}" id="faq-item-${i}">
      <div class="faq-q" onclick="toggleFAQ(${i})">
        <span>${f.q}</span>
        <div class="faq-chevron"><i class="fas fa-chevron-down"></i></div>
      </div>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>
  `).join('');
}

export function toggleFAQ(i) {
  document.querySelectorAll('.faq-item').forEach((el, idx) => {
    el.classList.toggle('open', idx === i && !el.classList.contains('open'));
  });
}

// Reveal animations on scroll
function initReveal() {
  const items = document.querySelectorAll('.bento-card, .how-step, .rc');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = 'fadeUp 0.55s ease both';
        io.unobserve(e.target);
      }
    });
  }, { threshold:0.08 });
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.animationDelay = (i % 4) * 70 + 'ms';
    io.observe(el);
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior:'smooth' });
      }
    });
  });
}

function initOrderForm() {
  const form = document.getElementById('orderForm');
  const modal = document.getElementById('modalBg');
  const close = document.getElementById('closeModal');

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name     = document.getElementById('fName').value;
      const platform = document.getElementById('fPlatform').value;
      const currency = document.getElementById('fCurrency').value;
      const coinsEl  = document.getElementById('fCoins');
      const coins    = coinsEl ? coinsEl.value : 'غير محدد';
      const contact  = document.getElementById('fContact').value;
      const notes    = document.getElementById('fNotes').value;
      const srvEl    = document.getElementById('fService');
      const service  = srvEl ? srvEl.value : 'غير محدد';

      const msg = encodeURIComponent(
        '🎮 طلب جديد — ShopCoin\n\n' +
        '👤 الاسم: ' + name + '\n' +
        '🛠️ الخدمة: ' + service + '\n' +
        '🕹️ المنصة: ' + platform + '\n' +
        '💰 الكمية: ' + coins + '\n' +
        '💵 العملة: ' + currency + '\n' +
        '📱 التواصل: ' + contact + '\n' +
        '📝 ملاحظات: ' + (notes || 'لا يوجد') + '\n\n' +
        '_أرسل من ShopCoin15.com_'
      );
      window.open(`https://wa.me/${dynamicSettings.whatsappPhone}?text=${msg}`, '_blank');
      if (modal) modal.classList.add('open');
      form.reset();
    });
  }

  if (close) {
    close.addEventListener('click', () => { if(modal) modal.classList.remove('open'); });
  }
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  }
}

function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if(!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 350);
  }, { passive:true });
  btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
}

function initServices() {}

function initAnnBar() {
  const slides = document.querySelectorAll('.ann-slide');
  const closeBtn = document.getElementById('annClose');
  const annBar = document.getElementById('annBar');
  
  if (!slides.length || !annBar) return;
  
  let curIndex = 0;
  setInterval(() => {
    slides[curIndex].classList.remove('active');
    curIndex = (curIndex + 1) % slides.length;
    slides[curIndex].classList.add('active');
  }, 4000);

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      annBar.style.display = 'none';
    });
  }
}

function initCoinFloats() {
  const floats = document.querySelectorAll('.fifa-deco');
  floats.forEach((el, i) => {
    const baseBottom = parseFloat(el.style.bottom) || 10;
    el.style.bottom = baseBottom + 'vh';
    setTimeout(() => {
      el.style.opacity = '1';
    }, i * 800);
  });
}

export function setPlatformField(plat) {
  const platSel = document.getElementById('fPlatform');
  const srvSel  = document.getElementById('fService');
  if (platSel) {
    if (plat === 'PC') {
      platSel.value = 'PC';
      if (srvSel) {
        for (let i = 0; i < srvSel.options.length; i++) {
          if (srvSel.options[i].text.includes('PC')) {
            srvSel.selectedIndex = i;
            break;
          }
        }
      }
    } else {
      platSel.value = 'PS5';
      if (srvSel) {
        for (let i = 0; i < srvSel.options.length; i++) {
          if (srvSel.options[i].text.includes('PS5')) {
            srvSel.selectedIndex = i;
            break;
          }
        }
      }
    }
  }
}

export function setServiceField(srv) {
  const srvSel = document.getElementById('fService');
  if (srvSel) {
    for (let i = 0; i < srvSel.options.length; i++) {
      if (srvSel.options[i].text.includes(srv)) {
        srvSel.selectedIndex = i;
        break;
      }
    }
  }
}

function initCalcBuyBtn() {
  const btn = document.getElementById('calcBuyBtn');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const coinsFormatted = new Intl.NumberFormat('en-US').format(currentCoins) + ' كوين';
    const coinsInput = document.getElementById('fCoins');
    if (coinsInput) coinsInput.value = coinsFormatted;
    const currSelect = document.getElementById('fCurrency');
    if (currSelect) currSelect.value = currentCurrency;
  });
}

// Bind to window to allow HTML inline handlers to work seamlessly
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.toggleFAQ = toggleFAQ;
window.openBookingModal = openBookingModal;
window.openStaticCoachingBooking = openStaticCoachingBooking;
window.openStaticCoachingBookingModal = openStaticCoachingBooking;
window.openStaticPackageBooking = openStaticPackageBooking;
window.closeModal = closeModal;
window.selectModalPlatform = selectModalPlatform;
window.setPlatformField = setPlatformField;
window.setServiceField = setServiceField;
window.handleCoachingModalSubmit = handleCoachingModalSubmit;
window.handlePackageModalSubmit = handlePackageModalSubmit;
window.getSelectedModalService = () => selectedModalService;
window.setSelectedModalService = (val) => { selectedModalService = val; };

function applyCMSContent() {
  const content = dynamicSettings.content;
  if (!content) return;

  // 1. Landing Page / Home Content
  if (content.landing) {
    const l = content.landing;
    
    const h1 = document.getElementById('cms_heroTitle');
    if (h1 && l.heroTitle) h1.textContent = l.heroTitle;

    const desc = document.getElementById('cms_heroSubTitle');
    if (desc && l.heroSubTitle) desc.textContent = l.heroSubTitle;

    const security = document.getElementById('cms_statSecurityLabel');
    if (security && l.statSecurityLabel) security.textContent = l.statSecurityLabel;

    const statCount = document.getElementById('cms_statOrdersCount');
    if (statCount && l.statOrdersCount) {
      statCount.setAttribute('data-to', l.statOrdersCount.replace(/[^0-9]/g, ''));
    }

    const statLabel = document.getElementById('cms_statOrdersLabel');
    if (statLabel && l.statOrdersLabel) statLabel.textContent = l.statOrdersLabel;

    const statTime = document.getElementById('cms_statDeliveryTime');
    if (statTime && l.statDeliveryTime) {
      statTime.setAttribute('data-to', l.statDeliveryTime.replace(/[^0-9]/g, '') || '60');
      statTime.removeAttribute('data-suffix');
      const suffix = l.statDeliveryTime.replace(/[0-9]/g, '').trim() || 'دقيقة';
      const unitEl = document.getElementById('cms_statDeliveryUnit') || (statTime.nextElementSibling && statTime.nextElementSibling.tagName === 'SUP' ? statTime.nextElementSibling : null);
      if (unitEl) {
        unitEl.textContent = suffix;
      }
    }

    const statTimeLabel = document.getElementById('cms_statDeliveryLabel');
    if (statTimeLabel && l.statDeliveryLabel) statTimeLabel.textContent = l.statDeliveryLabel;

    const gBadge = document.getElementById('cms_guaranteeBadge');
    if (gBadge && l.guaranteeBadge) gBadge.textContent = l.guaranteeBadge;

    const gTitle = document.getElementById('cms_guaranteeTitle');
    if (gTitle && l.guaranteeTitle) gTitle.textContent = l.guaranteeTitle;

    const gSub = document.getElementById('cms_guaranteeSubTitle');
    if (gSub && l.guaranteeSubTitle) gSub.textContent = l.guaranteeSubTitle;

    const pTitle = document.getElementById('cms_platformTitle');
    if (pTitle && l.platformTitle) pTitle.textContent = l.platformTitle;

    const pSub = document.getElementById('cms_platformSubTitle');
    if (pSub && l.platformSubTitle) pSub.textContent = l.platformSubTitle;

    const cTitle = document.getElementById('cms_catalogTitle');
    if (cTitle && l.catalogTitle) cTitle.textContent = l.catalogTitle;

    const fTitle = document.getElementById('cms_featuresTitle');
    if (fTitle && l.featuresTitle) {
      if (l.featuresTitle.includes('ShopCoin')) {
        fTitle.innerHTML = l.featuresTitle.replace('ShopCoin', '<span class="blue-word">ShopCoin</span>');
      } else {
        fTitle.textContent = l.featuresTitle;
      }
    }

    const fSub = document.getElementById('cms_featuresSubTitle');
    if (fSub && l.featuresSubTitle) fSub.textContent = l.featuresSubTitle;

    // Dynamic Bento Grid Features
    const grid = document.getElementById('cms_bentoGrid');
    if (grid && dynamicSettings.features && dynamicSettings.features.length > 0) {
      grid.innerHTML = dynamicSettings.features.map(feat => {
        const iconCls = feat.iconClass ? `bc-icon ${feat.iconClass}` : 'bc-icon';
        const decoHtml = feat.deco ? `<div class="bento-deco"><span>${feat.deco}</span></div>` : '';
        const statHtml = feat.stat ? `<div class="bc-stat">${feat.stat}</div>` : '';
        let badgesHtml = '';
        if (feat.badges && feat.badges.length > 0) {
          badgesHtml = `<div class="transparent-badges">${feat.badges.map(b => `<span>${b}</span>`).join('')}</div>`;
        }
        const bodyHtml = feat.customHtml || `<p>${feat.desc || ''}</p>`;
        return `
          <div class="${feat.cardClass}">
            <div class="${iconCls}"><i class="${feat.icon}"></i></div>
            <h3>${feat.title}</h3>
            ${bodyHtml}
            ${decoHtml}
            ${statHtml}
            ${badgesHtml}
          </div>
        `;
      }).join('');
    }

    const howTitle = document.getElementById('cms_howSectionTitle');
    if (howTitle && l.howSectionTitle) {
      if (l.howSectionTitle.includes('بس')) {
        howTitle.innerHTML = l.howSectionTitle.replace('بس', '<span class="blue-word">بس</span>');
      } else {
        howTitle.textContent = l.howSectionTitle;
      }
    }

    const howSub = document.getElementById('cms_howSectionSubTitle');
    if (howSub && l.howSectionSubTitle) howSub.textContent = l.howSectionSubTitle;

    const s1Title = document.getElementById('cms_landingStep1Title');
    if (s1Title && l.landingStep1Title) s1Title.textContent = l.landingStep1Title;

    const s1Desc = document.getElementById('cms_landingStep1Desc');
    if (s1Desc && l.landingStep1Desc) s1Desc.textContent = l.landingStep1Desc;

    const s2Title = document.getElementById('cms_landingStep2Title');
    if (s2Title && l.landingStep2Title) s2Title.textContent = l.landingStep2Title;

    const s2Desc = document.getElementById('cms_landingStep2Desc');
    if (s2Desc && l.landingStep2Desc) s2Desc.textContent = l.landingStep2Desc;

    const s3Title = document.getElementById('cms_landingStep3Title');
    if (s3Title && l.landingStep3Title) s3Title.textContent = l.landingStep3Title;

    const s3Desc = document.getElementById('cms_landingStep3Desc');
    if (s3Desc && l.landingStep3Desc) s3Desc.textContent = l.landingStep3Desc;

    const stepsNote = document.getElementById('cms_landingStepsBottomNote');
    if (stepsNote && l.landingStepsBottomNote) stepsNote.textContent = l.landingStepsBottomNote;

    // Re-initialize counters to animate updated stats
    if (typeof initCounters === 'function') {
      initCounters();
    }
  }

  // 2. Coaching Packages on Home
  if (content.coaching && content.coaching.length > 0) {
    const coachingGrid = document.querySelector('.premium-pricing-grid');
    if (coachingGrid) {
      coachingGrid.innerHTML = content.coaching.map((pkg, idx) => {
        const isFeatured = pkg.id === 'coaching_pro';
        const featuresList = (pkg.features || []).map(f => `<li><i class="fas fa-check-circle"></i><span>${f}</span></li>`).join('');
        return `
          <div class="premium-pricing-card ${isFeatured ? 'featured' : ''}">
            ${isFeatured ? '<div class="featured-badge">الأكثر طلباً 🔥</div>' : ''}
            <div class="pkg-header">
              <div class="pkg-icon-wrap"><i class="${idx === 0 ? 'fas fa-seedling' : idx === 1 ? 'fas fa-fire-flame-simple' : 'fas fa-crown'}"></i></div>
              <h3 class="pkg-name">${pkg.name}</h3>
              <div class="pkg-price-row">
                <span class="pkg-price-sar">${pkg.priceSAR}</span>
                <span class="pkg-curr">ر.س</span>
                <span class="pkg-price-usd">($${pkg.priceUSD})</span>
              </div>
              <p class="pkg-desc">${pkg.description || ''}</p>
            </div>
            <div class="pkg-features">
              <div class="pkg-features-title">${idx === 0 ? 'المميزات الأساسية:' : idx === 1 ? 'المميزات المتقدمة:' : 'المميزات الكاملة:'}</div>
              <ul class="pkg-features-list">
                ${featuresList}
              </ul>
            </div>
            <div class="pkg-action">
              <button type="button" class="pkg-btn ${isFeatured ? 'btn-primary' : 'btn-secondary'}" onclick="openStaticCoachingBooking('${pkg.name.replace(/'/g, "\\'")}', ${pkg.priceSAR})">اطلب الآن</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function applyServiceToggles(settings) {
  const toggles = {
    'coins': settings.enableServiceCoins !== false,
    'sbc': settings.enableServiceSBC !== false,
    'rivals': settings.enableServiceRivals !== false,
    'champions': settings.enableServiceChampions !== false,
    'coaching': settings.enableServiceCoaching !== false,
    'packages': settings.enableServicePackages !== false,
    'objectives': settings.enableServiceObjectives !== false
  };

  const mappings = [
    { key: 'coins', selectors: ['a[href*="buy-coins.html"]', '#coins-device', '.coins-bg'] },
    { key: 'sbc', selectors: ['a[href*="buy-sbc.html"]', '.sbc-card', '.sbc-bg'] },
    { key: 'rivals', selectors: ['a[href*="buy-rivals.html"]', '.rivals-card', '.rivals-bg'] },
    { key: 'champions', selectors: ['a[href*="buy-champions.html"]', '.champions-card', '.champions-bg'] },
    { key: 'coaching', selectors: ['a[href*="buy-coaching.html"]', '#coaching-section', '.coaching-bg', 'a[href*="#coaching-section"]'] },
    { key: 'packages', selectors: ['a[href*="buy-packages.html"]', '#packages-section', '.packages-bg', 'a[href*="#packages-section"]'] },
    { key: 'objectives', selectors: ['a[href*="buy-objectives.html"]', '.obj-card', '.obj-bg'] }
  ];

  mappings.forEach(m => {
    const isEnabled = toggles[m.key];
    m.selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.tagName.toLowerCase() === 'a' && el.closest('li')) {
          el.closest('li').style.setProperty('display', isEnabled ? '' : 'none', 'important');
        } else if (el.classList.contains('m-cat-icon') || el.classList.contains('coins-bg') || el.classList.contains('sbc-bg') || el.classList.contains('rivals-bg') || el.classList.contains('champions-bg') || el.classList.contains('coaching-bg') || el.classList.contains('packages-bg') || el.classList.contains('objectives-bg') || el.classList.contains('pkgs-bg') || el.classList.contains('obj-bg')) {
          const parentLink = el.closest('.m-cat-card') || el.closest('a');
          if (parentLink) parentLink.style.setProperty('display', isEnabled ? '' : 'none', 'important');
        } else {
          el.style.setProperty('display', isEnabled ? '' : 'none', 'important');
        }
      });
    });
  });

  // Hide order tracking links if disabled
  const isTrackingEnabled = settings.enableOrderTracking !== false;
  document.querySelectorAll('a[href*="track.html"]').forEach(el => {
    if (el.closest('li')) {
      el.closest('li').style.setProperty('display', isTrackingEnabled ? '' : 'none', 'important');
    } else {
      el.style.setProperty('display', isTrackingEnabled ? '' : 'none', 'important');
    }
  });
}
