
function closeMenu() {
  const menu = document.getElementById('navMenu');
  const hb   = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (hb)   hb.classList.remove('active');
}
/* Trivela — script.js */

// ──────────────────────────────────────────────
// SERVICES DATA — Ultimate Team Full Catalog
// ──────────────────────────────────────────────

const SERVICES = [
  // ─── COINS ───────────────────────────────
  {
    id:'coins-instant', cat:'coins', hot:true, featured:true,
    icon:'fas fa-coins', iconClass:'srv-icon-gold',
    name:'كوينز فورية',
    badge:'🔥 الأكثر طلباً',
    badgeType:'hot',
    desc:'الكوينز تصلك في حسابك خلال 1–5 دقائق من تأكيد الدفع. توصيل آمن عبر سوق التحويل بدون أي خطر على حسابك.',
    chips:['توصيل <5 دق', 'آمان 100%', 'جميع المنصات', 'جميع العملات'],
    priceLabel:'من', price:'.99',
    link:'#calculator',
  },
  // ─── SBC ─────────────────────────────────
  {
    id:'sbc-normal', cat:'sbc', hot:false, featured:false,
    icon:'fas fa-puzzle-piece', iconClass:'srv-icon-purple',
    name:'إنهاء SBC عادي',
    badge:'', badgeType:'',
    desc:'نحل لك أي SBC بجميع متطلباته من الكيمياء والتقييم والجنسية بأسرع وقت ممكن.',
    chips:['جميع الأنواع', 'كيمياء صح', 'ضمان الإتمام'],
    priceLabel:'من', price:'$3.99',
    link:'#order',
  },
  {
    id:'sbc-vip', cat:'sbc', hot:true, featured:true,
    icon:'fas fa-trophy', iconClass:'srv-icon-purple',
    name:'SBC لاعب مميز (TOTY/TOTS/ICON)',
    badge:'🔥 مطلوب جداً', badgeType:'hot',
    desc:'نحل لك SBCs اللاعبين النادرين والأيقونات — TOTY، TOTS، ICON، Hero، وأي لاعب خاص. نوفر الكوينز والحل.',
    chips:['TOTY', 'TOTS', 'ICON', 'Hero', 'ضمان'],
    priceLabel:'يبدأ من', price:'$9.99',
    link:'#order',
  },
  {
    id:'sbc-hybrid', cat:'sbc', hot:false, featured:false,
    icon:'fas fa-shuffle', iconClass:'srv-icon-purple',
    name:'SBC هايبرد (Hybrid)',
    badge:'', badgeType:'',
    desc:'SBCs اللي تشترط جنسيات أو دوريات متعددة مع كيمياء عالية؟ ندير لك الحل الأمثل بأقل تكلفة.',
    chips:['Multi-League', 'Multi-Nation', 'أقل تكلفة'],
    priceLabel:'من', price:'$4.99',
    link:'#order',
  },
  {
    id:'sbc-seasonal', cat:'sbc', hot:false, featured:false,
    icon:'fas fa-calendar-check', iconClass:'srv-icon-purple',
    name:'حل جميع SBCs الموسمية',
    badge:'🆕 جديد', badgeType:'new',
    desc:'نحل لك جميع SBCs الموسم كاملة — الأسبوعية والشهرية وتحديات الفعاليات بدون ما تتعب.',
    chips:['موسمية', 'أسبوعية', 'فعاليات', 'شامل'],
    priceLabel:'حزمة من', price:'$14.99',
    link:'#order',
  },

  // ─── MISSIONS / OBJECTIVES ───────────────
  {
    id:'obj-weekly', cat:'missions', hot:false, featured:false,
    icon:'fas fa-list-check', iconClass:'srv-icon-green',
    name:'مهام أسبوعية (Weekly Objectives)',
    badge:'', badgeType:'',
    desc:'نسوي لك كل المهام الأسبوعية بدون ما تحتاج تلعب — تستلم المكافآت جاهزة.',
    chips:['كل أسبوع', 'مكافآت فورية', 'بدون جهد'],
    priceLabel:'من', price:'$4.99',
    link:'#order',
  },
  {
    id:'obj-season', cat:'missions', hot:true, featured:false,
    icon:'fas fa-star', iconClass:'srv-icon-green',
    name:'مهام الموسم (Season Objectives)',
    badge:'🔥 رهيب', badgeType:'hot',
    desc:'نكمل لك مسار مهام الموسم كاملاً للحصول على أفضل المكافآت والباقات المجانية.',
    chips:['موسم كامل', 'لاعبين مجانيين', 'باقات', 'XP'],
    priceLabel:'من', price:'$12.99',
    link:'#order',
  },
  {
    id:'obj-milestone', cat:'missions', hot:false, featured:false,
    icon:'fas fa-flag-checkered', iconClass:'srv-icon-green',
    name:'ميلستون لاعب (Player Milestones)',
    badge:'', badgeType:'',
    desc:'نكمل لك ميلستون أي لاعب تريده لتطوير بطاقته والحصول على النسخة المحسنة.',
    chips:['أي لاعب', 'تطوير البطاقة', 'سريع'],
    priceLabel:'من', price:'$5.99',
    link:'#order',
  },
  {
    id:'obj-evolution', cat:'missions', hot:true, featured:true,
    icon:'fas fa-dna', iconClass:'srv-icon-green',
    name:'تطوير لاعب (Evolution)',
    badge:'🆕 FIFA 27', badgeType:'new',
    desc:'نكمل لك مسار تطوير أي لاعب من بطاقته العادية لأعلى نسخة محسنة — بدون ما تلعب مباراة.',
    chips:['Player Evo', 'جميع المراحل', 'ضمان', 'سريع'],
    priceLabel:'من', price:'$7.99',
    link:'#order',
  },
  {
    id:'obj-full', cat:'missions', hot:false, featured:false,
    icon:'fas fa-check-double', iconClass:'srv-icon-green',
    name:'باقة المهام الكاملة',
    badge:'', badgeType:'',
    desc:'نكمل لك كل المهام: أسبوعية + موسمية + ميلستون + تطوير لاعبين — حزمة شاملة.',
    chips:['كل المهام', 'وفّر أكثر', 'شامل', 'شهري'],
    priceLabel:'من', price:'$24.99',
    link:'#order',
  },

  // ─── PLAYING FUT ─────────────────────────
  {
    id:'play-rivals', cat:'play', hot:true, featured:true,
    icon:'fas fa-swords', iconClass:'srv-icon-red',
    name:'لعب الرايفلز (Division Rivals)',
    badge:'🔥 الأكثر طلباً', badgeType:'hot',
    desc:'نلعب لك مباريات الرايفلز بأحسن لاعبين وتكتيك. ترتقي في القسم وتجمع نقاط ريفورد بدون ضغط.',
    chips:['مباريات حقيقية', 'فوز مضمون', 'نقاط ريفورد', 'جميع الأقسام'],
    priceLabel:'من (10 مباريات)', price:'$7.99',
    link:'#order',
  },
  {
    id:'play-rank', cat:'play', hot:false, featured:false,
    icon:'fas fa-ranking-star', iconClass:'srv-icon-red',
    name:'ترقية رتبة (Division Climb)',
    badge:'', badgeType:'',
    desc:'تريد تصل لـ Division 3، 2، أو Elite؟ نوصلك للرتبة اللي تريدها خطوة بخطوة.',
    chips:['Div 1 → Elite', 'ترقية مضمونة', 'سريع'],
    priceLabel:'يبدأ من', price:'$14.99',
    link:'#order',
  },
  {
    id:'play-wl', cat:'play', hot:true, featured:true,
    icon:'fas fa-trophy', iconClass:'srv-icon-orange',
    name:'ويك إند ليج (FUT Champions)',
    badge:'👑 VIP', badgeType:'hot',
    desc:'نلعب لك الـ 20 أو 30 مباراة كاملة في ويك إند ليج وتحصل على أعلى مكافأة ممكنة (Elite/Gold 1).',
    chips:['20–30 مباراة', 'Elite rank', 'مكافآت ضخمة', 'ضمان'],
    priceLabel:'من', price:'$29.99',
    link:'#order',
  },
  {
    id:'play-draft', cat:'play', hot:false, featured:false,
    icon:'fas fa-layer-group', iconClass:'srv-icon-indigo',
    name:'لعب الدرافت (FUT Draft)',
    badge:'', badgeType:'',
    desc:'نلعب لك الدرافت ونوصل لأكبر عدد من الانتصارات للحصول على أعلى المكافآت من باقات وكوينز.',
    chips:['Draft Tokens', 'مكافآت', 'باقات نادرة'],
    priceLabel:'لكل تيكت', price:'$5.99',
    link:'#order',
  },
  {
    id:'play-squad', cat:'play', hot:false, featured:false,
    icon:'fas fa-shield-halved', iconClass:'srv-icon-teal',
    name:'Squad Battles (رتبة محددة)',
    badge:'', badgeType:'',
    desc:'نلعب لك Squad Battles أسبوعياً ونوصلك لرتبة Elite أو Legendary للحصول على أفضل الريفوردز.',
    chips:['Elite rank', 'Legendary', 'أسبوعي', 'ريفوردز'],
    priceLabel:'من', price:'$6.99',
    link:'#order',
  },
  {
    id:'play-manager', cat:'play', hot:false, featured:false,
    icon:'fas fa-clipboard-list', iconClass:'srv-icon-blue',
    name:'Manager Tasks',
    badge:'', badgeType:'',
    desc:'نكمل لك مهام المدير (Manager Tasks) المطلوبة للحصول على بطاقة المدير المحسنة.',
    chips:['Manager Evo', 'مهام كاملة', 'بطاقة محسنة'],
    priceLabel:'من', price:'$3.99',
    link:'#order',
  },

  // ─── SQUAD BUILDING ──────────────────────
  {
    id:'squad-custom', cat:'squad', hot:true, featured:true,
    icon:'fas fa-people-group', iconClass:'srv-icon-blue',
    name:'بناء فريق مخصص',
    badge:'🔥 رهيب', badgeType:'hot',
    desc:'نبني لك فريق الأحلام حسب ميزانيتك وتفضيلاتك — أفضل لاعبين بأفضل كيمياء وتكتيك.',
    chips:['أي ميزانية', 'كيمياء 100%', 'فريق مثالي', 'استشارة مجانية'],
    priceLabel:'استشارة', price:'مجاني',
    link:'#order',
  },
  {
    id:'squad-rated', cat:'squad', hot:false, featured:false,
    icon:'fas fa-star', iconClass:'srv-icon-blue',
    name:'فريق بتقييم محدد (85+/90+/95+)',
    badge:'', badgeType:'',
    desc:'تحتاج فريق 85+ أو 90+ للـ SBC؟ نبنيه لك بأقل تكلفة ممكنة وأعلى كيمياء.',
    chips:['85+ SBC', '90+ SBC', '95+ Squad', 'توفير كوينز'],
    priceLabel:'من', price:'$4.99',
    link:'#order',
  },
  {
    id:'squad-hybrid', cat:'squad', hot:false, featured:false,
    icon:'fas fa-diagram-project', iconClass:'srv-icon-blue',
    name:'فريق هايبرد (Hybrid)',
    badge:'🆕 جديد', badgeType:'new',
    desc:'نصمم لك فريق Hybrid بجنسيات ودوريات متعددة مع كيمياء عالية ولاعبين على مستوى عالي.',
    chips:['Multi-League', 'Multi-Nation', 'كيمياء عالية'],
    priceLabel:'استشارة', price:'مجاني',
    link:'#order',
  },
  {
    id:'squad-icons', cat:'squad', hot:false, featured:false,
    icon:'fas fa-crown', iconClass:'srv-icon-gold',
    name:'فريق ICONs كامل',
    badge:'👑 فخامة', badgeType:'hot',
    desc:'نبني لك فريق ICONs كامل من أساطير كرة القدم — من Ronaldo لـ Zidane لـ Messi وأكثر.',
    chips:['Full ICONs', 'أساطير', 'كيمياء صح', 'فريق الأحلام'],
    priceLabel:'حسب الميزانية', price:'تواصل',
    link:'#order',
  },
  {
    id:'squad-tactic', cat:'squad', hot:false, featured:false,
    icon:'fas fa-chess', iconClass:'srv-icon-indigo',
    name:'تكتيك وتشكيلة مخصصة',
    badge:'', badgeType:'',
    desc:'نحلل أسلوب لعبك ونصمم لك أفضل تكتيك وتشكيلة تناسبك — تعليمات ضربات وحارس وخطوط دفاع.',
    chips:['Custom Tactics', 'أي تشكيلة', 'تحليل شامل'],
    priceLabel:'استشارة', price:'مجاني',
    link:'#order',
  },
  {
    id:'squad-improve', cat:'squad', hot:false, featured:false,
    icon:'fas fa-arrow-trend-up', iconClass:'srv-icon-green',
    name:'تحسين فريقك الحالي',
    badge:'', badgeType:'',
    desc:'عندك فريق وتبي تحسنه؟ نراجع فريقك ونقترح أفضل ترقيات بأقل ميزانية.',
    chips:['Squad Review', 'ترقيات ذكية', 'ميزانية محدودة'],
    priceLabel:'استشارة', price:'مجاني',
    link:'#order',
  },

  // ─── PLAYERS ─────────────────────────────
  {
    id:'players-rare', cat:'players', hot:true, featured:false,
    icon:'fas fa-gem', iconClass:'srv-icon-pink',
    name:'توفير لاعب نادر',
    badge:'💎 حصري', badgeType:'hot',
    desc:'تبي TOTY Mbappe؟ ICON Ronaldo؟ نوفر لك أي لاعب نادر بأفضل سعر من السوق.',
    chips:['ICON', 'TOTY', 'TOTS', 'Hero', 'ضمان'],
    priceLabel:'حسب اللاعب', price:'تواصل',
    link:'#order',
  },
  {
    id:'players-trading', cat:'players', hot:false, featured:false,
    icon:'fas fa-arrows-rotate', iconClass:'srv-icon-green',
    name:'تداول كوينز (Trading)',
    badge:'', badgeType:'',
    desc:'تعلم أسرار Trading أو خلّ خبراءنا يتاجرون بكوينزك لمضاعفتها في سوق FUT.',
    chips:['سوق FUT', 'مضاعفة كوينز', 'استراتيجيات'],
    priceLabel:'من', price:'$9.99',
    link:'#order',
  },
  {
    id:'players-upgrade', cat:'players', hot:false, featured:false,
    icon:'fas fa-bolt', iconClass:'srv-icon-orange',
    name:'Upgrade لاعب بـ SBC',
    badge:'', badgeType:'',
    desc:'عندك لاعب عادي وتبيه يصير بطاقة Special؟ نحل لك مسار Upgrade كامل بأقل تكلفة.',
    chips:['SBC Upgrade', 'Special Cards', 'توفير'],
    priceLabel:'من', price:'$6.99',
    link:'#order',
  },
  {
    id:'players-search', cat:'players', hot:false, featured:false,
    icon:'fas fa-magnifying-glass', iconClass:'srv-icon-blue',
    name:'بحث عن لاعب بسعر أفضل',
    badge:'', badgeType:'',
    desc:'نراقب السوق لك ونشتري اللاعب اللي تريده بأقل سعر ممكن في الوقت المناسب.',
    chips:['Market Watch', 'أقل سعر', 'ذكي'],
    priceLabel:'مجاني', price:'مجاني',
    link:'#order',
  },

  // ─── BUNDLES ─────────────────────────────
  {
    id:'bundle-starter', cat:'coins', hot:false, featured:false,
    icon:'fas fa-gift', iconClass:'srv-icon-teal',
    name:'حزمة Starter — ابدأ قوياً',
    badge:'🎁 وفّر 20%', badgeType:'new',
    desc:'حزمة مثالية للمبتدئين: 1M كوين + بناء فريق + تكتيك مخصص + استشارة مجانية.',
    chips:['1M كوين', 'بناء فريق', 'تكتيك', 'استشارة'],
    priceLabel:'حزمة', price:'$22.99',
    link:'#order',
  },
  {
    id:'bundle-vip', cat:'coins', hot:true, featured:true,
    icon:'fas fa-infinity', iconClass:'srv-icon-gold',
    name:'حزمة VIP الشهرية — كل شيء',
    badge:'👑 الأفضل', badgeType:'hot',
    desc:'اشتراك شهري شامل: كوينز أسبوعية + SBCs + مهام + رايفلز + دعم مخصص + VIP لا ينتهي.',
    chips:['شهري', 'كل الخدمات', 'دعم VIP', 'لا حدود'],
    priceLabel:'شهرياً', price:'$79.99',
    link:'#order',
  },
];

