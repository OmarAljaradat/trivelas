const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3500;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json());

// 1. Maintenance Mode Middleware
app.use((req, res, next) => {
  const db = readDatabase();
  const isMaintenance = db.settings ? db.settings.maintenanceMode : false;
  const bypassToken = db.settings ? db.settings.maintenanceBypassToken : null;
  
  // Parse cookies from headers manually
  const rawCookies = req.headers.cookie || '';
  const parsedCookies = {};
  rawCookies.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length === 2) {
      parsedCookies[parts[0].trim()] = parts[1].trim();
    }
  });

  const clientBypass = req.query.bypass || parsedCookies['bypass_maintenance'];
  const isBypassed = bypassToken && clientBypass === bypassToken;

  // Set cookie if bypass token is passed in query
  if (req.query.bypass && req.query.bypass === bypassToken) {
    res.setHeader('Set-Cookie', `bypass_maintenance=${bypassToken}; Path=/; Max-Age=86400`);
  }

  const isAdminRequest = req.url.startsWith('/admin') || req.url.startsWith('/api/admin') || req.url.includes('admin.js') || req.url.includes('logo-official.png');
  const isApiAuthRequest = req.url.startsWith('/api/auth');
  const isAssetsRequest = req.url.includes('style.css') || req.url.includes('theme_concept') || req.url.includes('trivela_logo') || req.url.includes('logo-official');
  const isPublicContent = req.url.startsWith('/api/public/content');

  if (isMaintenance && !isBypassed && !isAdminRequest && !isApiAuthRequest && !isAssetsRequest && !isPublicContent && req.url !== '/maintenance.html') {
    if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html') || (req.url.startsWith('/') && !req.url.includes('.')))) {
      return res.redirect('/maintenance.html');
    }
    if (req.url.startsWith('/api/')) {
      return res.status(503).json({ error: "الموقع في وضع الصيانة حالياً" });
    }
  }
  next();
});

// 2. Visitor Analytics Middleware
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html') || (req.url.startsWith('/') && !req.url.includes('.')))) {
    const db = readDatabase();
    if (!db.analytics) db.analytics = { totalVisits: 0, daily: {}, devices: { mobile: 0, desktop: 0, tablet: 0 } };
    if (!db.analytics.devices) db.analytics.devices = { mobile: 0, desktop: 0, tablet: 0 };

    const ua = (req.headers['user-agent'] || '').toLowerCase();
    let device = 'desktop';
    if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
      device = 'tablet';
    } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      device = 'mobile';
    }
    db.analytics.devices[device] = (db.analytics.devices[device] || 0) + 1;

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    db.analytics.totalVisits = (db.analytics.totalVisits || 0) + 1;
    db.analytics.daily[todayStr] = (db.analytics.daily[todayStr] || 0) + 1;
    
    writeDatabase(db);
  }
  next();
});

