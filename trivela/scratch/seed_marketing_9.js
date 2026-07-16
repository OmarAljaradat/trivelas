const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

db.settings.marketing = {
  exitIntent: {
    active: false,
    title: "لحظة يا بطل! 🎁",
    desc: "كود خصم خاص بانتظارك قبل المغادرة:",
    coupon: "EXIT10",
    timerMinutes: 15
  },
  stickyCta: {
    active: false,
    text: "🔥 عرض خاص: شحن الكوينز بخصم 15%",
    btnText: "اشحن الآن",
    btnLink: "buy-coins.html",
    style: "gold-pulse",
    endTime: ""
  },
  livePulse: {
    active: false,
    minVisits: 5,
    maxVisits: 35,
    showOrders: true,
    position: "bottom-right"
  },
  scratchCard: {
    active: false,
    title: "حك البطاقة واكشف جائزتك الحصرية! 🏆",
    prizeType: "points",
    prizeValue: 50,
    chancePercent: 100,
    delaySeconds: 15
  },
  flashDeals: {
    active: false,
    title: "⚡ عروض البرق الخاطفة",
    subtitle: "كمية محدودة جداً وتوصيل فوري!",
    priceOriginal: 150,
    pricePromo: 99,
    quantityTotal: 5,
    quantitySold: 2,
    durationMinutes: 30,
    btnLink: "buy-coins.html"
  },
  welcomeBack: {
    active: false,
    promoText: "خصم 5% إضافي بانتظارك اليوم كعميل وفيّ!"
  },
  abandonedOrder: {
    active: false,
    promoText: "لسا طلبك بانتظارك! كمل الشحن الآن ونضيف لك 20 نقطة ولاء مجانية."
  },
  postPurchase: {
    active: false,
    bonusPoints: 50,
    couponCode: "NEXT10",
    couponExpiryDays: 7
  },
  trustTicker: {
    active: false,
    speed: "medium",
    position: "home-only"
  }
};

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("Successfully seeded database.json with the new 9 marketing tools defaults!");