// ──────────────────────────────────────────────
// DATA
// ──────────────────────────────────────────────

// Base price per 100K coins in USD (platform multiplier applied below)
const savedPrice = localStorage.getItem('trivelaBasePrice');
const basePS = savedPrice ? parseFloat(savedPrice) : 2.80;
const BASE_RATE_PER_100K = {
  console: basePS,   // PS4, PS5, Xbox combined
  pc: basePS - 0.4
};

// Currency exchange rates vs USD + symbol + formatter decimals
const CURRENCIES = {
  USD: { symbol:'$',    rate:1,        dec:2, name:'USD' },
  SAR: { symbol:'ر.س', rate:3.75,     dec:2, name:'SAR' },
  AED: { symbol:'د.إ', rate:3.67,     dec:2, name:'AED' },
  KWD: { symbol:'د.ك', rate:0.307,    dec:3, name:'KWD' },
  BHD: { symbol:'د.ب', rate:0.376,    dec:3, name:'BHD' },
  QAR: { symbol:'ر.ق', rate:3.64,     dec:2, name:'QAR' },
  OMR: { symbol:'ر.ع', rate:0.385,    dec:3, name:'OMR' },
  JOD: { symbol:'د.أ', rate:0.709,    dec:3, name:'JOD' },
  EGP: { symbol:'ج.م', rate:49.5,     dec:1, name:'EGP' },
  MAD: { symbol:'د.م', rate:9.97,     dec:2, name:'MAD' },
  DZD: { symbol:'د.ج', rate:134,      dec:0, name:'DZD' },
  TND: { symbol:'د.ت', rate:3.09,     dec:2, name:'TND' },
  LYD: { symbol:'د.ل', rate:4.82,     dec:2, name:'LYD' },
  IQD: { symbol:'د.ع', rate:1308,     dec:0, name:'IQD' },
  LBP: { symbol:'ل.ل', rate:89500,    dec:0, name:'LBP' },
  SYP: { symbol:'ل.س', rate:12900,    dec:0, name:'SYP' },
  YER: { symbol:'ر.ي', rate:250,      dec:0, name:'YER' },
  SDG: { symbol:'ج.س', rate:600,      dec:0, name:'SDG' },
};