// Disable caching for HTML and JS files
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url === '/' || req.url.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Inject FIFA cinematic background CSS/JS into all public HTML pages
app.use((req, res, next) => {
  const isHtmlPath = req.method === 'GET' && (
    req.url === '/' ||
    /^\/[a-zA-Z0-9_-]+\.html(\?.*)?$/.test(req.url) ||
    (!req.url.includes('.') && !req.url.startsWith('/api'))
  );
  if (!isHtmlPath) return next();

  // Skip admin & maintenance pages
  const lowered = req.url.toLowerCase();
  if (lowered.includes('admin') || lowered.includes('maintenance')) return next();

  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  if (!filePath.endsWith('.html')) filePath += '.html';
  const abs = path.join(__dirname, filePath);
  if (!fs.existsSync(abs)) return next();

  try {
    let html = fs.readFileSync(abs, 'utf8');
    if (!html.includes('fifa-bg.css')) {
      html = html.replace(
        /<link\s+rel="stylesheet"\s+href="style\.css"[^>]*>/i,
        (m) => `${m}\n  <link rel="stylesheet" href="fifa-bg.css"/>`
      );
    }
    if (!html.includes('fifa-bg.js')) {
      html = html.replace(
        /<\/body>/i,
        `<script src="fifa-bg.js"></script>\n</body>`
      );
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(html);
  } catch (e) {
    return next();
  }
});

app.use(express.static(__dirname));

// Read players & users from database
function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { players: [], users: [], settings: {}, orders: [], logs: [], faqs: [], reviews: [], analytics: { totalVisits: 0, daily: {} } };
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.players) parsed.players = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.emailCampaigns) parsed.emailCampaigns = [];
    if (!parsed.settings) parsed.settings = {
      whatsappPhone: "966500000000",
      instagramUrl: "https://instagram.com/Trivela",
      maintenanceMode: false,
      baseRateConsole: 2.80,
      baseRatePC: 2.40,
      pointsDiscountRate: 37.5,
      discounts: [
        { minCoins: 10000000, percent: 20 },
        { minCoins: 5000000, percent: 10 },
        { minCoins: 1000000, percent: 0 },
        { minCoins: 500000, percent: -5 },
        { minCoins: 100000, percent: -10 }
      ]
    };
    if (!parsed.settings.discounts) {
      parsed.settings.discounts = [
        { minCoins: 10000000, percent: 20 },
        { minCoins: 5000000, percent: 10 },
        { minCoins: 1000000, percent: 0 },
        { minCoins: 500000, percent: -5 },
        { minCoins: 100000, percent: -10 }
      ];
    }
    if (!parsed.settings.content) {
      parsed.settings.content = {
        landing: {
          heroTitle: "الأسرع لبناء تشكيلة الأحلام",
          heroSubTitle: "متجر تريفيلا لشحن كوينز فيفا 27 وإنجاز المهام بأمان وسرعة فائقة",
          statOrdersCount: "15,000+",
          statOrdersLabel: "عملية ناجحة",
          statDeliveryTime: "10 دقائق",
          statDeliveryLabel: "متوسط سرعة التوصيل",
          statSecurityLabel: "أمان وحماية 100%",
          guaranteeBadge: "استشارات فنية",
          guaranteeTitle: "الخدمات الاحترافية المتكاملة",
          guaranteeSubTitle: "نوفر لك أفضل الحلول والخدمات داخل اللعبة بطريقة آمنة ومعتمدة",
          platformTitle: "ابدأ شحن الكوينز لحسابك الآن — اختر منصتك للبدء",
          platformSubTitle: "توصيل فوري وآمن بنسبة 100% لكافة المنصات والأجهزة",
          catalogTitle: "خدمات احترافية متكاملة لـ FIFA 27 Ultimate Team",
          featuresTitle: "مميزات Trivela",
          featuresSubTitle: "بنيناها لأجلك أنت كمشتري، مش لمجرد الإعلان",
          howSectionTitle: "3 خطوات بس",
          howSectionSubTitle: "أبسط عملية شراء ستجربها في حياتك",
          landingStep1Title: "حدد طلبك ومنصتك",
          landingStep1Desc: "اختر جهازك أو نوع الخدمة المطلوبة، وحدد كمية الكوينز أو التحدي المتاح.",
          landingStep2Title: "تأكيد الطلب والدفع",
          landingStep2Desc: "املأ بياناتك بأمان تام واضغط إتمام العملية، ثم انتظر قليلاً وسيقوم فريق الدعم بمراسلتك على الواتساب لتأكيد الدفع.",
          landingStep3Title: "استلم الخدمة وانبسط!",
          landingStep3Desc: "يتم إنجاز تحدياتك أو شحن الكوينز لحسابك خلال دقائق معدودة بأمان وضمان 100%.",
          landingStepsBottomNote: "بعد الدفع مباشرة يتواصل معك المختص لإتمام الخدمة — لا انتظار، لا تأخير!"
        },
        coinsPage: {
          title: "شحن الكوينز - Comfort Trade",
          desc: "طريقة الشحن الآمنة والسلسة لشحن كوينز حسابك مباشرة بواسطة خبرائنا",
          step1Title: "اختر الكمية والمنصة",
          step1Desc: "حدد كمية الكوينز ومنصتك المفضلة لمعرفة السعر الإجمالي بالعملة المفضلة لديك.",
          step2Title: "أدخل بيانات الحساب",
          step2Desc: "أدخل بيانات حساب EA والرموز الاحتياطية لتمكين المورد من البدء الفوري.",
          step3Title: "تابع حالة طلبك",
          step3Desc: "تأكيد الدفع ومتابعة تقدم طلبك مباشرة حتى اكتمال شحن الحساب بنجاح."
        },
        championsPage: {
          title: "تحدي بطولة فوت تشامبيونز (FIFA 27)",
          desc: "احجز ترتيبك في بطولة الـ Champions، ودع محترفينا يقودون حسابك لأعلى تصنيف وتحقيق الجوائز الأفضل.",
          hint: "املأ حقول الطلب لتسجيل نقاط التأهيل وبدء حل البطولة"
        },
        rivalsPage: {
          title: "ترقية تصنيف ديفرين Rivals (فيفا 27)",
          desc: "اختر منصة اللعب والترقية المطلوبة، واملأ بيانات حسابك للبدء في حل تحديات Division Rivals لرفع مستواك فوراً.",
          hint: "حدد الباقة المطلوبة واكتمل الشراء بأمان كامل"
        },
        objectivesPage: {
          title: "إنجاز مهام فيفا 27 (Objectives)",
          desc: "دع خبرائنا ينجزون لك المهام اليومية، الأسبوعية، والخاصة للحصول على حزم اللاعبين ونقاط الخبرة XP.",
          hint: "يرجى توفير الرموز الاحتياطية لضمان سرعة إنجاز المهام"
        },
        sbcPage: {
          title: "حل تحديات بناء التشكيلات (SBC)",
          desc: "نكمل لك أي تحدي للاعبين أو بكجات بأقل تكلفة كوينز ممكنة وبسرعة متناهية.",
          hint: "اختر التحدي المطلوب وأدخل تفاصيل الحساب للبدء"
        },
        coachingPage: {
          title: "استشارات فنية وجلسات تدريب FIFA 27",
          desc: "احجز باقة الاستشارات الفنية والتدريب وتواصل مع خبرائنا لبناء أقوى تكتيك وتشكيلة في اللعبة.",
          hint: "تأكد من إدخال حساب ديسكورد أو وسيلة تواصل صحيحة للبدء الفوري"
        },
        packagesPage: {
          title: "الباقات والعروض المجمعة (Packages)",
          desc: "وفر أموالك واحصل على شحن كوينز وإنجاز تحديات أو مهام في باقة واحدة مخفضة.",
          hint: "حدد الباقة المناسبة لك واطلبها مباشرة لتوفير التكلفة"
        },
        coaching: [
          {
            id: "coaching_basic",
            name: "استشارة فنية: أساسي (3 تشكيلات)",
            priceSAR: 15,
            priceUSD: 4,
            description: "تحليل وتنسيق تكتيكات لـ 3 تشكيلات مخصصة لفريقك لمساعدتك في الفوز.",
            features: ["تحليل 3 تشكيلات", "مراجعة تكتيكية سريعة", "دعم ديسكورد يومين"]
          },
          {
            id: "coaching_pro",
            name: "استشارة فنية: برو (5 تشكيلات)",
            priceSAR: 25,
            priceUSD: 6.67,
            description: "تحليل معمق لـ 5 تشكيلات مع ضبط التعليمات وتكتيكات الدفاع والهجوم الفردي.",
            features: ["تحليل 5 تشكيلات", "تعليمات تكتيكية متقدمة", "مراجعة فيديو مسجل", "دعم ديسكورد أسبوع"]
          },
          {
            id: "coaching_pro_plus",
            name: "استشارة فنية: برو بلس (10 تشكيلات)",
            priceSAR: 35,
            priceUSD: 9.33,
            description: "الباقة الاحترافية الكاملة لتحليل 10 تشكيلات مع تدريب تكتيكي متكامل ومتابعة مباشرة.",
            features: ["تحليل 10 تشكيلات", "جلسة تدريب مباشرة", "تحليل شامل لأسلوب اللعب", "دعم ديسكورد شهر كامل"]
          }
        ]
      };
    }
    if (parsed.settings.content && parsed.settings.content.landing && !parsed.settings.content.landing.guaranteeBadge) {
      parsed.settings.content.landing.guaranteeBadge = "استشارات فنية";
    }
    if (!parsed.settings.features || parsed.settings.features.length === 0) {
      parsed.settings.features = [
        {
          id: "feat_1",
          cardClass: "bento-card bento-big bento-blue",
          icon: "fas fa-bolt",
          title: "توصيل فوري — كوينز وخدمات",
          desc: "توصيل سريع وآمن خلال 15-45 دقيقة للكوينز. تحديات SBC والمهام تنجز في غضون ساعات قليلة.",
          deco: "⚡",
          stat: "<strong>15-45</strong> دقيقة متوسط توصيل الكوينز"
        },
        {
          id: "feat_8",
          cardClass: "bento-card bento-big bento-gradient-border",
          icon: "fas fa-lock",
          iconClass: "bc-blue",
          title: "أمان التشكيلة واللاعبين",
          desc: "أمان تام لناديك وتشكيلتك. نضمن عدم المساس بأي لاعب في ناديك أو الكوينز الموجودة مسبقاً في حسابك.",
          badges: ["✅ تشفير عالي", "✅ سرية تامة", "✅ أمان 100%"]
        },
        {
          id: "feat_2",
          cardClass: "bento-card bento-white",
          icon: "fas fa-shield-halved",
          iconClass: "bc-green",
          title: "حماية كاملة للحساب",
          desc: "+1,500 عملية بدون أي حظر. نستخدم أسلوب Transfer Market الآمن بالكامل."
        },
        {
          id: "feat_6",
          cardClass: "bento-card bento-white",
          icon: "fas fa-ban",
          iconClass: "bc-red",
          title: "Anti-Ban مضمون",
          desc: "طريقتنا مجربة على +1,500 عملية. لا حظر، لا مشاكل مع EA."
        },
        {
          id: "feat_4",
          cardClass: "bento-card bento-white",
          icon: "fas fa-headset",
          iconClass: "bc-purple",
          title: "دعم ومتابعة لحظية",
          desc: "تحديثات لحظية ومتابعة مباشرة لطلبك خطوة بخطوة مع الدعم الفني عبر الواتساب حتى اكتمال الشحن."
        },
        {
          id: "feat_5",
          cardClass: "bento-card bento-white",
          icon: "fas fa-tags",
          iconClass: "bc-blue",
          title: "أسعار تنافسية وتحديث يومي",
          desc: "نراقب السوق يومياً لنضمن لك الحصول على أفضل قيمة مقابل مالك. أسعارنا تتحدث عن نفسها."
        },
        {
          id: "feat_3",
          cardClass: "bento-card bento-white",
          icon: "fas fa-rotate-left",
          iconClass: "bc-orange",
          title: "ضمان استرجاع المال",
          desc: "لو ما أُنجزت خدمتك لأي سبب — المبلغ يرجع لك فوراً، بدون جدال."
        },
        {
          id: "feat_7",
          cardClass: "bento-card bento-wide bento-blue-light",
          icon: "fas fa-gamepad",
          iconClass: "bc-blue",
          title: "كل المنصات مدعومة",
          desc: "",
          customHtml: "<div class=\"platform-icons-row\"><div class=\"pi\"><i class=\"fab fa-playstation\"></i><span>PS4</span></div><div class=\"pi\"><i class=\"fab fa-playstation\"></i><span>PS5</span></div><div class=\"pi\"><i class=\"fab fa-xbox\"></i><span>Xbox</span></div><div class=\"pi\"><i class=\"fas fa-desktop\"></i><span>PC</span></div></div>"
        }
      ];
    }
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.expenses) parsed.expenses = [];
    if (!parsed.logs) parsed.logs = [];
    if (!parsed.faqs) parsed.faqs = [];
    if (!parsed.reviews) parsed.reviews = [];
    if (!parsed.analytics) parsed.analytics = { totalVisits: 0, daily: {} };
    if (!parsed.analytics.devices) parsed.analytics.devices = { mobile: 0, desktop: 0, tablet: 0 };
    if (!parsed.analytics.referrers) parsed.analytics.referrers = { direct: 0, google: 0, tiktok: 0, snapchat: 0, instagram: 0, twitter: 0, whatsapp: 0, other: 0 };
    if (!parsed.analytics.countries) parsed.analytics.countries = { sa: 0, ae: 0, kw: 0, qa: 0, bh: 0, om: 0, eg: 0, jo: 0, other: 0 };
    if (!parsed.analytics.hours) parsed.analytics.hours = {};
    for (let i = 0; i < 24; i++) {
      if (parsed.analytics.hours[i] === undefined) parsed.analytics.hours[i] = 0;
    }
    if (!parsed.analytics.pages) parsed.analytics.pages = { home: 0, coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };
    if (!parsed.analytics.visitorTypes) parsed.analytics.visitorTypes = { new: 0, returning: 0 };
    if (!parsed.analytics.clicks) parsed.analytics.clicks = { coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };

    // FIFA Champions default ranks configuration
    if (!parsed.champions_ranks) parsed.champions_ranks = {
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

    // FIFA Rivals default division ranks configuration
    if (!parsed.rivals_ranks) parsed.rivals_ranks = {
      '7wins': {
        name: "لعب Division Rivals — تحقيق الـ 7 انتصارات الأسبوعية",
        wins: "المكافآت الأسبوعية الكاملة",
        priceUSD: 12,
        rewards: [
          { name: "تأمين 7 انتصارات كاملة", icon: "fas fa-trophy" },
          { name: "فتح مكافآت القسم الحالية المطورة", icon: "fas fa-box-open" },
          { name: "Champions Qualification Points", icon: "fas fa-ticket" }
        ]
      },
      'div5': {
        name: "ترقية قسم Rivals إلى القسم الخامس (Div 5)",
        wins: "ترقية تصنيف القسم",
        priceUSD: 20,
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
        rewards: [
          { name: "1× حزمة جامبو لاعبين نادرين (100K)", icon: "fas fa-trophy" },
          { name: "1× حزمة لاعبين ذهبية ممتازة", icon: "fas fa-box-open" },
          { name: "25,000 كوينز نقدي", icon: "fas fa-coins" },
          { name: "750 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
        ]
      },
      'div1': {
        name: "ترقية قسم Rivals إلى القسم الأول (Div 1)",
        wins: "ترقية تصنيف القسم",
        priceUSD: 60,
        rewards: [
          { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
          { name: "1× حزمة لاعبين نادرين (50K Pack)", icon: "fas fa-box" },
          { name: "40,000 كوينز نقدي", icon: "fas fa-coins" },
          { name: "1,000 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
        ]
      },
      'elite': {
        name: "ترقية قسم Rivals إلى قسم النخبة (Elite Division)",
        wins: "الرتبة القصوى للنخبة",
        priceUSD: 95,
        rewards: [
          { name: "1× حزمة التيميت (125K Pack)", icon: "fas fa-trophy" },
          { name: "1× حزمة لاعبين نادرين (50K Pack)", icon: "fas fa-box" },
          { name: "50,000 كوينز نقدي", icon: "fas fa-coins" },
          { name: "1,250 نقطة تأهيل الـ FUT Champions", icon: "fas fa-ticket" }
        ]
      }
    };

    if (!parsed.coupons) {
      parsed.coupons = [
        { code: "TRIVELA", percent: 10, maxUses: 100, usedCount: 0, expiryDate: "2027-12-31" },
        { code: "FIFA27", percent: 15, maxUses: 50, usedCount: 0, expiryDate: "2027-12-31" },
        { code: "START", percent: 5, maxUses: 200, usedCount: 0, expiryDate: "2027-12-31" }
      ];
    }

    // Always write the defaults back to disk to keep it in sync
    fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');

    return parsed;
  } catch (err) {
    console.error("Error reading database:", err);
    return { players: [], users: [], settings: {}, orders: [], logs: [], faqs: [], reviews: [], analytics: { totalVisits: 0, daily: {} }, champions_ranks: {}, rivals_ranks: {} };
  }
}

// Helper to add admin action logs
function addAdminLog(action, message, details = {}) {
  const db = readDatabase();
  const newLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    action,
    operator: "المشرف",
    message,
    details
  };
  if (!db.logs) db.logs = [];
  db.logs.unshift(newLog);
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  writeDatabase(db);
}

// Write to database
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing database:", err);
    return false;
  }
}

