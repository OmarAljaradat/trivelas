const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Common password hash for '12345678'
const commonHash = '5748249510ba96d4fcec15dd202365bf:a33966b49ac46f57d92d9cce57c37b448a193472b4296179f132f486858810467878df825db0576e8bf837238faf0dc2241398eec142f344807a9286e9d278ae';

const realisticUsers = [
  {
    id: "user_101",
    name: "عبد الرحمن العتيبي",
    phone: "+966544981876",
    email: "ahmed.otaibi@example.com",
    password: commonHash,
    points: 1250,
    history: [
      { date: "2026-06-01T12:00:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-06-15T18:30:00.000Z", amount: 200, reason: "نقاط الشراء لطلب كوينز 1 مليون" },
      { date: "2026-07-02T22:15:00.000Z", amount: 1000, reason: "مكافأة ولاء ترقية الفئة الذهبية" }
    ]
  },
  {
    id: "user_102",
    name: "عبد العزيز التميمي",
    phone: "+966503348123",
    email: "aziz.tamimi@example.com",
    password: commonHash,
    points: 2800,
    history: [
      { date: "2026-05-10T14:22:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-05-20T20:10:00.000Z", amount: 750, reason: "شحن نقاط شراء باقة FUT Champions المجمعة" },
      { date: "2026-06-18T11:45:00.000Z", amount: 2000, reason: "بونص الشراء السنوي للنخبة البلاتينية" }
    ]
  },
  {
    id: "user_103",
    name: "خالد الشمري",
    phone: "+966551234567",
    email: "khalid.shammari@example.com",
    password: commonHash,
    points: 450,
    history: [
      { date: "2026-06-10T09:00:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-06-25T15:30:00.000Z", amount: 400, reason: "نقاط إتمام تحديات SBC" }
    ]
  },
  {
    id: "user_104",
    name: "يوسف الكندري",
    phone: "+96599887766",
    email: "yousef.kandari@example.com",
    password: commonHash,
    points: 100,
    history: [
      { date: "2026-07-01T16:00:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-07-05T19:20:00.000Z", amount: 50, reason: "شحن نقاط خدمة Rivals Division 3" }
    ]
  },
  {
    id: "user_105",
    name: "حمد آل ثاني",
    phone: "+97455667788",
    email: "hamad.althani@example.com",
    password: commonHash,
    points: 150,
    history: [
      { date: "2026-05-01T10:00:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-05-15T14:00:00.000Z", amount: 100, reason: "نقاط شحن كوينز 500 ألف" }
    ]
  },
  {
    id: "user_106",
    name: "سلطان المطيري",
    phone: "+966567890123",
    email: "sultan.mutairi@example.com",
    password: commonHash,
    points: 0,
    history: []
  },
  {
    id: "user_107",
    name: "فيصل الحربي",
    phone: "+966541239876",
    email: "faisal.harbi@example.com",
    password: commonHash,
    points: 650,
    history: [
      { date: "2026-06-05T11:00:00.000Z", amount: 50, reason: "هدية الترحيب بنقاط الولاء" },
      { date: "2026-06-20T17:15:00.000Z", amount: 600, reason: "شحن نقاط باقة تدريب مباشر PRO" }
    ]
  },
  {
    id: "user_108",
    name: "سارة الحربي",
    phone: "+966598765432",
    email: "sara.harbi@example.com",
    password: commonHash,
    points: 0,
    history: []
  }
];

const realisticOrders = [
  {
    id: "order_1783850123000",
    timestamp: "2026-07-12T01:30:00.000Z",
    customerName: "عبد الرحمن العتيبي",
    customerPhone: "+966544981876",
    customerEmail: "ahmed.otaibi@example.com",
    service: "شحن كوينز (Comfort Trade) - 1.5 مليون console",
    platform: "Console",
    priceSAR: 157.50,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: null,
    status: "completed",
    amountPaid: 157.50,
    supplierCost: 80.00,
    profit: 77.50,
    paidAt: "2026-07-12T01:35:00.000Z",
    startedAt: "2026-07-12T01:40:00.000Z",
    completedAt: "2026-07-12T02:15:00.000Z"
  },
  {
    id: "order_1783850223000",
    timestamp: "2026-07-12T02:00:00.000Z",
    customerName: "عبد العزيز التميمي",
    customerPhone: "+966503348123",
    customerEmail: "aziz.tamimi@example.com",
    service: "باقة النخبة المجمعة (كوينز + FUT Champions Rank 1)",
    platform: "Console",
    priceSAR: 350.00,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: null,
    status: "completed",
    amountPaid: 350.00,
    supplierCost: 180.00,
    profit: 170.00,
    paidAt: "2026-07-12T02:05:00.000Z",
    startedAt: "2026-07-12T02:10:00.000Z",
    completedAt: "2026-07-12T02:35:00.000Z"
  },
  {
    id: "order_1783850323000",
    timestamp: "2026-07-12T02:15:00.000Z",
    customerName: "خالد الشمري",
    customerPhone: "+966551234567",
    customerEmail: "khalid.shammari@example.com",
    service: "حل تحدي SBC - Marcus Rashford",
    platform: "Console",
    priceSAR: 120.00,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: null,
    status: "completed",
    amountPaid: 120.00,
    supplierCost: 50.00,
    profit: 70.00,
    paidAt: "2026-07-12T02:18:00.000Z",
    startedAt: "2026-07-12T02:22:00.000Z",
    completedAt: "2026-07-12T02:38:00.000Z"
  },
  {
    id: "order_1783850423000",
    timestamp: "2026-07-12T02:20:00.000Z",
    customerName: "يوسف الكندري",
    customerPhone: "+96599887766",
    customerEmail: "yousef.kandari@example.com",
    service: "رفع تصنيف Rivals Division 3 to Division 1",
    platform: "Console",
    priceSAR: 180.00,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: null,
    status: "processing",
    amountPaid: 180.00,
    supplierCost: 90.00,
    profit: 0,
    paidAt: "2026-07-12T02:22:00.000Z",
    startedAt: "2026-07-12T02:25:00.000Z"
  },
  {
    id: "order_1783850523000",
    timestamp: "2026-07-12T02:25:00.000Z",
    customerName: "خالد الشمري",
    customerPhone: "+966551234567",
    customerEmail: "khalid.shammari@example.com",
    service: "شحن كوينز (Comfort Trade) - 500K PC",
    platform: "PC",
    priceSAR: 45.00,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: "TRIVELA",
    status: "pending",
    amountPaid: 0,
    supplierCost: 0,
    profit: 0
  },
  {
    id: "order_1783424100000",
    timestamp: "2026-05-15T14:30:00.000Z",
    customerName: "حمد آل ثاني",
    customerPhone: "+97455667788",
    customerEmail: "hamad.althani@example.com",
    service: "شحن كوينز (Comfort Trade) - 1 مليون console",
    platform: "Console",
    priceSAR: 105.00,
    pointsDiscount: 0,
    pointsDeducted: 0,
    couponCode: null,
    status: "completed",
    amountPaid: 105.00,
    supplierCost: 55.00,
    profit: 50.00,
    paidAt: "2026-05-15T14:35:00.000Z",
    startedAt: "2026-05-15T14:40:00.000Z",
    completedAt: "2026-05-15T15:15:00.000Z"
  }
];

db.users = realisticUsers;
db.orders = realisticOrders;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("Database successfully seeded with realistic Gulf Arab clients and order histories!");