// Discount tiers: [minCoins, discountPercent]
const DISCOUNTS = [
  [10_000_000, 20],
  [ 5_000_000, 10],
  [ 1_000_000,  5],
  [       0,    0],
];

const REVIEWS = [
  { name:'محمد الشمري',    platform:'PS5', stars:5, text:'والله أسرع توصيل شفته بحياتي! الكوينز وصلت في 3 دقائق بالضبط بعد الدفع. سعر ممتاز وخدمة احترافية جداً.', initial:'م', badge:'عميل VIP' },
  { name:'عبدالله القحطاني', platform:'Xbox', stars:5, text:'جربت كثير من المتاجر وهذا الأفضل بكل المقاييس. المتجر موثوق، توصيل فوري، ودعم جاهز يرد فوراً على واتساب.', initial:'ع', badge:'' },
  { name:'سارة المطيري',    platform:'PC',   stars:5, text:'مذهل! طلبت مليون كوين بالدينار الكويتي وكانت العملية سلسة 100%. الكوينز وصلت ولعبت مباشرة.', initial:'س', badge:'عميلة جديدة' },
  { name:'فيصل العمري',     platform:'PS4',  stars:5, text:'أكثر من سنة وأنا أتعامل مع Trivela ولم يخذلني ولو مرة. برنامج النقاط رائع واحصل دائماً على خصومات.', initial:'ف', badge:'عميل VIP' },
  { name:'أحمد الدوسري',    platform:'PS5',  stars:5, text:'أنصح كل الناس يشتروا من هنا. سعر أقل من المنافسين بكثير وضمان الاسترجاع أعطاني ثقة كاملة من اليوم الأول.', initial:'أ', badge:'' },
  { name:'خالد المحمود',    platform:'Xbox', stars:4, text:'خدمة ممتازة والتوصيل كان أسرع من المتوقع. اشتريت بالريال السعودي وكان السعر عادل جداً مقارنة بالسوق.', initial:'خ', badge:'' },
  { name:'نورة الحربي',     platform:'PC',   stars:5, text:'أول مرة أشتري كوينز ووجدت الموقع سهل جداً. الدعم ساعدني خطوة بخطوة وأنا خايفة. شكراً Trivela!', initial:'ن', badge:'عميلة جديدة' },
  { name:'ياسر السلمي',     platform:'PS5',  stars:5, text:'صراحة لقيتهم عن طريق صديق ووالله ما توقعت تجربة بهالمستوى. اشتريت 5 مليون وكانت بأسرع توصيل شفته.', initial:'ي', badge:'' },
  { name:'لمياء الزهراني',  platform:'PS4',  stars:5, text:'للبنات اللي خايفات — المتجر نظيف وموثوق. تعاملت معهم أكثر من 10 مرات ودائماً تجربة ممتازة وبدون أي مشاكل.', initial:'ل', badge:'عميلة VIP' },
];