// Password Hashing helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Simple Base64 user session verification middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const userId = Buffer.from(token, 'base64').toString('ascii');
    const db = readDatabase();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(403).json({ error: "Invalid token or user not found." });
    
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token." });
  }
}

// ==========================================
// ADMIN AUTH — bootstrap + middleware
// ==========================================
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@trivela.local').toLowerCase();

// Ensure at least one admin exists at boot
function ensureAdminBootstrapped() {
  const db = readDatabase();
  let mutated = false;
  db.users.forEach(u => {
    if ((u.email || '').toLowerCase() === ADMIN_EMAIL && !u.isAdmin) {
      u.isAdmin = true;
      mutated = true;
    }
  });
  // If ADMIN_EMAIL user doesn't exist yet, seed one with default creds
  const exists = db.users.some(u => (u.email || '').toLowerCase() === ADMIN_EMAIL);
  if (!exists) {
    const defaultPass = process.env.ADMIN_PASSWORD || 'Trivela@Admin2026';
    db.users.push({
      id: 'admin_' + Date.now(),
      name: 'Trivela Admin',
      phone: process.env.ADMIN_PHONE || '966500000001',
      email: ADMIN_EMAIL,
      password: hashPassword(defaultPass),
      isAdmin: true,
      points: 0,
      referredBy: null,
      history: [{ date: new Date().toISOString(), amount: 0, reason: 'حساب المشرف تم إنشاؤه تلقائياً' }]
    });
    mutated = true;
    console.log(`[SECURITY] Bootstrapped admin user: ${ADMIN_EMAIL}`);
  }
  // Purge any plaintext-password leftovers from ALL users (security hardening)
  db.users.forEach(u => {
    if (u.rawPasswordPlaintext !== undefined) {
      delete u.rawPasswordPlaintext;
      mutated = true;
    }
  });
  if (mutated) writeDatabase(db);
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "غير مصرح: يجب تسجيل الدخول كمشرف" });
  try {
    const userId = Buffer.from(token, 'base64').toString('ascii');
    const db = readDatabase();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "غير مصرح: هذا الحساب ليس لديه صلاحيات المشرف" });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(400).json({ error: "توكن غير صالح" });
  }
}

// Simple in-memory brute-force guard for /api/auth/login
const _loginAttempts = new Map(); // ip -> { count, firstAt }
function loginRateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  const MAX_ATTEMPTS = 8;
  const rec = _loginAttempts.get(ip);
  if (rec && now - rec.firstAt < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "محاولات كثيرة. الرجاء الانتظار قبل المحاولة مجدداً." });
  }
  if (!rec || now - rec.firstAt >= WINDOW_MS) {
    _loginAttempts.set(ip, { count: 1, firstAt: now });
  } else {
    rec.count += 1;
  }
  next();
}

// Apply admin guard to ALL /api/admin/* endpoints
app.use('/api/admin', requireAdmin);

// Safe user projection (never leak password material)
function safeUser(u) {
  if (!u) return null;
  const { password, rawPasswordPlaintext, ...rest } = u;
  return rest;
}

// Bootstrap admin at startup
ensureAdminBootstrapped();

// Automatically filter out and delete expired players
function cleanupExpiredPlayers() {
  const db = readDatabase();
  const now = Date.now();
  const initialCount = db.players.length;

  db.players = db.players.filter(p => {
    if (!p.expirationDate) return true; // No expiration set, keep forever
    const expiryTime = new Date(p.expirationDate).getTime();
    return expiryTime > now;
  });

  if (db.players.length !== initialCount) {
    console.log(`[Auto-Cleanup] Removed ${initialCount - db.players.length} expired player challenges.`);
    writeDatabase(db);
  }
  return db.players;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register User
app.post('/api/auth/register', (req, res) => {
  const { name, phone, email, password, referralCode } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة" });
  }

  const db = readDatabase();

  // Check unique constraints
  const existingUser = db.users.find(u => u.email === email || u.phone === phone);
  if (existingUser) {
    return res.status(400).json({ error: "الإيميل أو رقم الهاتف مسجل بالفعل" });
  }

  let finalWelcomePoints = 0;
  let referredByPhone = null;
  const welcomeHistory = [];

  welcomeHistory.push({
    date: new Date().toISOString(),
    amount: 0,
    reason: "إنشاء الحساب بنجاح"
  });

  // Verify referral code
  if (referralCode) {
    const cleanRef = referralCode.replace(/[\s\+\-]/g, '').trim();
    const referrer = db.users.find(u => {
      const uPhone = (u.phone || '').replace(/[\s\+\-]/g, '').trim();
      return uPhone === cleanRef || u.id === cleanRef;
    });

    if (referrer) {
      referredByPhone = referrer.phone;
      finalWelcomePoints = 50; // Give 50 points welcome gift!
      welcomeHistory.push({
        date: new Date().toISOString(),
        amount: 50,
        reason: `بونص ترحيبي للتسجيل عبر رابط إحالة الصديق (${referrer.name})`
      });
    }
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    phone,
    email,
    password: hashPassword(password),
    isAdmin: (email || '').toLowerCase() === ADMIN_EMAIL,
    points: finalWelcomePoints,
    referredBy: referredByPhone,
    history: welcomeHistory
  };

  db.users.push(newUser);
  writeDatabase(db);

  const token = Buffer.from(newUser.id).toString('base64');
  res.json({ success: true, token, user: safeUser(newUser) });
});

// Login User
app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const { loginField, password } = req.body; // loginField can be email or phone
  if (!loginField || !password) {
    return res.status(400).json({ error: "يرجى إدخال الحقول المطلوبة" });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.email === loginField || u.phone === loginField);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(400).json({ error: "البيانات المدخلة غير صحيحة" });
  }

  const token = Buffer.from(user.id).toString('base64');
  res.json({ success: true, token, user: safeUser(user) });
});

// Get Current User info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(safeUser(req.user));
});

// ==========================================
// ADMIN USER POINTS MANAGEMENT ROUTES
// ==========================================

// Get stats for admin dashboard
// Get stats for admin dashboard
app.get('/api/admin/stats', (req, res) => {
  const db = readDatabase();
  const totalUsers = db.users.length;
  const totalChallenges = db.players.length;
  const totalPoints = db.users.reduce((sum, u) => sum + (u.points || 0), 0);
  
  let totalVisits = db.analytics ? db.analytics.totalVisits : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const visitsToday = db.analytics && db.analytics.daily ? (db.analytics.daily[todayStr] || 0) : 0;
  
  // Dynamic range filtering (custom date range or legacy days limit)
  const { days, startDate, endDate } = req.query;
  let orders = db.orders || [];
  
  if (startDate || endDate) {
    // 1. Filter visits by custom range
    totalVisits = 0;
    if (db.analytics && db.analytics.daily) {
      Object.entries(db.analytics.daily).forEach(([dateStr, count]) => {
        let matches = true;
        if (startDate && dateStr < startDate) matches = false;
        if (endDate && dateStr > endDate) matches = false;
        if (matches) {
          totalVisits += count;
        }
      });
    }

    // 2. Filter orders by custom range
    orders = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDateStr = new Date(o.timestamp).toISOString().split('T')[0];
      let matches = true;
      if (startDate && orderDateStr < startDate) matches = false;
      if (endDate && orderDateStr > endDate) matches = false;
      return matches;
    });
  } else {
    const daysLimit = parseInt(days);
    if (!isNaN(daysLimit)) {
      // 1. Filter visits by relative days range
      totalVisits = 0;
      const now = new Date();
      const allowedDates = new Set();
      for (let i = 0; i < daysLimit; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        allowedDates.add(d.toISOString().split('T')[0]);
      }
      if (db.analytics && db.analytics.daily) {
        Object.entries(db.analytics.daily).forEach(([dateStr, count]) => {
          if (allowedDates.has(dateStr)) {
            totalVisits += count;
          }
        });
      }

      // 2. Filter orders by relative days range
      const cutoffTime = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);
      orders = orders.filter(o => {
        const t = new Date(o.timestamp).getTime();
        return !isNaN(t) && t >= cutoffTime;
      });
    }
  }
  
  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const paidOrdersCount = orders.filter(o => o.status === 'paid').length;
  const inProgressOrdersCount = orders.filter(o => o.status === 'in_progress').length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'cancelled').length;
  
  const totalSales = completedOrders.reduce((sum, o) => sum + (o.amountPaid || o.priceSAR), 0);
  const totalCosts = completedOrders.reduce((sum, o) => sum + (o.supplierCost || 0), 0);
  const totalProfit = completedOrders.reduce((sum, o) => sum + (o.profit || 0), 0);

  res.json({
    totalUsers,
    totalChallenges,
    totalPoints,
    totalVisits,
    visitsToday,
    pendingOrdersCount,
    paidOrdersCount,
    inProgressOrdersCount,
    cancelledOrdersCount,
    totalSales: totalSales / 3.75,
    totalCosts: totalCosts / 3.75,
    totalProfit: totalProfit / 3.75,
    analytics: db.analytics
  });
});

// Reset store analytics/data
app.post('/api/admin/reset', (req, res) => {
  const { type, password } = req.body;
  const db = readDatabase();
  
  if (type === 'visits') {
    db.analytics = { totalVisits: 0, daily: {} };
    writeDatabase(db);
    addAdminLog("RESET_VISITS", "إعادة تعيين إحصائيات زيارات المتجر إلى الصفر");
  } else if (type === 'orders') {
    db.orders = [];
    writeDatabase(db);
    addAdminLog("RESET_ORDERS", "إعادة تعيين وحذف كافة طلبات المتجر");
  } else if (type === 'logs') {
    db.logs = [];
    writeDatabase(db);
    addAdminLog("RESET_LOGS", "إعادة تعيين وإفراغ سجل العمليات");
  } else if (type === 'all') {
    db.analytics = { totalVisits: 0, daily: {} };
    db.orders = [];
    db.logs = [];
    writeDatabase(db);
    addAdminLog("RESET_ALL", "إعادة تعيين شاملة للمتجر (تصفير الزيارات والطلبات والسجلات)");
  } else if (type === 'system_factory_reset') {
    if (password !== 'Trivela@Reset2026') {
      return res.status(401).json({ success: false, error: "كلمة مرور إعادة ضبط المصنع غير صحيحة!" });
    }
    
    // System factory reset: clear everything but retain admin users
    db.analytics = { totalVisits: 0, daily: {} };
    db.orders = [];
    db.expenses = [];
    db.players = [];
    db.logs = [];
    db.coupons = [
      { code: "TRIVELA", percent: 10, maxUses: 100, usedCount: 0, expiryDate: "2027-12-31" }
    ];
    db.users = db.users.filter(u => u.isAdmin); // Keep only admin accounts
    
    writeDatabase(db);
    addAdminLog("SYSTEM_FACTORY_RESET", "إعادة ضبط المصنع بالكامل (تصفير العملاء والطلبات والكوبونات والمصاريف والسجلات والزيارات)");
  } else {
    return res.status(400).json({ success: false, error: "نوع غير معروف لإعادة التعيين" });
  }
  
  res.json({ success: true });
});

// Get all users for admin dashboard (passwords never leaked)
app.get('/api/admin/users', (req, res) => {
  const db = readDatabase();
  const cleanUsers = db.users.map(u => safeUser(u));
  res.json(cleanUsers);
});