const FAQS = [
  { q:'كيف يتم توصيل الكوينز لحسابي؟', a:'نستخدم طريقة Player-Auction عبر سوق التحويل في FIFA 27 — تضع لاعب للبيع ونشتريه بالكوينز. الأسلوب الأكثر أماناً وأمنع من الحظر.' },
  { q:'كم يستغرق التوصيل عادةً؟', a:'في الغالب من 1 إلى 5 دقائق. في أوقات الذروة قد يصل لـ 15 دقيقة كحد أقصى. ستبقى على تواصل مع المختص حتى اكتمال التوصيل.' },
  { q:'هل ستُحظر حسابي من EA؟', a:'لا. عملنا أكثر من 15,000 طلب ولم يُحظر أي حساب. نستخدم أسلوباً آمناً ومجرباً يحاكي تصرفات اللاعبين الطبيعيين.' },
  { q:'ما هي طرق الدفع المتاحة؟', a:'نحن نقبل التحويل البنكي المحلي (مثل بنك الراجحي والأهلي)، و STC Pay، و Apple Pay، بالإضافة للبطاقات الائتمانية. تتم جميع ترتيبات الدفع وتأكيد الأوردر يدوياً وبسرعة عبر المحادثة المباشرة في الواتساب.' },
  { q:'ماذا لو لم تصلني الكوينز؟', a:'نضمن لك الاسترجاع الكامل فوراً بدون جدال ولا شروط. راحتك وثقتك أهم من أي شيء بالنسبة لنا.' },
  { q:'هل تدعمون جميع المناطق وMUT/FUT؟', a:'نعم، ندعم FUT (Ultimate Team) على كل المناطق والمنصات. تواصل معنا مع تحديد منطقتك والمنصة.' },
  ];

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let currentPlatform = 'console';
let currentCurrency = 'USD';
let currentCoins    = 1_000_000;