// Modify points for a user
app.post('/api/admin/users/:id/points', (req, res) => {
  const userId = req.params.id;
  const { points, reason } = req.body;

  if (points === undefined || isNaN(points)) {
    return res.status(400).json({ error: "يرجى إدخال عدد نقاط صحيح" });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  const pointsChange = parseInt(points, 10);
  user.points = Math.max(0, user.points + pointsChange);
  user.history.push({
    date: new Date().toISOString(),
    amount: pointsChange,
    reason: reason || (pointsChange >= 0 ? "شحن نقاط من المشرف" : "خصم نقاط من المشرف")
  });

  writeDatabase(db);
  
  const actionType = pointsChange >= 0 ? 'ADD_POINTS' : 'DEDUCT_POINTS';
  const pointsText = pointsChange >= 0 ? `شحن ${pointsChange} نقطة` : `خصم ${Math.abs(pointsChange)} نقطة`;
  addAdminLog(actionType, `تم ${pointsText} للعميل "${user.name}" (${user.phone}). السبب: "${reason || 'بدون سبب'}"`, { userId, pointsChange, reason });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

// Reset password for a user by admin
app.post('/api/admin/users/:id/reset-password', (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل" });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  user.password = hashPassword(newPassword.trim());
  
  writeDatabase(db);
  
  addAdminLog('RESET_USER_PASSWORD', `تم تعيين كلمة مرور جديدة للعميل "${user.name}" (${user.phone}) من قبل المشرف`, { userId });

  res.json({ success: true, message: "تم تعيين كلمة المرور الجديدة بنجاح" });
});

// ==========================================
// PLAYER SHOP CARD ROUTES
// ==========================================

// GET all players (runs auto-cleanup first)
app.get('/api/players', (req, res) => {
  const activePlayers = cleanupExpiredPlayers();
  res.json(activePlayers);
});

// POST add a player
app.post(['/api/players', '/api/admin/players'], (req, res) => {
  const newPlayer = req.body;
  if (!newPlayer || !newPlayer.id || !newPlayer.name) {
    return res.status(400).json({ error: "Invalid player data" });
  }

  const db = readDatabase();
  const index = db.players.findIndex(p => p.id === newPlayer.id && p.category === newPlayer.category);
  if (index !== -1) {
    db.players[index] = newPlayer;
  } else {
    db.players.push(newPlayer);
  }

  writeDatabase(db);
  
  addAdminLog('ADD_PLAYER', `تم إضافة/تحديث كارت اللاعب "${newPlayer.name}" (${newPlayer.category.toUpperCase()}) بسعر ${newPlayer.priceSAR} ر.س`, { playerId: newPlayer.id, name: newPlayer.name, category: newPlayer.category, priceSAR: newPlayer.priceSAR });
  
  res.json({ success: true, players: db.players });
});

// DELETE a player
app.delete(['/api/players/:id', '/api/admin/players/:id'], (req, res) => {
  const playerId = req.params.id;
  const category = req.query.category;
  const db = readDatabase();
  const initialLength = db.players.length;

  const playerToDelete = db.players.find(p => {
    if (category) return p.id === playerId && p.category === category;
    return p.id === playerId;
  });

  db.players = db.players.filter(p => {
    if (category) {
      return !(p.id === playerId && p.category === category);
    }
    return p.id !== playerId;
  });

  if (db.players.length === initialLength) {
    return res.status(404).json({ error: "Player not found" });
  }

  writeDatabase(db);
  
  addAdminLog('DELETE_PLAYER', `تم حذف كارت اللاعب "${playerToDelete ? playerToDelete.name : playerId}" من تصنيف "${category || 'الكل'}"`, { playerId, category });
  
  res.json({ success: true, players: db.players });
});

// GET scrape FUT.GG player data
app.post(['/api/scrape', '/api/admin/scrape'], (req, res) => {
  const { url, category, sbcSubCategory } = req.body;
  if (!url || !url.startsWith("https://www.fut.gg/")) {
    return res.status(400).json({ error: "يرجى إدخال رابط FUT.GG صحيح" });
  }

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  };

  https.get(url, options, (scrapeRes) => {
    if (scrapeRes.statusCode !== 200) {
      return res.status(scrapeRes.statusCode).json({ error: `فشل الاتصال بموقع FUT.GG. رمز الخطأ: ${scrapeRes.statusCode}` });
    }

    let html = '';
    scrapeRes.on('data', chunk => html += chunk);
    scrapeRes.on('end', () => {
      try {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        let name = "تحدي جديد";
        if (titleMatch) {
          let titleText = titleMatch[1];
          const separators = [" EA SPORTS ", " EA FC ", " - EA ", " SBC ", " | FUT.GG", " - FUT.GG"];
          for (const sep of separators) {
            if (titleText.includes(sep)) {
              titleText = titleText.split(sep)[0];
            }
          }
          name = titleText.trim();
          
          const sbcOvrRegex = /\s+\d+\s*OVR\s+[A-Z]{2,3}/i;
          if (sbcOvrRegex.test(name)) {
            name = name.split(sbcOvrRegex)[0].trim();
          }
        }

        const imgMatches = html.match(/https:\/\/game-assets\.fut\.gg\/[^\s">]+\.(webp|png|jpg|jpeg)/gi) || [];
        let image = "";
        
        const priorities = [
          "futgg-player-item-card",
          "player-item",
          "sbc-reward",
          "pack-reward",
          "packs",
          "items",
          "sbc",
          "evolutions",
          "objectives",
          "objective",
          "challenges",
          "challenge",
          "rewards",
          "pack",
          "token",
          "tokens",
          "sbcs"
        ];
        
        for (const keyword of priorities) {
          const found = imgMatches.find(u => u.toLowerCase().includes(keyword));
          if (found) {
            image = found;
            break;
          }
        }
        
        if (!image && imgMatches.length > 0) {
          const genericKeywords = ["logo", "banner", "social", "placeholder", "background", "header", "menu", "sharing", "club", "nation", "league", "static", "default", "icon"];
          const nonGeneric = imgMatches.find(u => !genericKeywords.some(gk => u.toLowerCase().includes(gk)));
          if (nonGeneric) image = nonGeneric;
        }

        if (!image) {
          const ogImageMatch = html.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/i) || html.match(/<meta\b[^>]*content="([^"]+)"[^>]*property="og:image"/i);
          image = ogImageMatch ? ogImageMatch[1] : (imgMatches[0] || "logo-official.png");
        }

        let rating = 0;
        let position = "SBC";
        let version = "تحدي";
        let expiryDays = 7;
        let priceSAR = 105;
        let priceUSD = 28;

        // Specialized behavior
        if (category === 'objectives' || url.toLowerCase().includes('/objectives/')) {
          rating = 0;
          position = "OBJ";
          version = "مهمة Objectives";
          expiryDays = 14;
          priceSAR = 56;
          priceUSD = 15;
        } else if (category === 'sbc' && sbcSubCategory === 'upgrades') {
          rating = 0;
          position = "UPG";
          version = "ترقية SBC";
          expiryDays = 7;
          priceSAR = 38;
          priceUSD = 10;
        } else {
          rating = 90;
          position = "SBC";
          version = "لاعب تحدي";
          expiryDays = 14;
          priceSAR = 105;
          priceUSD = 28;

          const descMatch = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i) || html.match(/<meta\b[^>]*content="([^"]+)"[^>]*name="description"/i);
          if (descMatch) {
            const desc = descMatch[1];
            const versionRegex1 = /Latest version:\s*(.+?)\s*(\d+)\s*([A-Z]{2,3})\./i;
            const vMatch1 = desc.match(versionRegex1);
            if (vMatch1) {
              version = vMatch1[1].trim();
              rating = parseInt(vMatch1[2], 10);
              position = vMatch1[3].trim();
              expiryDays = 30;
            } else {
              const versionRegex2 = /([\w\s':-]+?)\s+(\d+)\s*OVR\s*([A-Z]{2,3})\b/i;
              const vMatch2 = desc.match(versionRegex2);
              if (vMatch2) {
                const fullPrefix = vMatch2[1].trim();
                rating = parseInt(vMatch2[2], 10);
                position = vMatch2[3].trim();
                expiryDays = 30;
                
                const words = fullPrefix.split(/\s+/);
                if (words.length > 2) {
                  version = words.slice(2).join(' ');
                  name = words.slice(0, 2).join(' ');
                } else {
                  version = "SBC";
                }
              }
            }
          }
        }

        const idMatch = url.match(/\/players\/(\d+)/i) || url.match(/\/sbc\/([^\/]+)/i) || url.match(/\/evolutions\/([^\/]+)/i) || url.match(/\/objectives\/([^\/]+)/i);
        const id = idMatch ? (category + "_" + idMatch[1]) : "scraped_" + Date.now();

        res.json({ 
          success: true,
          player: {
            id, 
            name, 
            image, 
            rating, 
            version, 
            position, 
            sbcSubCategory, 
            category,
            expiryDays,
            priceSAR,
            priceUSD,
            pricePCSAR: priceSAR,
            pricePCUSD: priceUSD
          }
        });
      } catch (err) {
        console.error("Error parsing scraped content:", err);
        res.status(500).json({ error: "حدث خطأ أثناء قراءة محتوى الصفحة." });
      }
    });
  }).on('error', (err) => {
    console.error("Scraping connection error:", err);
    res.status(500).json({ error: "فشل الاتصال بموقع FUT.GG. تأكد من اتصال السيرفر بالإنترنت." });
  });
});

// ==========================================
// STORE SETTINGS & LOGS MANAGEMENT
// ==========================================

// GET public content (settings, faqs, reviews)
app.get('/api/public/content', (req, res) => {
  const db = readDatabase();
  const approvedReviews = (db.reviews || []).filter(r => r.status === 'approved');
  res.json({
    settings: db.settings,
    faqs: db.faqs || [],
    reviews: approvedReviews,
    champions_ranks: db.champions_ranks,
    rivals_ranks: db.rivals_ranks
  });
});

// POST public review submission (moderated)
app.post('/api/public/reviews', (req, res) => {
  const { name, platform, stars, text } = req.body;
  if (!name || !text) {
    return res.status(400).json({ error: "الرجاء إدخال اسمك وتجربتك للتقييم" });
  }

  const db = readDatabase();
  if (!db.reviews) db.reviews = [];

  const reviewItem = {
    id: 'rev_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900),
    name: name.trim(),
    platform: platform || "PS5",
    stars: parseInt(stars, 10) || 5,
    text: text.trim(),
    badge: "",
    status: "pending"
  };

  db.reviews.unshift(reviewItem);
  writeDatabase(db);

  res.json({ success: true, review: reviewItem });
});

// POST public analytics page load ping
app.post('/api/public/analytics-ping', (req, res) => {
  const { type, referrer, page } = req.body;
  const db = readDatabase();
  
  if (!db.analytics) db.analytics = {};
  if (!db.analytics.devices) db.analytics.devices = { mobile: 0, desktop: 0, tablet: 0 };
  if (!db.analytics.referrers) db.analytics.referrers = { direct: 0, google: 0, tiktok: 0, snapchat: 0, instagram: 0, twitter: 0, whatsapp: 0, other: 0 };
  if (!db.analytics.countries) db.analytics.countries = { sa: 0, ae: 0, kw: 0, qa: 0, bh: 0, om: 0, eg: 0, jo: 0, other: 0 };
  if (!db.analytics.hours) db.analytics.hours = {};
  if (!db.analytics.pages) db.analytics.pages = { home: 0, coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };
  if (!db.analytics.visitorTypes) db.analytics.visitorTypes = { new: 0, returning: 0 };
  if (!db.analytics.daily) db.analytics.daily = {};

  // 1. Devices from User-Agent
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  let device = 'desktop';
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    device = 'tablet';
  } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    device = 'mobile';
  }
  db.analytics.devices[device] = (db.analytics.devices[device] || 0) + 1;

  // 2. Referrers
  let refKey = 'direct';
  const refLower = (referrer || '').toLowerCase();
  if (refLower.includes('google')) refKey = 'google';
  else if (refLower.includes('tiktok')) refKey = 'tiktok';
  else if (refLower.includes('snapchat')) refKey = 'snapchat';
  else if (refLower.includes('instagram')) refKey = 'instagram';
  else if (refLower.includes('twitter') || refLower.includes('t.co') || refLower.includes('x.com')) refKey = 'twitter';
  else if (refLower.includes('whatsapp') || refLower.includes('wa.me')) refKey = 'whatsapp';
  else if (referrer) refKey = 'other';
  db.analytics.referrers[refKey] = (db.analytics.referrers[refKey] || 0) + 1;

  // 3. Countries from Accept-Language
  const lang = (req.headers['accept-language'] || '').toLowerCase();
  let countryKey = 'sa';
  if (lang.includes('ae')) countryKey = 'ae';
  else if (lang.includes('kw')) countryKey = 'kw';
  else if (lang.includes('qa')) countryKey = 'qa';
  else if (lang.includes('bh')) countryKey = 'bh';
  else if (lang.includes('om')) countryKey = 'om';
  else if (lang.includes('eg')) countryKey = 'eg';
  else if (lang.includes('jo')) countryKey = 'jo';
  else if (lang.includes('sa')) countryKey = 'sa';
  else countryKey = 'other';
  db.analytics.countries[countryKey] = (db.analytics.countries[countryKey] || 0) + 1;

  // 4. Hours
  const hour = new Date().getHours();
  db.analytics.hours[hour] = (db.analytics.hours[hour] || 0) + 1;

  // 5. Pages
  let pgKey = 'home';
  const pgLower = (page || '').toLowerCase();
  if (pgLower.includes('coin') || pgLower.includes('كوينز')) pgKey = 'coins';
  else if (pgLower.includes('sbc') || pgLower.includes('تحديات')) pgKey = 'sbc';
  else if (pgLower.includes('rival') || pgLower.includes('رايفلز')) pgKey = 'rivals';
  else if (pgLower.includes('champ') || pgLower.includes('فوت')) pgKey = 'champions';
  else if (pgLower.includes('objective') || pgLower.includes('مهام')) pgKey = 'objectives';
  else if (pgLower.includes('coach') || pgLower.includes('تدريب')) pgKey = 'coaching';
  else if (pgLower.includes('package') || pgLower.includes('باقات')) pgKey = 'packages';
  db.analytics.pages[pgKey] = (db.analytics.pages[pgKey] || 0) + 1;

  // 6. Visitor Type
  const vtKey = type === 'returning' ? 'returning' : 'new';
  db.analytics.visitorTypes[vtKey] = (db.analytics.visitorTypes[vtKey] || 0) + 1;

  // 7. General Count
  const todayStr = new Date().toISOString().split('T')[0];
  db.analytics.totalVisits = (db.analytics.totalVisits || 0) + 1;
  db.analytics.daily[todayStr] = (db.analytics.daily[todayStr] || 0) + 1;

  writeDatabase(db);
  res.json({ success: true });
});

// POST public click tracking
app.post('/api/public/analytics-click', (req, res) => {
  const { service } = req.body;
  if (!service) return res.status(400).json({ error: "Missing service name" });

  const db = readDatabase();
  if (!db.analytics) db.analytics = {};
  if (!db.analytics.clicks) db.analytics.clicks = { coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };

  const svcKey = service.toLowerCase();
  if (db.analytics.clicks[svcKey] !== undefined) {
    db.analytics.clicks[svcKey] = (db.analytics.clicks[svcKey] || 0) + 1;
    writeDatabase(db);
  }
  res.json({ success: true });
});

// Update Champions Ranks
app.put('/api/admin/champions-ranks', (req, res) => {
  const db = readDatabase();
  db.champions_ranks = req.body;
  writeDatabase(db);
  addAdminLog("UPDATE_CHAMPIONS_RANKS", "تعديل أسعار ورتب الفوت شامبيونز");
  res.json({ success: true });
});

// Update Rivals Ranks
app.put('/api/admin/rivals-ranks', (req, res) => {
  const db = readDatabase();
  db.rivals_ranks = req.body;
  writeDatabase(db);
  addAdminLog("UPDATE_RIVALS_RANKS", "تعديل أسعار ورتب ديفجن رايفلز");
  res.json({ success: true });
});

// GET admin logs list
app.get('/api/admin/logs', (req, res) => {
  const db = readDatabase();
  res.json(db.logs || []);
});

// GET admin settings
app.get('/api/admin/settings', (req, res) => {
  const db = readDatabase();
  res.json(db.settings || {});
});

// POST update settings
app.post('/api/admin/settings', (req, res) => {
  const newSettings = req.body;
  if (!newSettings) return res.status(400).json({ error: "Invalid settings data" });

  const db = readDatabase();
  
  // Track changes for logs
  const changes = [];
  if (db.settings.maintenanceMode !== !!newSettings.maintenanceMode) {
    changes.push(`وضع الصيانة: ${newSettings.maintenanceMode ? 'تفعيل' : 'إلغاء'}`);
  }
  if (db.settings.whatsappPhone !== newSettings.whatsappPhone) {
    changes.push(`رقم الواتساب: ${newSettings.whatsappPhone}`);
  }
  if (db.settings.instagramUrl !== newSettings.instagramUrl) {
    changes.push(`رابط الإنستجرام: ${newSettings.instagramUrl}`);
  }
  if (db.settings.baseRateConsole !== parseFloat(newSettings.baseRateConsole) || db.settings.baseRatePC !== parseFloat(newSettings.baseRatePC)) {
    changes.push(`تحديث أسعار الكوينز (كونسول: ${newSettings.baseRateConsole}$, بي سي: ${newSettings.baseRatePC}$)`);
  }
  if (db.settings.maintenanceTitleText !== newSettings.maintenanceTitleText) {
    changes.push(`عنوان الصيانة: ${newSettings.maintenanceTitleText}`);
  }
  if (db.settings.maintenanceCountdownActive !== !!newSettings.maintenanceCountdownActive) {
    changes.push(`العد التنازلي: ${newSettings.maintenanceCountdownActive ? 'تفعيل' : 'إلغاء'}`);
  }
  if (db.settings.maintenanceCountdownEndTime !== newSettings.maintenanceCountdownEndTime) {
    changes.push(`وقت انتهاء الصيانة: ${newSettings.maintenanceCountdownEndTime}`);
  }
  if (db.settings.maintenanceGlowColor !== newSettings.maintenanceGlowColor) {
    changes.push(`لون مظهر الصيانة: ${newSettings.maintenanceGlowColor}`);
  }
  if (db.settings.maintenanceIconStyle !== newSettings.maintenanceIconStyle) {
    changes.push(`أيقونة الصيانة: ${newSettings.maintenanceIconStyle}`);
  }
  if (db.settings.maintenanceTelegramActive !== !!newSettings.maintenanceTelegramActive) {
    changes.push(`تفعيل قناة تيليجرام: ${newSettings.maintenanceTelegramActive ? 'تفعيل' : 'إلغاء'}`);
  }
  if (db.settings.settingTelegram !== newSettings.settingTelegram) {
    changes.push(`رابط تيليجرام: ${newSettings.settingTelegram}`);
  }

  db.settings = {
    whatsappPhone: newSettings.whatsappPhone,
    instagramUrl: newSettings.instagramUrl,
    maintenanceMode: !!newSettings.maintenanceMode,
    maintenanceBypassToken: newSettings.maintenanceBypassToken || db.settings.maintenanceBypassToken || "trivela-bypass-vip",
    maintenanceMessage: newSettings.maintenanceMessage || db.settings.maintenanceMessage || "نحن نقوم بأعمال صيانة مؤقتة للتحديث، سنعود للعمل قريباً جداً. شكراً لتفهمك!",
    maintenanceTitleText: newSettings.maintenanceTitleText || db.settings.maintenanceTitleText || "أعمال صيانة مؤقتة",
    maintenanceCountdownActive: !!newSettings.maintenanceCountdownActive,
    maintenanceCountdownEndTime: newSettings.maintenanceCountdownEndTime || db.settings.maintenanceCountdownEndTime || "",
    maintenanceGlowColor: newSettings.maintenanceGlowColor || db.settings.maintenanceGlowColor || "#eab308",
    maintenanceIconStyle: newSettings.maintenanceIconStyle || db.settings.maintenanceIconStyle || "wrench",
    maintenanceTelegramActive: !!newSettings.maintenanceTelegramActive,
    settingTelegram: newSettings.settingTelegram || db.settings.settingTelegram || "https://t.me/Trivela",
    
    // Service Toggles
    enableServiceCoins: newSettings.enableServiceCoins !== false,
    enableServiceSBC: newSettings.enableServiceSBC !== false,
    enableServiceRivals: newSettings.enableServiceRivals !== false,
    enableServiceChampions: newSettings.enableServiceChampions !== false,
    enableServiceObjectives: newSettings.enableServiceObjectives !== false,
    enableServiceCoaching: newSettings.enableServiceCoaching !== false,
    enableServicePackages: newSettings.enableServicePackages !== false,

    // Coin purchase limits
    minCoinsPurchase: parseInt(newSettings.minCoinsPurchase) || 100000,
    maxCoinsPurchase: parseInt(newSettings.maxCoinsPurchase) || 10000000,

    // Custom Exchange Rates Override
    customExchangeRates: newSettings.customExchangeRates || db.settings.customExchangeRates || {},

    baseRateConsole: parseFloat(newSettings.baseRateConsole) || 2.80,
    baseRatePC: parseFloat(newSettings.baseRatePC) || 2.40,
    pointsDiscountRate: parseFloat(newSettings.pointsDiscountRate) || 37.5,
    discounts: newSettings.discounts || db.settings.discounts || [],
    content: newSettings.content || db.settings.content || {},
    marketing: newSettings.marketing || db.settings.marketing || {},
    features: newSettings.features || db.settings.features || []
  };

  writeDatabase(db);

  if (changes.length > 0) {
    addAdminLog('UPDATE_SETTINGS', `تم تحديث إعدادات المتجر: ${changes.join(' | ')}`, { settings: db.settings });
  }

  res.json({ success: true, settings: db.settings });
});

// Admin POST update features (add/edit/reorder)
app.post('/api/admin/features', (req, res) => {
  const features = req.body;
  if (!Array.isArray(features)) {
    return res.status(400).json({ error: "Invalid features data" });
  }

  const db = readDatabase();
  db.settings.features = features;
  writeDatabase(db);

  addAdminLog('UPDATE_FEATURES', 'تم تحديث وترتيب مميزات المتجر');
  res.json({ success: true, features: db.settings.features });
});

// Admin GET all email campaigns
app.get('/api/admin/email-campaigns', (req, res) => {
  const db = readDatabase();
  res.json(db.emailCampaigns || []);
});

// Admin POST create and send email campaign
app.post('/api/admin/email-campaigns', (req, res) => {
  const { subject, previewText, body, recipientCount } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ error: "Subject and Body are required" });
  }

  const db = readDatabase();
  const newCampaign = {
    id: 'camp_' + Date.now(),
    date: new Date().toISOString(),
    subject,
    previewText: previewText || "",
    body,
    recipientCount: recipientCount || 0,
    status: 'completed'
  };

  if (!db.emailCampaigns) db.emailCampaigns = [];
  db.emailCampaigns.unshift(newCampaign);
  writeDatabase(db);

  addAdminLog('SEND_EMAIL_CAMPAIGN', `تم إرسال حملة البريد الإلكتروني الجماعية: ${subject}`);
  res.json({ success: true, campaigns: db.emailCampaigns });
});

// Admin GET backup database.json file
app.get('/api/admin/backup-db', (req, res) => {
  const dbPath = path.join(__dirname, 'database.json');
  res.download(dbPath, 'trivela_database_backup.json');
});

// Admin POST restore database.json content
app.post('/api/admin/restore-db', (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.players || !backupData.users || !backupData.orders || !backupData.settings) {
    return res.status(400).json({ error: "ملف النسخة الاحتياطية غير صالح أو تالف." });
  }

  writeDatabase(backupData);
  addAdminLog('RESTORE_DATABASE', 'تم استرجاع قاعدة البيانات بالكامل من نسخة احتياطية مرفوعة.', {});
  res.json({ success: true });
});

// POST update site content (admin CMS workflow)
app.post('/api/admin/content', (req, res) => {
  const newContent = req.body;
  if (!newContent) return res.status(400).json({ error: "Invalid content data" });

  const db = readDatabase();
  db.settings.content = newContent;
  writeDatabase(db);

  addAdminLog('UPDATE_CONTENT', 'تم تحديث محتوى وتصميم صفحات المتجر');
  res.json({ success: true, content: db.settings.content });
});

// GET expenses
app.get('/api/admin/expenses', (req, res) => {
  const db = readDatabase();
  res.json(db.expenses || []);
});

// POST add expense
app.post('/api/admin/expenses', (req, res) => {
  const expenseData = req.body;
  if (!expenseData || !expenseData.title || isNaN(parseFloat(expenseData.amountUSD))) {
    return res.status(400).json({ error: "بيانات المصروف غير صالحة" });
  }

  const db = readDatabase();
  const newExpense = {
    id: 'exp_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900),
    title: expenseData.title.trim(),
    amountUSD: parseFloat(expenseData.amountUSD),
    category: expenseData.category || 'other',
    date: expenseData.date || new Date().toISOString()
  };

  if (!db.expenses) db.expenses = [];
  db.expenses.push(newExpense);
  writeDatabase(db);

  addAdminLog('ADD_EXPENSE', `تم إضافة مصروف جديد: ${newExpense.title} بقيمة ${newExpense.amountUSD}$`, { expense: newExpense });
  res.json({ success: true, expense: newExpense });
});

// DELETE expense
app.delete('/api/admin/expenses/:id', (req, res) => {
  const expenseId = req.params.id;
  const db = readDatabase();
  if (!db.expenses) db.expenses = [];
  
  const expenseIndex = db.expenses.findIndex(e => e.id === expenseId);
  if (expenseIndex === -1) {
    return res.status(404).json({ error: "المصروف غير موجود" });
  }

  const removed = db.expenses.splice(expenseIndex, 1)[0];
  writeDatabase(db);

  addAdminLog('DELETE_EXPENSE', `تم حذف مصروف: ${removed.title} بقيمة ${removed.amountUSD}$`);
  res.json({ success: true });
});