// ──────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────
const fmt = (n, dec=2) => new Intl.NumberFormat('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec }).format(n);
const fmtCoins = n => {
  if (n >= 1_000_000) return (n / 1_000_000) % 1 === 0 ? `${n/1_000_000}M` : `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${n/1_000}K`;
  return String(n);
};

function getDiscount(coins) {
  for (const [min, pct] of DISCOUNTS) {
    if (coins >= min) return pct;
  }
  return 0;
}

function calcPrice(coins, platform, currency) {
  const rateUSD = BASE_RATE_PER_100K[platform];
  const baseUSD = (coins / 100_000) * rateUSD;
  const discPct  = getDiscount(coins);
  const finalUSD = baseUSD * (1 - discPct / 100);
  const oldUSD   = baseUSD * 1.35; // "was" price
  const cur = CURRENCIES[currency];
  return {
    now:      finalUSD * cur.rate,
    old:      oldUSD  * cur.rate,
    disc:     discPct,
    symbol:   cur.symbol,
    dec:      cur.dec,
    per1k:    (finalUSD / (coins / 1_000)) * cur.rate,
  };
}

// ──────────────────────────────────────────────
// NAVBAR
// ──────────────────────────────────────────────
function initNavbar() {
  const nav  = document.getElementById('navbar');
  const ham  = document.getElementById('hamburger');
  const menu = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('solid', window.scrollY > 40);
  }, { passive:true });

  ham.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