// ==========================================
// ORDER & PROFIT LOG MANAGEMENT
// ==========================================

// GET all orders for admin
app.get('/api/admin/orders', (req, res) => {
  const db = readDatabase();
  const orders = (db.orders || []).map(o => ({
    ...o,
    priceSAR: parseFloat((o.priceSAR / 3.75).toFixed(2)),
    amountPaid: parseFloat((o.amountPaid / 3.75).toFixed(2)),
    supplierCost: parseFloat((o.supplierCost / 3.75).toFixed(2)),
    profit: parseFloat((o.profit / 3.75).toFixed(2)),
    pointsDiscount: parseFloat((o.pointsDiscount / 3.75).toFixed(2))
  }));
  res.json(orders);
});

// DELETE an order (admin only)
app.delete('/api/admin/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const db = readDatabase();
  const orderIndex = db.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const order = db.orders[orderIndex];
  db.orders.splice(orderIndex, 1);
  writeDatabase(db);

  addAdminLog('DELETE_ORDER', `تم حذف الطلب #${orderId.substring(6,14)} بالكامل — العميل: ${order.customerName}`, { orderId });

  res.json({ success: true });
});

// POST submit a new order (from customer checkout)
// POST submit a new order (from customer checkout)
app.post('/api/orders', (req, res) => {
  const orderData = req.body;
  if (!orderData || !orderData.service || !orderData.priceSAR) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const db = readDatabase();

  // Extract user if auth header is present
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let user = null;
  if (token) {
    try {
      const userId = Buffer.from(token, 'base64').toString('ascii');
      user = db.users.find(u => u.id === userId);
    } catch (_) {}
  }

  // 1. Coupon validation
  if (orderData.couponCode) {
    const code = orderData.couponCode.toUpperCase().trim();
    if (!db.coupons) db.coupons = [];
    const coupon = db.coupons.find(c => c.code === code);
    if (!coupon) {
      return res.status(400).json({ error: "كوبون الخصم المدخل غير صالح." });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (coupon.expiryDate < todayStr) {
      return res.status(400).json({ error: "كوبون الخصم منتهي الصلاحية." });
    }
    if ((coupon.usedCount || 0) >= (coupon.maxUses || 999)) {
      return res.status(400).json({ error: "كوبون الخصم استنفذ الحد الأقصى للاستخدام." });
    }
  }

  // 2. Loyalty points validation & deduction
  const pointsDeducted = parseInt(orderData.pointsDeducted, 10) || 0;
  if (pointsDeducted > 0) {
    if (!user) {
      return res.status(400).json({ error: "يجب تسجيل الدخول لاستخدام نقاط الولاء." });
    }
    if ((user.points || 0) < pointsDeducted) {
      return res.status(400).json({ error: "رصيد نقاط الولاء لديك غير كافٍ لهذا الخصم." });
    }
  }

  const newOrder = {
    id: 'order_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900),
    timestamp: new Date().toISOString(),
    customerName: orderData.customerName || "زائر",
    customerPhone: orderData.customerPhone || "غير محدد",
    service: orderData.service,
    platform: orderData.platform || "غير محدد",
    priceSAR: parseFloat(orderData.priceSAR),
    pointsDiscount: parseFloat(orderData.pointsDiscount) || 0,
    pointsDeducted: pointsDeducted,
    couponCode: orderData.couponCode || null,
    // EA Account credentials
    eaEmail: orderData.eaEmail || null,
    eaPassword: orderData.eaPassword || null,
    backupCode1: orderData.backupCode1 || null,
    backupCode2: orderData.backupCode2 || null,
    backupCode3: orderData.backupCode3 || null,
    // Sony/PSN credentials (for Rivals/Champions)
    sonyEmail: orderData.sonyEmail || null,
    sonyPassword: orderData.sonyPassword || null,
    sonyBackupCode1: orderData.sonyBackupCode1 || null,
    sonyBackupCode2: orderData.sonyBackupCode2 || null,
    sonyBackupCode3: orderData.sonyBackupCode3 || null,
    // Coaching extras
    discordHandle: orderData.discordHandle || null,
    orderNotes: orderData.orderNotes || null,
    // Order lifecycle
    status: 'pending',
    amountPaid: 0,
    supplierCost: 0,
    profit: 0,
    paidAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null
  };

  if (!db.orders) db.orders = [];
  db.orders.unshift(newOrder);

  // Track coupon usage
  if (newOrder.couponCode) {
    const code = newOrder.couponCode.toUpperCase().trim();
    const coupon = db.coupons.find(c => c.code === code);
    if (coupon) {
      coupon.usedCount = (coupon.usedCount || 0) + 1;
    }
  }

  // Deduct points if validated
  if (pointsDeducted > 0 && user) {
    user.points = (user.points || 0) - pointsDeducted;
    if (!user.history) user.history = [];
    user.history.push({
      date: new Date().toISOString(),
      amount: -pointsDeducted,
      reason: `استخدام نقاط ولاء كخصم في الطلب #${newOrder.id.substring(6, 14)}`
    });
  }

  writeDatabase(db);

  addAdminLog('NEW_ORDER', `طلب جديد #${newOrder.id.substring(6,14)} من ${newOrder.customerName} — ${newOrder.service}`, { orderId: newOrder.id });

  res.json({ success: true, order: newOrder });
});

// PUT update order status (admin workflow)
app.put('/api/admin/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status, amountPaid, supplierCost } = req.body;

  const validStatuses = ['pending', 'paid', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }

  const db = readDatabase();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const now = new Date().toISOString();

  // Status: paid — customer confirmed payment
  if (status === 'paid') {
    order.status = 'paid';
    // amountPaid is received in USD, convert to SAR for disk storage
    const amtPaidUSD = parseFloat(amountPaid);
    order.amountPaid = !isNaN(amtPaidUSD) ? amtPaidUSD * 3.75 : order.priceSAR;
    order.paidAt = now;
    addAdminLog('ORDER_PAID', `تم تأكيد دفع الطلب #${order.id.substring(6,14)} — ${order.customerName} — ${(order.amountPaid / 3.75).toFixed(2)} $`, { orderId });
  }
  // Status: in_progress — sent to supplier
  else if (status === 'in_progress') {
    order.status = 'in_progress';
    // supplierCost is received in USD, convert to SAR for disk storage
    const costUSD = parseFloat(supplierCost);
    order.supplierCost = !isNaN(costUSD) ? costUSD * 3.75 : 0;
    order.startedAt = now;
    addAdminLog('ORDER_IN_PROGRESS', `تم إرسال الطلب #${order.id.substring(6,14)} للمورد — تكلفة المورد: ${(order.supplierCost / 3.75).toFixed(2)} $`, { orderId });
  }
  // Status: completed — supplier finished
  else if (status === 'completed') {
    const isAlreadyCompleted = (order.status === 'completed');
    order.status = 'completed';
    order.completedAt = now;
    order.profit = (order.amountPaid || order.priceSAR) - (order.supplierCost || 0);

    // Check if points should be awarded (only if transition to completed happens for the first time)
    if (!isAlreadyCompleted) {
      // Find matching user by phone
      const cleanPhone = (order.customerPhone || '').replace(/[\s\+\-]/g, '').trim();
      const user = db.users.find(u => {
        const uPhone = (u.phone || '').replace(/[\s\+\-]/g, '').trim();
        return uPhone === cleanPhone || (u.email && u.email.toLowerCase().trim() === (order.customerEmail || '').toLowerCase().trim());
      });

      if (user) {
        // Calculate points (1 point per 5 SAR spent)
        const earnedPoints = Math.floor(parseFloat(order.priceSAR || 0) / 5);
        if (earnedPoints > 0) {
          user.points = (user.points || 0) + earnedPoints;
          if (!user.history) user.history = [];
          user.history.push({
            date: now,
            amount: earnedPoints,
            reason: `كسب نقاط تلقائية عند إتمام الطلب #${order.id.substring(6,14)} (${order.service})`
          });
        }

        // Referral reward check
        if (user.referredBy) {
          // Check if this is their first completed order
          const priorCompleted = db.orders.filter(o => {
            const oPhone = (o.customerPhone || '').replace(/[\s\+\-]/g, '').trim();
            const sameCust = oPhone === cleanPhone || (o.customerEmail && o.customerEmail.toLowerCase().trim() === user.email.toLowerCase().trim());
            return sameCust && o.status === 'completed' && o.id !== order.id;
          });

          if (priorCompleted.length === 0) {
            // Referrer gets 50 points
            const cleanRef = user.referredBy.replace(/[\s\+\-]/g, '').trim();
            const referrer = db.users.find(u => {
              const uPhone = (u.phone || '').replace(/[\s\+\-]/g, '').trim();
              return uPhone === cleanRef || u.id === cleanRef;
            });

            if (referrer) {
              referrer.points = (referrer.points || 0) + 50;
              if (!referrer.history) referrer.history = [];
              referrer.history.push({
                date: now,
                amount: 50,
                reason: `بونص إحالة صديق: إتمام أول طلب للعميل (${user.name})`
              });
            }
          }
        }
      }
    }

    addAdminLog('ORDER_COMPLETED', `تم إتمام الطلب #${order.id.substring(6,14)} — ${order.service} — ربح صافي: ${(order.profit / 3.75).toFixed(2)} $`, { orderId, profit: order.profit });
  }
  // Status: cancelled
  else if (status === 'cancelled') {
    order.status = 'cancelled';
    order.cancelledAt = now;
    addAdminLog('ORDER_CANCELLED', `تم إلغاء الطلب #${order.id.substring(6,14)} — ${order.customerName}`, { orderId });
  }

  writeDatabase(db);
  res.json({ success: true, order });
});

// POST update order credentials/notes (admin workflow)
app.post('/api/admin/orders/:id/update-details', (req, res) => {
  const orderId = req.params.id;
  const { eaEmail, eaPassword, sonyEmail, sonyPassword, backupCodes, adminNotes } = req.body;

  const db = readDatabase();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  if (eaEmail !== undefined) order.eaEmail = eaEmail.trim();
  if (eaPassword !== undefined) order.eaPassword = eaPassword.trim();
  if (sonyEmail !== undefined) order.sonyEmail = sonyEmail.trim();
  if (sonyPassword !== undefined) order.sonyPassword = sonyPassword.trim();
  
  if (backupCodes !== undefined) {
    if (Array.isArray(backupCodes)) {
      order.backupCodes = backupCodes.map(c => c.trim());
    } else if (typeof backupCodes === 'string') {
      order.backupCodes = backupCodes.split(',').map(c => c.trim()).filter(Boolean);
    }
  }

  if (adminNotes !== undefined) order.adminNotes = adminNotes.trim();

  writeDatabase(db);
  addAdminLog('UPDATE_ORDER_DETAILS', `تم تعديل بيانات/ملاحظات الطلب #${order.id.substring(6,14)}`, { orderId });

  res.json({ success: true, order });
});

// Legacy: POST complete order (kept for backward compatibility)
app.post('/api/admin/orders/:id/complete', (req, res) => {
  const orderId = req.params.id;
  const { supplierCost } = req.body;
  const db = readDatabase();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  
  // supplierCost is received in USD, convert to SAR
  const cost = (parseFloat(supplierCost) || 0) * 3.75;
  order.status = 'completed';
  order.supplierCost = cost;
  order.profit = (order.amountPaid || order.priceSAR) - cost;
  order.completedAt = new Date().toISOString();
  writeDatabase(db);
  addAdminLog('COMPLETE_ORDER', `تم إتمام الطلب ${order.id} بتكلفة مورد ${(cost / 3.75).toFixed(2)} $`, { orderId });
  res.json({ success: true, order });
});

// ==========================================
// FAQS & REVIEWS CONTENT EDITORS
// ==========================================

// POST add/update FAQ
app.post('/api/admin/faqs', (req, res) => {
  const { id, q, a, question, answer } = req.body;
  const finalQ = q || question;
  const finalA = a || answer;
  if (!finalQ || !finalA) return res.status(400).json({ error: "الرجاء إدخال السؤال والجواب" });

  const db = readDatabase();
  if (!db.faqs) db.faqs = [];

  const faqId = id || 'faq_' + Date.now();
  const index = db.faqs.findIndex(f => f.id === faqId);

  const faqItem = { 
    id: faqId, 
    q: finalQ, 
    a: finalA, 
    question: finalQ, 
    answer: finalA 
  };

  if (index !== -1) {
    db.faqs[index] = faqItem;
    addAdminLog('UPDATE_FAQ', `تم تعديل السؤال الشائع: "${finalQ}"`, { faqId });
  } else {
    db.faqs.push(faqItem);
    addAdminLog('ADD_FAQ', `تم إضافة سؤال شائع جديد: "${finalQ}"`, { faqId });
  }

  writeDatabase(db);
  res.json({ success: true, faqs: db.faqs });
});

// DELETE FAQ
app.delete('/api/admin/faqs/:id', (req, res) => {
  const faqId = req.params.id;
  const db = readDatabase();
  if (!db.faqs) db.faqs = [];

  const initialLength = db.faqs.length;
  const faqToDelete = db.faqs.find(f => f.id === faqId);
  db.faqs = db.faqs.filter(f => f.id !== faqId);

  if (db.faqs.length === initialLength) {
    return res.status(404).json({ error: "FAQ not found" });
  }

  writeDatabase(db);
  addAdminLog('DELETE_FAQ', `تم حذف السؤال الشائع: "${faqToDelete ? faqToDelete.q : faqId}"`, { faqId });

  res.json({ success: true, faqs: db.faqs });
});

// GET all reviews (for Admin panel management)
app.get('/api/admin/reviews', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, reviews: db.reviews || [] });
});

// POST add/update Review
app.post('/api/admin/reviews', (req, res) => {
  const { id, name, platform, stars, text, badge, status } = req.body;
  if (!name || !text) return res.status(400).json({ error: "الرجاء إدخال اسم العميل والتقييم" });

  const db = readDatabase();
  if (!db.reviews) db.reviews = [];

  const revId = id || 'rev_' + Date.now();
  const index = db.reviews.findIndex(r => r.id === revId);

  const reviewItem = {
    id: revId,
    name: name.trim(),
    platform: platform || "PS5",
    stars: parseInt(stars, 10) || 5,
    text: text.trim(),
    badge: badge || "",
    status: status || "approved"
  };

  if (index !== -1) {
    db.reviews[index] = reviewItem;
    addAdminLog('UPDATE_REVIEW', `تم تعديل تقييم العميل: "${name}"`, { revId });
  } else {
    db.reviews.unshift(reviewItem); // Add new admin reviews at the top
    addAdminLog('ADD_REVIEW', `تم إضافة تقييم جديد للعميل: "${name}"`, { revId });
  }

  writeDatabase(db);
  res.json({ success: true, reviews: db.reviews });
});

// DELETE Review
app.delete('/api/admin/reviews/:id', (req, res) => {
  const revId = req.params.id;
  const db = readDatabase();
  if (!db.reviews) db.reviews = [];

  const initialLength = db.reviews.length;
  const revToDelete = db.reviews.find(r => r.id === revId);
  db.reviews = db.reviews.filter(r => r.id !== revId);

  if (db.reviews.length === initialLength) {
    return res.status(404).json({ error: "Review not found" });
  }

  writeDatabase(db);
  addAdminLog('DELETE_REVIEW', `تم حذف تقييم العميل: "${revToDelete ? revToDelete.name : revId}"`, { revId });

  res.json({ success: true, reviews: db.reviews });
});

// ==========================================
// COUPON MANAGEMENT ROUTES
// ==========================================

// Public GET all coupons
app.get('/api/public/coupons', (req, res) => {
  const db = readDatabase();
  if (!db.coupons) db.coupons = [];
  res.json(db.coupons);
});

// Admin GET all coupons
app.get('/api/admin/coupons', (req, res) => {
  const db = readDatabase();
  if (!db.coupons) db.coupons = [];
  res.json(db.coupons);
});

// Admin POST add/update coupon
app.post('/api/admin/coupons', (req, res) => {
  const newCoupon = req.body;
  if (!newCoupon || !newCoupon.code || newCoupon.percent === undefined) {
    return res.status(400).json({ error: "بيانات الكوبون غير صالحة" });
  }

  const db = readDatabase();
  if (!db.coupons) db.coupons = [];

  const couponItem = {
    code: newCoupon.code.toUpperCase().trim(),
    percent: parseFloat(newCoupon.percent),
    maxUses: parseInt(newCoupon.maxUses, 10) || 999,
    usedCount: parseInt(newCoupon.usedCount, 10) || 0,
    expiryDate: newCoupon.expiryDate || "2027-12-31"
  };

  const index = db.coupons.findIndex(c => c.code === couponItem.code);
  if (index !== -1) {
    db.coupons[index] = couponItem;
    addAdminLog('UPDATE_COUPON', `تم تعديل الكوبون: "${couponItem.code}" (خصم ${couponItem.percent}%)`, { code: couponItem.code });
  } else {
    db.coupons.push(couponItem);
    addAdminLog('ADD_COUPON', `تم إضافة كوبون جديد: "${couponItem.code}" (خصم ${couponItem.percent}%)`, { code: couponItem.code });
  }

  writeDatabase(db);
  res.json({ success: true, coupons: db.coupons });
});

// Admin DELETE coupon
app.delete('/api/admin/coupons/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const db = readDatabase();
  if (!db.coupons) db.coupons = [];

  const initialLength = db.coupons.length;
  db.coupons = db.coupons.filter(c => c.code !== code);

  if (db.coupons.length === initialLength) {
    return res.status(404).json({ error: "الكوبون غير موجود" });
  }

  writeDatabase(db);
  addAdminLog('DELETE_COUPON', `تم حذف الكوبون التسويقي: "${code}"`, { code });

  res.json({ success: true, coupons: db.coupons });
});

// Authenticated POST to redeem loyalty points for discount coupons
app.post('/api/public/redeem-points', authenticateToken, (req, res) => {
  const { rewardType } = req.body;
  const userId = req.user.id;

  const validRewards = {
    'sar10': { cost: 100, discount: 5, label: "5%" },
    'sar30': { cost: 250, discount: 12, label: "12%" },
    'sar70': { cost: 500, discount: 25, label: "25%" }
  };

  if (!validRewards[rewardType]) {
    return res.status(400).json({ error: "نوع مكافأة غير صالح" });
  }

  const reward = validRewards[rewardType];
  const db = readDatabase();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  if ((user.points || 0) < reward.cost) {
    return res.status(400).json({ error: "رصيد نقاطك غير كافٍ لاستبدال هذه المكافأة" });
  }

  // Deduct points
  user.points = (user.points || 0) - reward.cost;
  if (!user.history) user.history = [];
  
  const couponCode = `TRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  user.history.push({
    date: new Date().toISOString(),
    amount: -reward.cost,
    reason: `استبدال نقاط بكوبون خصم ${reward.label} (${couponCode})`
  });

  // Create the coupon
  if (!db.coupons) db.coupons = [];
  db.coupons.push({
    code: couponCode,
    percent: reward.discount, // Convert to actual percentage discount!
    maxUses: 1,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days validation
  });

  writeDatabase(db);
  res.json({ success: true, points: user.points, couponCode, discount: reward.discount, label: reward.label });
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Trivela Server running at: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});