// ──────────────────────────────────────────────
// COUNTERS
// ──────────────────────────────────────────────
function initCounters() {
  const els = document.querySelectorAll('.counter');
  const io  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const end = parseInt(el.dataset.to, 10);
      const dur = 1800;
      const t0  = performance.now();
      const step = ts => {
        const p = Math.min((ts - t0) / dur, 1);
        const v = Math.round(p * p * (3 - 2*p) * end); // smoothstep
        const suffix = el.dataset.suffix || '';
        el.textContent = new Intl.NumberFormat('en-US').format(v) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold:0.5 });
  els.forEach(el => io.observe(el));
}

// ──────────────────────────────────────────────
// PRICE CALCULATOR
// ──────────────────────────────────────────────
function updatePriceDisplay() {
  const p = calcPrice(currentCoins, currentPlatform, currentCurrency);
  const sym = p.symbol;

  document.getElementById('liveCoins').textContent = new Intl.NumberFormat('en-US').format(currentCoins);
  document.getElementById('priceNow').textContent  = `${sym}${fmt(p.now, p.dec)}`;
  document.getElementById('oldPriceTxt').textContent = `${sym}${fmt(p.old, p.dec)}`;
  document.getElementById('saveBadge').textContent = p.disc > 0 ? `وفّر ${p.disc}%` : 'أفضل سعر';
  document.getElementById('pricePer').textContent  = `${sym}${fmt(p.per1k, p.dec + 1)} لكل 1,000 كوين`;

  // SAR badge
  const sarBadge = document.getElementById('sarBadge');
  if (sarBadge) sarBadge.style.display = currentCurrency === 'SAR' ? 'block' : 'none';

  // Bulk discount message
  const bulkEl = document.getElementById('bulkMsg');
  if (currentCoins >= 5_000_000) {
    bulkEl.classList.add('show');
    bulkEl.textContent = `🎉 خصم ${p.disc}% مُطبَّق تلقائياً على طلبك الكبير!`;
  } else {
    bulkEl.classList.remove('show');
  }
}



function updateSliderFill() {
  const slider = document.getElementById('coinsSlider');
  const fill   = document.getElementById('sliderFill');
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  fill.style.width = pct + '%';
}

function initCalculator() {
  // Obsolete — Calculator removed from page
}

// ──────────────────────────────────────────────
// SMOOTH SCROLL
// ──────────────────────────────────────────────
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

function initReviews() {
  const container = document.getElementById('reviewsMasonry');
  if(!container) return;
  container.innerHTML = REVIEWS.map(r => `
    <div class="rc">
      <div class="rc-top">
        <div class="rc-avatar">${r.initial}</div>
        <div class="rc-info">
          <strong>${r.name}</strong>
          <span>${r.badge ? r.badge + ' · ' : ''}${r.platform}</span>
        </div>
      </div>
      <div class="rc-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
      <p class="rc-text">${r.text}</p>
      <span class="rc-platform">FIFA 27 FUT — ${r.platform}</span>
    </div>
  `).join('');
}

// ──────────────────────────────────────────────
// FAQ ACCORDION
// ──────────────────────────────────────────────
function initFAQ() {
  const list = document.getElementById('faqList');
  if(!list) return;
  list.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" id="faq-item-${i}">
      <div class="faq-q" onclick="toggleFAQ(${i})">
        <span>${f.q}</span>
        <div class="faq-chevron"><i class="fas fa-chevron-down"></i></div>
      </div>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  document.querySelectorAll('.faq-item').forEach((el, idx) => {
    el.classList.toggle('open', idx === i && !el.classList.contains('open'));
  });
}

let dynamicSettings = {
  whatsappPhone: "966500000000",
  instagramUrl: "https://instagram.com/Trivela",
  maintenanceMode: false
};

// Fetch public configurations
function fetchPublicContent() {
  return fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        dynamicSettings = data.settings;
        updateSupportLinks();
        if (typeof applyCMSContent === 'function') {
          applyCMSContent();
        }
      }
      if (data.faqs && data.faqs.length > 0) {
        FAQS.length = 0;
        data.faqs.forEach(f => FAQS.push({ q: f.q, a: f.a }));
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
    })
    .catch(err => {
      console.warn("Could not fetch public store content dynamically:", err);
    });
}

function updateSupportLinks() {
  const waLinks = document.querySelectorAll('a[href^="https://wa.me/"]');
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
      const username = dynamicSettings.instagramUrl.split('/').filter(Boolean).pop() || 'Trivela';
      span.textContent = `@${username}`;
    }
  });
}

// ──────────────────────────────────────────────
// INIT ALL
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCounters();
  initCalculator();
  initServices();
  initSmoothScroll();
  
  fetchPublicContent().then(() => {
    initReviews();
    initFAQ();
    initScrollReveal();
  });
  
  initOrderForm();
  initScrollTop();
  initReveal();
  initCalcBuyBtn();
  initCoinFloats();
});

// ══════════════════════════════════════════════
// SCROLL REVEAL — IntersectionObserver
// ══════════════════════════════════════════════
function initScrollReveal() {
  const revealEls = document.querySelectorAll(
    '.srv-card, .rev-card, .pol-card, .faq-item, ' +
    '.section-h2, .section-tag, .section-sub, ' +
    '.calc-box, .order-card, .hero-numbers'
  );

  revealEls.forEach(el => {
    el.classList.add('reveal');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════
// FLOATING COIN ICONS ANIMATION
// ══════════════════════════════════════════════
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

// ──────────────────────────────────────────────
// ORDER FORM
// ──────────────────────────────────────────────
function initOrderForm() {
  const form   = document.getElementById('orderForm');
  const modal  = document.getElementById('modalBg');
  const close  = document.getElementById('closeModal');

  if(form) form.addEventListener('submit', e => {
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
      '🎮 طلب جديد — Trivela\n\n' +
      '👤 الاسم: ' + name + '\n' +
      '🛠️ الخدمة: ' + service + '\n' +
      '🕹️ المنصة: ' + platform + '\n' +
      '💰 الكمية: ' + coins + '\n' +
      '💵 العملة: ' + currency + '\n' +
      '📱 التواصل: ' + contact + '\n' +
      '📝 ملاحظات: ' + (notes || 'لا يوجد') + '\n\n' +
      '_أرسل من Trivela.com_'
    );
    window.open('https://wa.me/966500000000?text=' + msg, '_blank');
    if (modal) modal.classList.add('open');
    form.reset();
  });

  if(close) close.addEventListener('click', () => { if(modal) modal.classList.remove('open'); });
  if(modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

// ──────────────────────────────────────────────
// SCROLL TOP
// ──────────────────────────────────────────────
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if(!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', scrollY > 350);
  }, { passive:true });
  btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
}

// ──────────────────────────────────────────────
// SCROLL REVEAL (feature cards + step cards)
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// "BUY NOW" FROM CALCULATOR — pass data to form
// ──────────────────────────────────────────────
function initCalcBuyBtn() {
  const btn = document.getElementById('calcBuyBtn');
  if(!btn) return;
  btn.addEventListener('click', () => {
    // Pre-fill the order form
    const coinsFormatted = new Intl.NumberFormat('en-US').format(currentCoins) + ' كوين';
    const coinsInput = document.getElementById('fCoins');
    if (coinsInput) coinsInput.value = coinsFormatted;
    const currSelect = document.getElementById('fCurrency');
    if (currSelect) currSelect.value = currentCurrency;
  });
}

// ──────────────────────────────────────────────
// SERVICES RENDERER & FILTER
// ──────────────────────────────────────────────
function setPlatformField(plat) {
  const platSel = document.getElementById('fPlatform');
  const srvSel  = document.getElementById('fService');
  if (platSel) {
    if (plat === 'PC') {
      platSel.value = 'PC';
      if (srvSel) {
        // Preselect PC coins option
        for (let i = 0; i < srvSel.options.length; i++) {
          if (srvSel.options[i].text.includes('PC')) {
            srvSel.selectedIndex = i;
            break;
          }
        }
      }
    } else {
      platSel.value = 'PS5'; // Default console selection in our list is PS5
      if (srvSel) {
        // Preselect PS5 coins option as default for console
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

function setServiceField(srv) {
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

function initServices() {
  // Obsolete — Services section replaced with custom grid
}

function initAnnBar() {
  const slides = document.querySelectorAll('.ann-slide');
  const closeBtn = document.getElementById('annClose');
  const annBar = document.getElementById('annBar');
  
  if (!slides.length || !annBar) return;
  
  let curIndex = 0;
  setInterval(() => {
    slides[curIndex].classList.remove('active');
    curIndex = (curIndex + 1) % slides.length;
  }, 4000);

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      annBar.style.display = 'none';
    });
  }
  const revealEls = document.querySelectorAll(
    '.srv-card, .rev-card, .pol-card, .faq-item, ' +
    '.section-h2, .section-tag, .section-sub, ' +
    '.calc-box, .order-card, .hero-numbers'
  );

  revealEls.forEach(el => {
    el.classList.add('reveal');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════
// FLOATING COIN ICONS ANIMATION
// ══════════════════════════════════════════════
function initCoinFloats() {
  const floats = document.querySelectorAll('.fifa-deco');
  floats.forEach((el, i) => {
    // Randomize starting position slightly
    const baseBottom = parseFloat(el.style.bottom) || 10;
    el.style.bottom = baseBottom + 'vh';
    // Trigger animation
    setTimeout(() => {
      el.style.opacity = '1';
    }, i * 800);
  });
}

// Expose Coaching Booking Redirect globally
window.openStaticCoachingBooking = function(packageType, price) {
  let serviceId = 'coaching_basic';
  if (packageType === 'برو') {
    serviceId = 'coaching_pro';
  } else if (packageType === 'برو بلس' || packageType === 'برو بلس (Pro Plus)') {
    serviceId = 'coaching_pro_plus';
  }
  
  window.location.href = `buy-coaching.html?service=${serviceId}`;
};

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
      statTime.setAttribute('data-to', l.statDeliveryTime.replace(/[^0-9]/g, ''));
      const suffix = l.statDeliveryTime.replace(/[0-9]/g, '').trim();
      if (suffix) {
        statTime.setAttribute('data-suffix', ' ' + suffix);
      } else {
        statTime.removeAttribute('data-suffix');
      }
    }

    const statTimeLabel = document.getElementById('cms_statDeliveryLabel');
    if (statTimeLabel && l.statDeliveryLabel) statTimeLabel.textContent = l.statDeliveryLabel;

    const gTitle = document.getElementById('cms_guaranteeTitle');
    if (gTitle && l.guaranteeTitle) gTitle.textContent = l.guaranteeTitle;

    const gSub = document.getElementById('cms_guaranteeSubTitle');
    if (gSub && l.guaranteeSubTitle) gSub.textContent = l.guaranteeSubTitle;

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
