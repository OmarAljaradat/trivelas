require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Import SQLite database, email service, and PayTabs
const { db: sqliteDb } = require('./db');
const { generateOTP, sendOTP, sendWelcomeEmail } = require('./email');
const { createPaymentPage, verifyTransaction } = require('./paytabs');

const app = express();
const PORT = process.env.PORT || 3500;

const JWT_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRY = '30d';

app.use(express.json());


function mapOrderFromDb(o) {
  if (!o) return null;
  return {
    id: o.id,
    userId: o.user_id || o.userId,
    userName: o.user_name || o.userName || o.customerName,
    userEmail: o.user_email || o.userEmail || o.customerEmail,
    userPhone: o.user_phone || o.userPhone || o.customerPhone,
    customerName: o.user_name || o.userName || o.customerName,
    customerEmail: o.user_email || o.userEmail || o.customerEmail,
    customerPhone: o.user_phone || o.userPhone || o.customerPhone,
    service: o.service,
    platform: o.platform,
    eaEmail: o.ea_email || o.eaEmail,
    amount: o.amount,
    priceSAR: Number(o.price_sar || o.priceSAR || 0),
    priceUSD: Number(o.price_usd || o.priceUSD || 0),
    status: o.status || 'pending',
    whatsappPhone: o.whatsapp_phone || o.whatsappPhone,
    notes: o.notes,
    adminNotes: o.admin_notes || o.adminNotes,
    orderNotes: o.order_notes || o.orderNotes,
    paymentMethod: o.payment_method || o.paymentMethod || 'whatsapp',
    couponCode: o.coupon_code || o.couponCode,
    couponDiscount: Number(o.coupon_discount || o.couponDiscount || 0),
    pointsUsed: Number(o.points_used || o.pointsUsed || 0),
    pointsDiscount: Number(o.points_discount || o.pointsDiscount || 0),
    supplierId: o.supplier_id || o.supplierId,
    supplierName: o.supplier_name || o.supplierName,
    assignedAt: o.assigned_at || o.assignedAt,
    completedAt: o.completed_at || o.completedAt,
    createdAt: o.created_at || o.createdAt,
    updatedAt: o.updated_at || o.updatedAt
  };
}

// ==========================================
// LEGACY COMPAT — readDatabase / writeDatabase shim
// These functions provide backward-compatible read/write
// to the old JSON structure for any code that still uses it.
// All new code should use SQLite prepared statements directly.
// ==========================================

async function readDatabase() {
  try {
    const [usersRaw, ordersRaw, settingsRows, reviewsRaw, faqsRaw, logsRaw, couponsRaw, analyticsRows, playersRaw] = await Promise.all([
      await sqliteDb.prepare('SELECT * FROM users').all(),
      await sqliteDb.prepare('SELECT * FROM orders ORDER BY created_at DESC').all(),
      await sqliteDb.prepare('SELECT key, value FROM settings').all(),
      await sqliteDb.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all(),
      await sqliteDb.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all(),
      await sqliteDb.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200').all(),
      await sqliteDb.prepare('SELECT * FROM coupons').all(),
      await sqliteDb.prepare('SELECT * FROM analytics').all(),
      sqliteDb.prepare('SELECT * FROM players ORDER BY created_at DESC').all().catch(() => [])
    ]);

    const users = usersRaw.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: u.password,
      isAdmin: u.is_admin === 1,
      isVerified: u.is_verified === 1,
      points: u.points || 0,
      referredBy: u.referred_by,
      defaultPlatform: u.default_platform,
      defaultCurrency: u.default_currency,
      savedEA: {
        platform: u.default_platform || 'PlayStation 5',
        email: u.ea_email || '',
        backupCodes: u.ea_backup_codes || ''
      },
      history: [],
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    const orders = ordersRaw.map(mapOrderFromDb);

    const settings = {};
    for (const row of settingsRows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    if (!settings.whatsappPhone) settings.whatsappPhone = '962775585112';
    if (!settings.instagramUrl) settings.instagramUrl = 'https://instagram.com/Trivela';
    if (settings.maintenanceMode === undefined) settings.maintenanceMode = false;
    if (!settings.baseRateConsole) settings.baseRateConsole = 2.80;
    if (!settings.baseRatePC) settings.baseRatePC = 2.40;
    if (!settings.pointsDiscountRate) settings.pointsDiscountRate = 37.5;
    if (!settings.discounts) settings.discounts = [
      { minCoins: 10000000, percent: 20 },
      { minCoins: 5000000, percent: 10 },
      { minCoins: 1000000, percent: 0 },
      { minCoins: 500000, percent: -5 },
      { minCoins: 100000, percent: -10 }
    ];
    if (!settings.content) {
      settings.content = {
        landing: {
          heroTitle: "الأسرع لبناء تشكيلة الأحلام",
          heroSubTitle: "متجر تريفيلا لشحن كوينز فيفا 27 وإنجاز المهام بأمان وسرعة فائقة",
          statOrdersCount: "1,500+",
          statOrdersLabel: "عميل موثق",
          statDeliveryTime: "60 دقيقة",
          statDeliveryLabel: "متوسط سرعة التوصيل",
          statSecurityLabel: "أمان وحماية 100%",
          guaranteeBadge: "استشارات فنية",
        }
      };
    }

    const reviews = reviewsRaw.map(r => ({
      id: r.id,
      name: r.user_name,
      platform: '',
      stars: r.rating,
      text: r.comment,
      badge: '',
      status: r.visible === 1 ? 'approved' : 'pending',
      orderId: r.order_id
    }));

    const faqs = faqsRaw.map(f => ({
      id: f.id,
      q: f.question,
      a: f.answer,
      question: f.question,
      answer: f.answer,
      sortOrder: f.sort_order
    }));

    const logs = logsRaw.map(l => ({
      id: l.id,
      action: l.action,
      details: l.details,
      admin: l.admin,
      ip: l.ip,
      timestamp: l.created_at
    }));

    const coupons = couponsRaw.map(c => ({
      code: c.code,
      percent: c.discount_percent,
      maxUses: c.max_uses,
      usedCount: c.used_count,
      expiryDate: c.created_at
    }));

    const daily = {};
    let totalVisits = 0;
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    for (const a of analyticsRows) {
      daily[a.date] = a.total_visits;
      totalVisits += a.total_visits;
      devices.mobile += a.mobile || 0;
      devices.desktop += a.desktop || 0;
      devices.tablet += a.tablet || 0;
    }

    const analyticsObj = {
      totalVisits,
      daily,
      devices,
      referrers: settings._analytics_referrers || { direct: 0, google: 0, tiktok: 0, snapchat: 0, instagram: 0, twitter: 0, whatsapp: 0, other: 0 },
      countries: settings._analytics_countries || { sa: 0, ae: 0, kw: 0, qa: 0, bh: 0, om: 0, eg: 0, jo: 0, other: 0 },
      hours: settings._analytics_hours || {},
      pages: settings._analytics_pages || { home: 0, coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 },
      visitorTypes: settings._analytics_visitorTypes || { new: 0, returning: 0 },
      clicks: settings._analytics_clicks || { coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 }
    };

    const players = playersRaw.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sbcSubCategory: p.sbc_sub_category,
      rating: p.rating,
      image: p.image,
      priceSAR: p.price_sar,
      priceUSD: p.price_usd,
      pricePCSAR: p.price_pc_sar,
      pricePCUSD: p.price_pc_usd,
      desc: p.desc,
      version: p.version,
      position: p.position,
      expiryDays: p.expiry_days,
      expirationDate: p.expiration_date
    }));

    const emailCampaigns = settings._emailCampaigns || [];
    const expenses = settings._expenses || [];
    const champions_ranks = settings.champions_ranks || settings._champions_ranks;
    const rivals_ranks = settings.rivals_ranks || settings._rivals_ranks;

    return {
      users,
      orders,
      settings,
      content: settings.content,
      reviews,
      faqs,
      logs,
      coupons,
      analytics: analyticsObj,
      players,
      emailCampaigns,
      expenses,
      champions_ranks,
      rivals_ranks
    };
  } catch (err) {
    console.error('readDatabase error:', err);
    return {
      users: [], orders: [], settings: {}, content: {}, reviews: [], faqs: [], logs: [], coupons: [], analytics: {}, players: [], emailCampaigns: [], expenses: []
    };
  }
}

async function getPointsHistory(userId) {
  try {
    const rows = await sqliteDb.prepare('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return rows.map(r => ({
      amount: r.amount,
      reason: r.reason,
      date: r.created_at
    }));
  } catch (err) {
    return [];
  }
}

async function saveSetting(key, value) {
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await sqliteDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serialized);
}

async function getSetting(key, defaultValue) {
  const row = await sqliteDb.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return defaultValue;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

// Legacy writeDatabase — save complex objects back to settings KV store
async function writeDatabase(data) {
  try {
    if (data.analytics) {
      if (data.analytics.referrers) await saveSetting('_analytics_referrers', data.analytics.referrers);
      if (data.analytics.countries) await saveSetting('_analytics_countries', data.analytics.countries);
      if (data.analytics.hours) await saveSetting('_analytics_hours', data.analytics.hours);
      if (data.analytics.pages) await saveSetting('_analytics_pages', data.analytics.pages);
      if (data.analytics.visitorTypes) await saveSetting('_analytics_visitorTypes', data.analytics.visitorTypes);
      if (data.analytics.clicks) await saveSetting('_analytics_clicks', data.analytics.clicks);
    }
    if (data.emailCampaigns) await saveSetting('_emailCampaigns', data.emailCampaigns);
    if (data.expenses) await saveSetting('_expenses', data.expenses);
    return true;
  } catch (err) {
    console.error('writeDatabase error:', err);
    return false;
  }
}

// ==========================================
// MIDDLEWARE
// ==========================================

// 1. Maintenance Mode Middleware
app.use(async (req, res, next) => {
  const maintenanceMode = await getSetting('maintenanceMode', false);
  const bypassToken = await getSetting('maintenanceBypassToken', null);
  
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

  if (req.query.bypass && req.query.bypass === bypassToken) {
    res.setHeader('Set-Cookie', `bypass_maintenance=${bypassToken}; Path=/; Max-Age=86400`);
  }

  const isAdminRequest = req.url.startsWith('/admin') || req.url.startsWith('/api/admin') || req.url.includes('admin.js') || req.url.includes('logo-official.png');
  const isApiAuthRequest = req.url.startsWith('/api/auth');
  const isAssetsRequest = req.url.includes('style.css') || req.url.includes('theme_concept') || req.url.includes('trivela_logo') || req.url.includes('logo-official');
  const isPublicContent = req.url.startsWith('/api/public/content');

  if (maintenanceMode && !isBypassed && !isAdminRequest && !isApiAuthRequest && !isAssetsRequest && !isPublicContent && req.url !== '/maintenance.html') {
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
app.use(async (req, res, next) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.endsWith('.html') || (req.url.startsWith('/') && !req.url.includes('.')))) {
    const todayStr = new Date().toISOString().split('T')[0];
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    let device = 'desktop';
    if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
      device = 'tablet';
    } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      device = 'mobile';
    }

    // Upsert analytics for today
    const existing = await sqliteDb.prepare('SELECT * FROM analytics WHERE date = ?').get(todayStr);
    if (existing) {
      await sqliteDb.prepare(`UPDATE analytics SET total_visits = total_visits + 1, ${device} = ${device} + 1 WHERE date = ?`).run(todayStr);
    } else {
      const init = { total_visits: 1, mobile: 0, desktop: 0, tablet: 0 };
      init[device] = 1;
      await sqliteDb.prepare('INSERT INTO analytics (date, total_visits, mobile, desktop, tablet) VALUES (?, ?, ?, ?, ?)').run(todayStr, init.total_visits, init.mobile, init.desktop, init.tablet);
    }
  }
  next();
});

// 3. Inject FIFA cinematic background CSS/JS into all public HTML pages
app.use(async (req, res, next) => {
  const isHtmlPath = req.method === 'GET' && (
    req.url === '/' ||
    /^\/[a-zA-Z0-9_-]+\.html(\?.*)?$/.test(req.url) ||
    (!req.url.includes('.') && !req.url.startsWith('/api'))
  );
  if (!isHtmlPath) return next();

  const lowered = req.url.toLowerCase();
  if (lowered.includes('admin') || lowered.includes('maintenance')) return next();

  let cleanPath = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\/+/, '');
  if (!cleanPath.includes('.') && !cleanPath.endsWith('.html')) cleanPath += '.html';
  const abs = path.join(__dirname, cleanPath);
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

// Direct fallback route for root and common HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:page.html', (req, res, next) => {
  const p = path.join(__dirname, req.params.page + '.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  next();
});

// ==========================================
// PASSWORD HELPERS
// ==========================================
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

// ==========================================
// JWT AUTH MIDDLEWARE
// ==========================================
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    // Try JWT first
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(403).json({ error: "Invalid token or user not found." });
    
    req.user = {
      ...user,
      isAdmin: user.is_admin === 1,
      isVerified: user.is_verified === 1
    };
    next();
  } catch (jwtErr) {
    // Fallback: try legacy Base64 token for backward compatibility
    try {
      const userId = Buffer.from(token, 'base64').toString('ascii');
      const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return res.status(403).json({ error: "Invalid token or user not found." });
      
      req.user = {
        ...user,
        isAdmin: user.is_admin === 1,
        isVerified: user.is_verified === 1
      };
      next();
    } catch (legacyErr) {
      res.status(400).json({ error: "Invalid token." });
    }
  }
}

// ==========================================
// ADMIN AUTH
// ==========================================
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@trivela.local').toLowerCase();

async function ensureAdminBootstrapped() {
  // Ensure admin exists
  const existing = await sqliteDb.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(ADMIN_EMAIL);
  if (!existing) {
    const defaultPass = process.env.ADMIN_PASSWORD || 'Trivela@Admin2026';
    const adminId = 'admin_' + Date.now();
    await sqliteDb.prepare(`
      INSERT INTO users (id, name, email, phone, password, is_verified, is_admin, points, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, 0, datetime('now'), datetime('now'))
    `).run(adminId, 'Trivela Admin', ADMIN_EMAIL, process.env.ADMIN_PHONE || '966500000001', hashPassword(defaultPass));
    
    await sqliteDb.prepare('INSERT INTO points_history (user_id, amount, reason) VALUES (?, 0, ?)').run(adminId, 'حساب المشرف تم إنشاؤه تلقائياً');
    console.log(`[SECURITY] Bootstrapped admin user: ${ADMIN_EMAIL}`);
  } else {
    // Ensure admin flag is set
    await sqliteDb.prepare('UPDATE users SET is_admin = 1 WHERE LOWER(email) = ?').run(ADMIN_EMAIL);
  }
}

async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "غير مصرح: يجب تسجيل الدخول كمشرف" });
  
  try {
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch {
      userId = Buffer.from(token, 'base64').toString('ascii');
    }
    
    const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: "غير مصرح: هذا الحساب ليس لديه صلاحيات المشرف" });
    }
    req.user = { ...user, isAdmin: true };
    next();
  } catch (e) {
    return res.status(400).json({ error: "توكن غير صالح" });
  }
}

// Simple in-memory brute-force guard
const _loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const WINDOW_MS = 10 * 60 * 1000;
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

// OTP rate limiter
const _otpAttempts = new Map();
function otpRateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  const MAX_ATTEMPTS = 3;
  const rec = _otpAttempts.get(ip);
  if (rec && now - rec.firstAt < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "طلبات كثيرة. الرجاء الانتظار دقيقتين قبل المحاولة مجدداً." });
  }
  if (!rec || now - rec.firstAt >= WINDOW_MS) {
    _otpAttempts.set(ip, { count: 1, firstAt: now });
  } else {
    rec.count += 1;
  }
  next();
}

// Apply admin guard to ALL /api/admin/* endpoints
app.use('/api/admin', requireAdmin);

// Safe user projection
function safeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isAdmin: u.isAdmin || u.is_admin === 1,
    isVerified: u.isVerified || u.is_verified === 1,
    points: u.points || 0,
    referredBy: u.referredBy || u.referred_by,
    defaultPlatform: u.defaultPlatform || u.default_platform,
    defaultCurrency: u.defaultCurrency || u.default_currency,
    savedEA: u.savedEA || {
      platform: u.default_platform || 'PlayStation 5',
      email: u.ea_email || '',
      backupCodes: u.ea_backup_codes || ''
    },
    history: u.history || getPointsHistory(u.id),
    createdAt: u.createdAt || u.created_at,
    updatedAt: u.updatedAt || u.updated_at
  };
}

// Bootstrap admin at startup
ensureAdminBootstrapped().catch(console.error);

// Admin log helper
async function addAdminLog(action, details, extra) {
  try {
    await sqliteDb.prepare('INSERT INTO logs (action, details, admin, ip) VALUES (?, ?, ?, ?)').run(
      action,
      typeof details === 'object' ? JSON.stringify(details) : details,
      extra && extra.admin ? extra.admin : null,
      extra && extra.ip ? extra.ip : null
    );
  } catch (err) {
    console.error('Error adding log:', err);
  }
}

// Automatically filter out and delete expired players
async function cleanupExpiredPlayers() {
  try {
    const nowIso = new Date().toISOString();
    await sqliteDb.prepare('DELETE FROM players WHERE expiration_date IS NOT NULL AND expiration_date < ?').run(nowIso);
  } catch (err) {
    console.error('Error cleaning up expired players:', err);
  }
  return (await readDatabase()).players;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, referralCode } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 خانات على الأقل" });
  }

  // Check unique constraints
  const existingUser = await sqliteDb.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
  if (existingUser) {
    return res.status(400).json({ error: "الإيميل أو رقم الهاتف مسجل بالفعل" });
  }

  let referredBy = null;
  if (referralCode) {
    const cleanRef = referralCode.replace(/[\s\+\-]/g, '').trim();
    const referrer = await sqliteDb.prepare("SELECT phone FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') = ? OR id = ?").get(cleanRef, cleanRef);
    if (referrer) {
      referredBy = referrer.phone;
    }
  }

  const userId = Date.now().toString();
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL ? 1 : 0;

  await sqliteDb.prepare(`
    INSERT INTO users (id, name, email, phone, password, is_verified, is_admin, points, referred_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, datetime('now'), datetime('now'))
  `).run(userId, name, email, phone, hashPassword(password), isAdmin, referredBy);

  // Add initial points history
  await sqliteDb.prepare('INSERT INTO points_history (user_id, amount, reason) VALUES (?, 0, ?)').run(userId, 'إنشاء الحساب بنجاح');

  // Generate and send OTP
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
  await sqliteDb.prepare('INSERT INTO otp_codes (user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)').run(userId, email, otpCode, 'verify', expiresAt);

  // Send OTP email (async, don't block response)
  sendOTP(email, otpCode, 'verify').catch(err => console.error('Failed to send OTP:', err));

  // Mask email for privacy
  const parts = email.split('@');
  const maskedEmail = parts[0].substring(0, 2) + '***@' + parts[1];

  res.json({
    success: true,
    needsVerification: true,
    email: maskedEmail,
    userId: userId,
    message: "تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني وإدخال رمز التحقق."
  });
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, code, userId } = req.body;
  if (!code || (!email && !userId)) {
    return res.status(400).json({ error: "يرجى إدخال رمز التحقق" });
  }

  // Find latest unused OTP for this user
  let otp;
  if (userId) {
    otp = await sqliteDb.prepare("SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND type = 'verify' ORDER BY created_at DESC LIMIT 1").get(userId, code);
  } else {
    otp = await sqliteDb.prepare("SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND type = 'verify' ORDER BY created_at DESC LIMIT 1").get(email, code);
  }

  if (!otp) {
    return res.status(400).json({ error: "رمز التحقق غير صحيح" });
  }

  // Check expiry
  if (new Date(otp.expires_at) < new Date()) {
    return res.status(400).json({ error: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد." });
  }

  // Mark OTP as used
  await sqliteDb.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);

  // Verify the user
  await sqliteDb.prepare('UPDATE users SET is_verified = 1, updated_at = datetime(?) WHERE id = ?').run(new Date().toISOString(), otp.user_id);

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(otp.user_id);
  const token = generateToken(user.id);

  // Send welcome email
  sendWelcomeEmail(user.email, user.name).catch(err => console.error('Failed to send welcome email:', err));

  res.json({ success: true, token, user: safeUser(user) });
});

// Resend OTP
app.post('/api/auth/resend-otp', otpRateLimit, async (req, res) => {
  const { email, userId } = req.body;
  
  let user;
  if (userId) {
    user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else if (email) {
    user = await sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  if (!user) {
    return res.status(404).json({ error: "الحساب غير موجود" });
  }

  if (user.is_verified === 1) {
    return res.status(400).json({ error: "الحساب مفعّل بالفعل" });
  }

  // Invalidate previous OTPs
  await sqliteDb.prepare("UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'verify' AND used = 0").run(user.id);

  // Generate new OTP
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await sqliteDb.prepare('INSERT INTO otp_codes (user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)').run(user.id, user.email, otpCode, 'verify', expiresAt);

  const result = await sendOTP(user.email, otpCode, 'verify');
  
  if (result.success) {
    res.json({ success: true, message: "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني" });
  } else {
    res.status(500).json({ error: "حدث خطأ أثناء إرسال الرمز. حاول مرة أخرى." });
  }
});

// Login User
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { loginField, password } = req.body;
  if (!loginField || !password) {
    return res.status(400).json({ error: "يرجى إدخال الحقول المطلوبة" });
  }

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(loginField, loginField);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(400).json({ error: "البيانات المدخلة غير صحيحة" });
  }

  // Check if verified
  if (user.is_verified !== 1) {
    // Resend OTP automatically
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sqliteDb.prepare("UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'verify' AND used = 0").run(user.id);
    await sqliteDb.prepare('INSERT INTO otp_codes (user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)').run(user.id, user.email, otpCode, 'verify', expiresAt);
    sendOTP(user.email, otpCode, 'verify').catch(err => console.error('Failed to send OTP:', err));

    const parts = user.email.split('@');
    const maskedEmail = parts[0].substring(0, 2) + '***@' + parts[1];

    return res.json({
      success: true,
      needsVerification: true,
      email: maskedEmail,
      userId: user.id,
      message: "حسابك غير مفعّل. تم إرسال رمز تحقق جديد لبريدك الإلكتروني."
    });
  }

  const token = generateToken(user.id);
  res.json({ success: true, token, user: safeUser(user) });
});

// Get Current User info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json(safeUser(req.user));
});

// Forgot Password — send OTP
app.post('/api/auth/forgot-password', otpRateLimit, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني" });

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Don't reveal if email exists — return success anyway
    return res.json({ success: true, message: "إذا كان البريد مسجلاً، ستصلك رسالة بكود التحقق." });
  }

  // Invalidate old reset OTPs
  await sqliteDb.prepare("UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'reset' AND used = 0").run(user.id);

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await sqliteDb.prepare('INSERT INTO otp_codes (user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)').run(user.id, user.email, otpCode, 'reset', expiresAt);

  await sendOTP(user.email, otpCode, 'reset');

  res.json({ success: true, message: "إذا كان البريد مسجلاً، ستصلك رسالة بكود التحقق." });
});

// Reset Password — verify OTP + set new password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 خانات على الأقل" });
  }

  const otp = await sqliteDb.prepare("SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND type = 'reset' ORDER BY created_at DESC LIMIT 1").get(email, code);
  if (!otp) {
    return res.status(400).json({ error: "رمز التحقق غير صحيح" });
  }

  if (new Date(otp.expires_at) < new Date()) {
    return res.status(400).json({ error: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد." });
  }

  // Mark OTP as used
  await sqliteDb.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);

  // Update password
  await sqliteDb.prepare("UPDATE users SET password = ?, is_verified = 1, updated_at = datetime('now') WHERE id = ?").run(hashPassword(newPassword), otp.user_id);

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(otp.user_id);
  const token = generateToken(user.id);

  res.json({ success: true, token, user: safeUser(user), message: "تم تغيير كلمة المرور بنجاح!" });
});

// Get Current User Orders
app.get('/api/user/orders', authenticateToken, async (req, res) => {
  const user = req.user;
  const userPhoneClean = (user.phone || '').replace(/[\s\+\-]/g, '');
  const userEmail = (user.email || '').toLowerCase().trim();

  const db = await readDatabase();
  const orders = (db.orders || []).filter(o => {
    const oPhoneClean = (o.customerPhone || '').replace(/[\s\+\-]/g, '');
    const oEmail = (o.customerEmail || '').toLowerCase().trim();
    return (userPhoneClean && oPhoneClean === userPhoneClean) ||
           (userEmail && oEmail === userEmail) ||
           (o.userId && o.userId === user.id);
  }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  res.json({ success: true, orders });
});

// Update User Profile / Password
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

  if (name) await sqliteDb.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), userId);
  if (phone) await sqliteDb.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone.trim(), userId);

  if (newPassword) {
    if (!currentPassword || !verifyPassword(currentPassword, user.password)) {
      return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل" });
    }
    await sqliteDb.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), userId);
  }

  await sqliteDb.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(userId);

  const updatedUser = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ success: true, user: safeUser(updatedUser) });
});

// Update Saved EA Account & Platform Preferences
app.put('/api/user/ea-profile', authenticateToken, async (req, res) => {
  const { defaultPlatform, eaEmail, backupCodes, defaultCurrency } = req.body;
  const userId = req.user.id;

  if (defaultPlatform !== undefined) await sqliteDb.prepare('UPDATE users SET default_platform = ? WHERE id = ?').run(defaultPlatform, userId);
  if (eaEmail !== undefined) await sqliteDb.prepare('UPDATE users SET ea_email = ? WHERE id = ?').run((eaEmail || '').trim(), userId);
  if (backupCodes !== undefined) await sqliteDb.prepare('UPDATE users SET ea_backup_codes = ? WHERE id = ?').run(backupCodes, userId);
  if (defaultCurrency !== undefined) await sqliteDb.prepare('UPDATE users SET default_currency = ? WHERE id = ?').run(defaultCurrency, userId);

  await sqliteDb.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(userId);

  const updatedUser = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ success: true, user: safeUser(updatedUser) });
});

// ==========================================
// ADMIN USER POINTS MANAGEMENT ROUTES
// ==========================================

// Get stats for admin dashboard
app.get('/api/admin/stats', async (req, res) => {
  const db = await readDatabase();
  const totalUsers = db.users.length;
  const totalChallenges = db.players.length;
  const totalPoints = db.users.reduce((sum, u) => sum + (u.points || 0), 0);
  
  let totalVisits = db.analytics ? db.analytics.totalVisits : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const visitsToday = db.analytics && db.analytics.daily ? (db.analytics.daily[todayStr] || 0) : 0;
  
  const { days, startDate, endDate } = req.query;
  let orders = db.orders || [];
  
  if (startDate || endDate) {
    totalVisits = 0;
    if (db.analytics && db.analytics.daily) {
      Object.entries(db.analytics.daily).forEach(([dateStr, count]) => {
        let matches = true;
        if (startDate && dateStr < startDate) matches = false;
        if (endDate && dateStr > endDate) matches = false;
        if (matches) totalVisits += count;
      });
    }
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
          if (allowedDates.has(dateStr)) totalVisits += count;
        });
      }
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
app.post('/api/admin/reset', async (req, res) => {
  const { type, password } = req.body;
  
  if (type === 'visits') {
    await sqliteDb.prepare('DELETE FROM analytics').run();
    await addAdminLog("RESET_VISITS", "إعادة تعيين إحصائيات زيارات المتجر إلى الصفر");
  } else if (type === 'orders') {
    await sqliteDb.prepare('DELETE FROM orders').run();
    await addAdminLog("RESET_ORDERS", "إعادة تعيين وحذف كافة طلبات المتجر");
  } else if (type === 'logs') {
    await sqliteDb.prepare('DELETE FROM logs').run();
    await addAdminLog("RESET_LOGS", "إعادة تعيين وإفراغ سجل العمليات");
  } else if (type === 'all') {
    await sqliteDb.prepare('DELETE FROM analytics').run();
    await sqliteDb.prepare('DELETE FROM orders').run();
    await sqliteDb.prepare('DELETE FROM logs').run();
    await addAdminLog("RESET_ALL", "إعادة تعيين شاملة للمتجر");
  } else if (type === 'system_factory_reset') {
    if (password !== 'Trivela@Reset2026') {
      return res.status(401).json({ success: false, error: "كلمة مرور إعادة ضبط المصنع غير صحيحة!" });
    }
    await sqliteDb.prepare('DELETE FROM analytics').run();
    await sqliteDb.prepare('DELETE FROM orders').run();
    await sqliteDb.prepare('DELETE FROM logs').run();
    await sqliteDb.prepare('DELETE FROM coupons').run();
    await sqliteDb.prepare('DELETE FROM users WHERE is_admin = 0').run();
    fs.writeFileSync(path.join(__dirname, 'players.json'), '[]', 'utf8');
    await saveSetting('_expenses', []);
    
    // Re-add default coupon
    await sqliteDb.prepare("INSERT INTO coupons (id, code, discount_percent, max_uses, used_count, active) VALUES (?, ?, ?, ?, ?, 1)").run(
      'cpn_' + Date.now(), 'TRIVELA', 10, 100, 0
    );
    
    await addAdminLog("SYSTEM_FACTORY_RESET", "إعادة ضبط المصنع بالكامل");
  } else {
    return res.status(400).json({ success: false, error: "نوع غير معروف لإعادة التعيين" });
  }
  
  res.json({ success: true });
});

// Get all users for admin dashboard
app.get('/api/admin/users', async (req, res) => {
  const db = await readDatabase();
  const cleanUsers = db.users.map(u => safeUser(u));
  res.json(cleanUsers);
});

// Modify points for a user
app.post('/api/admin/users/:id/points', async (req, res) => {
  const userId = req.params.id;
  const { points, reason } = req.body;

  if (points === undefined || isNaN(points)) {
    return res.status(400).json({ error: "يرجى إدخال عدد نقاط صحيح" });
  }

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: "العميل غير موجود" });

  const pointsChange = parseInt(points, 10);
  const newPoints = Math.max(0, (user.points || 0) + pointsChange);
  
  await sqliteDb.prepare('UPDATE users SET points = ? WHERE id = ?').run(newPoints, userId);
  await sqliteDb.prepare('INSERT INTO points_history (user_id, amount, reason) VALUES (?, ?, ?)').run(
    userId, pointsChange, reason || (pointsChange >= 0 ? "شحن نقاط من المشرف" : "خصم نقاط من المشرف")
  );

  const actionType = pointsChange >= 0 ? 'ADD_POINTS' : 'DEDUCT_POINTS';
  const pointsText = pointsChange >= 0 ? `شحن ${pointsChange} نقطة` : `خصم ${Math.abs(pointsChange)} نقطة`;
  await addAdminLog(actionType, `تم ${pointsText} للعميل "${user.name}" (${user.phone}). السبب: "${reason || 'بدون سبب'}"`, { userId, pointsChange, reason });

  const updatedUser = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ success: true, user: safeUser(updatedUser) });
});

// Reset password for a user by admin
app.post('/api/admin/users/:id/reset-password', async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل" });
  }

  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: "العميل غير موجود" });

  await sqliteDb.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword.trim()), userId);
  await addAdminLog('RESET_USER_PASSWORD', `تم تعيين كلمة مرور جديدة للعميل "${user.name}" (${user.phone}) من قبل المشرف`, { userId });

  res.json({ success: true, message: "تم تعيين كلمة المرور الجديدة بنجاح" });
});

// ==========================================
// PLAYER SHOP CARD ROUTES
// ==========================================

// GET all players
app.get('/api/players', async (req, res) => {
  const activePlayers = await cleanupExpiredPlayers();
  res.json(activePlayers);
});

// POST add a player
app.post(['/api/players', '/api/admin/players'], async (req, res) => {
  const newPlayer = req.body;
  if (!newPlayer || !newPlayer.id || !newPlayer.name) {
    return res.status(400).json({ error: "Invalid player data" });
  }

  try {
    await sqliteDb.prepare(`
      INSERT OR REPLACE INTO players (id, name, category, sbc_sub_category, rating, image, price_sar, price_usd, price_pc_sar, price_pc_usd, desc, version, position, expiry_days, expiration_date)
      VALUES (@id, @name, @category, @sbcSubCategory, @rating, @image, @priceSAR, @priceUSD, @pricePCSAR, @pricePCUSD, @desc, @version, @position, @expiryDays, @expirationDate)
    `).run({
      id: newPlayer.id,
      name: newPlayer.name,
      category: newPlayer.category || 'sbc',
      sbcSubCategory: newPlayer.sbcSubCategory || null,
      rating: newPlayer.rating || 0,
      image: newPlayer.image || 'service_sbc.jpg',
      priceSAR: newPlayer.priceSAR || 0,
      priceUSD: newPlayer.priceUSD || 0,
      pricePCSAR: newPlayer.pricePCSAR || newPlayer.priceSAR || 0,
      pricePCUSD: newPlayer.pricePCUSD || newPlayer.priceUSD || 0,
      desc: newPlayer.desc || null,
      version: newPlayer.version || null,
      position: newPlayer.position || null,
      expiryDays: newPlayer.expiryDays || 7,
      expirationDate: newPlayer.expirationDate || null
    });

    await addAdminLog('ADD_PLAYER', `تم إضافة/تحديث كارت اللاعب "${newPlayer.name}" (${(newPlayer.category || 'sbc').toUpperCase()}) بسعر ${newPlayer.priceSAR} ر.س`, { playerId: newPlayer.id, name: newPlayer.name, category: newPlayer.category, priceSAR: newPlayer.priceSAR });
    
    const db = await readDatabase();
    res.json({ success: true, players: db.players });
  } catch (err) {
    console.error('Error saving player:', err);
    res.status(500).json({ error: "Failed to save player" });
  }
});

// DELETE a player
app.delete(['/api/players/:id', '/api/admin/players/:id'], async (req, res) => {
  const playerId = req.params.id;
  const category = req.query.category;

  try {
    if (category) {
      await sqliteDb.prepare('DELETE FROM players WHERE id = ? AND category = ?').run(playerId, category);
    } else {
      await sqliteDb.prepare('DELETE FROM players WHERE id = ?').run(playerId);
    }

    await addAdminLog('DELETE_PLAYER', `تم حذف كارت اللاعب "${playerId}" من تصنيف "${category || 'الكل'}"`, { playerId, category });
    
    const db = await readDatabase();
    res.json({ success: true, players: db.players });
  } catch (err) {
    console.error('Error deleting player:', err);
    res.status(500).json({ error: "Failed to delete player" });
  }
});

// GET scrape FUT.GG player data
app.post(['/api/scrape', '/api/admin/scrape'], async (req, res) => {
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
          "futgg-player-item-card", "player-item", "sbc-reward", "pack-reward",
          "packs", "items", "sbc", "evolutions", "objectives", "objective",
          "challenges", "challenge", "rewards", "pack", "token", "tokens", "sbcs"
        ];
        
        for (const keyword of priorities) {
          const found = imgMatches.find(u => u.toLowerCase().includes(keyword));
          if (found) { image = found; break; }
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

        if (category === 'objectives' || url.toLowerCase().includes('/objectives/')) {
          rating = 0; position = "OBJ"; version = "مهمة Objectives";
          expiryDays = 14; priceSAR = 56; priceUSD = 15;
        } else if (category === 'sbc' && sbcSubCategory === 'upgrades') {
          rating = 0; position = "UPG"; version = "ترقية SBC";
          expiryDays = 7; priceSAR = 38; priceUSD = 10;
        } else {
          rating = 90; position = "SBC"; version = "لاعب تحدي";
          expiryDays = 14; priceSAR = 105; priceUSD = 28;

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
            id, name, image, rating, version, position, sbcSubCategory, category,
            expiryDays, priceSAR, priceUSD, pricePCSAR: priceSAR, pricePCUSD: priceUSD
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

// GET public content
app.get('/api/public/content', async (req, res) => {
  const db = await readDatabase();
  const approvedReviews = (db.reviews || []).filter(r => r.status === 'approved');
  res.json({
    settings: db.settings,
    faqs: db.faqs || [],
    reviews: approvedReviews,
    champions_ranks: db.champions_ranks,
    rivals_ranks: db.rivals_ranks
  });
});

app.get('/api/public/coaching-schedule', async (req, res) => {
  const schedule = await getSetting('coachingSchedule', {
    workingDays: [0, 1, 2, 3, 4, 5, 6],
    startHour: 14,
    endHour: 23,
    slotDurationMinutes: 60,
    bookedSlots: []
  });
  res.json(schedule);
});

// POST public review submission
app.post('/api/public/reviews', async (req, res) => {
  const { name, platform, stars, text } = req.body;
  if (!name || !text) {
    return res.status(400).json({ error: "الرجاء إدخال اسمك وتجربتك للتقييم" });
  }

  const revId = 'rev_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900);
  await sqliteDb.prepare('INSERT INTO reviews (id, user_name, rating, comment, visible) VALUES (?, ?, ?, ?, 0)').run(
    revId, name.trim(), parseInt(stars, 10) || 5, text.trim()
  );

  res.json({ success: true, review: { id: revId, name: name.trim(), platform: platform || "PS5", stars: parseInt(stars, 10) || 5, text: text.trim(), badge: "", status: "pending" } });
});

// POST public analytics page load ping
app.post('/api/public/analytics-ping', async (req, res) => {
  const { type, referrer, page } = req.body;
  const db = await readDatabase();
  
  if (!db.analytics) db.analytics = {};
  if (!db.analytics.devices) db.analytics.devices = { mobile: 0, desktop: 0, tablet: 0 };
  if (!db.analytics.referrers) db.analytics.referrers = { direct: 0, google: 0, tiktok: 0, snapchat: 0, instagram: 0, twitter: 0, whatsapp: 0, other: 0 };
  if (!db.analytics.countries) db.analytics.countries = { sa: 0, ae: 0, kw: 0, qa: 0, bh: 0, om: 0, eg: 0, jo: 0, other: 0 };
  if (!db.analytics.hours) db.analytics.hours = {};
  if (!db.analytics.pages) db.analytics.pages = { home: 0, coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };
  if (!db.analytics.visitorTypes) db.analytics.visitorTypes = { new: 0, returning: 0 };

  // Devices
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  let device = 'desktop';
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) device = 'tablet';
  else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) device = 'mobile';
  db.analytics.devices[device] = (db.analytics.devices[device] || 0) + 1;

  // Referrers
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

  // Countries
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

  // Hours
  const hour = new Date().getHours();
  db.analytics.hours[hour] = (db.analytics.hours[hour] || 0) + 1;

  // Pages
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

  // Visitor Type
  const vtKey = type === 'returning' ? 'returning' : 'new';
  db.analytics.visitorTypes[vtKey] = (db.analytics.visitorTypes[vtKey] || 0) + 1;

  // General Count (daily analytics table)
  const todayStr = new Date().toISOString().split('T')[0];
  const existing = await sqliteDb.prepare('SELECT * FROM analytics WHERE date = ?').get(todayStr);
  if (existing) {
    await sqliteDb.prepare('UPDATE analytics SET total_visits = total_visits + 1 WHERE date = ?').run(todayStr);
  } else {
    await sqliteDb.prepare('INSERT INTO analytics (date, total_visits, mobile, desktop, tablet) VALUES (?, 1, 0, 0, 0)').run(todayStr);
  }

  await writeDatabase(db);
  res.json({ success: true });
});

// POST public click tracking
app.post('/api/public/analytics-click', async (req, res) => {
  const { service } = req.body;
  if (!service) return res.status(400).json({ error: "Missing service name" });

  const db = await readDatabase();
  if (!db.analytics) db.analytics = {};
  if (!db.analytics.clicks) db.analytics.clicks = { coins: 0, sbc: 0, rivals: 0, champions: 0, objectives: 0, coaching: 0, packages: 0 };

  const svcKey = service.toLowerCase();
  if (db.analytics.clicks[svcKey] !== undefined) {
    db.analytics.clicks[svcKey] = (db.analytics.clicks[svcKey] || 0) + 1;
    await writeDatabase(db);
  }
  res.json({ success: true });
});

// Update Champions Ranks
app.put('/api/admin/champions-ranks', async (req, res) => {
  await saveSetting('champions_ranks', req.body);
  await addAdminLog("UPDATE_CHAMPIONS_RANKS", "تعديل أسعار ورتب الفوت شامبيونز");
  res.json({ success: true });
});

// Update Rivals Ranks
app.put('/api/admin/rivals-ranks', async (req, res) => {
  await saveSetting('rivals_ranks', req.body);
  await addAdminLog("UPDATE_RIVALS_RANKS", "تعديل أسعار ورتب ديفجن رايفلز");
  res.json({ success: true });
});

// GET admin logs list
app.get('/api/admin/logs', async (req, res) => {
  const db = await readDatabase();
  res.json(db.logs || []);
});

// GET admin settings
app.get('/api/admin/settings', async (req, res) => {
  const db = await readDatabase();
  res.json(db.settings || {});
});

// POST update settings
app.post('/api/admin/settings', async (req, res) => {
  const newSettings = req.body;
  if (!newSettings) return res.status(400).json({ error: "Invalid settings data" });

  const oldSettings = {};
  const settingsRows = await sqliteDb.prepare('SELECT key, value FROM settings').all();
  for (const row of settingsRows) {
    try { oldSettings[row.key] = JSON.parse(row.value); } catch { oldSettings[row.key] = row.value; }
  }

  const changes = [];
  if (oldSettings.maintenanceMode !== !!newSettings.maintenanceMode) changes.push(`وضع الصيانة: ${newSettings.maintenanceMode ? 'تفعيل' : 'إلغاء'}`);
  if (oldSettings.whatsappPhone !== newSettings.whatsappPhone) changes.push(`رقم الواتساب: ${newSettings.whatsappPhone}`);
  if (oldSettings.instagramUrl !== newSettings.instagramUrl) changes.push(`رابط الإنستجرام: ${newSettings.instagramUrl}`);

  // Save all settings
  const settingsToSave = {
    whatsappPhone: newSettings.whatsappPhone,
    instagramUrl: newSettings.instagramUrl,
    maintenanceMode: !!newSettings.maintenanceMode,
    maintenanceBypassToken: newSettings.maintenanceBypassToken || oldSettings.maintenanceBypassToken || "trivela-bypass-vip",
    maintenanceMessage: newSettings.maintenanceMessage || oldSettings.maintenanceMessage || "نحن نقوم بأعمال صيانة مؤقتة للتحديث، سنعود للعمل قريباً جداً. شكراً لتفهمك!",
    maintenanceTitleText: newSettings.maintenanceTitleText || oldSettings.maintenanceTitleText || "أعمال صيانة مؤقتة",
    maintenanceCountdownActive: !!newSettings.maintenanceCountdownActive,
    maintenanceCountdownEndTime: newSettings.maintenanceCountdownEndTime || oldSettings.maintenanceCountdownEndTime || "",
    maintenanceGlowColor: newSettings.maintenanceGlowColor || oldSettings.maintenanceGlowColor || "#eab308",
    maintenanceIconStyle: newSettings.maintenanceIconStyle || oldSettings.maintenanceIconStyle || "wrench",
    maintenanceTelegramActive: !!newSettings.maintenanceTelegramActive,
    settingTelegram: newSettings.settingTelegram || oldSettings.settingTelegram || "https://t.me/Trivela",
    enableServiceCoins: newSettings.enableServiceCoins !== false,
    enableServiceSBC: newSettings.enableServiceSBC !== false,
    enableServiceRivals: newSettings.enableServiceRivals !== false,
    enableServiceChampions: newSettings.enableServiceChampions !== false,
    enableServiceObjectives: newSettings.enableServiceObjectives !== false,
    enableServiceCoaching: newSettings.enableServiceCoaching !== false,
    enableServicePackages: newSettings.enableServicePackages !== false,
    minCoinsPurchase: parseInt(newSettings.minCoinsPurchase) || 100000,
    maxCoinsPurchase: parseInt(newSettings.maxCoinsPurchase) || 10000000,
    customExchangeRates: newSettings.customExchangeRates || oldSettings.customExchangeRates || {},
    baseRateConsole: parseFloat(newSettings.baseRateConsole) || 2.80,
    baseRatePC: parseFloat(newSettings.baseRatePC) || 2.40,
    pointsDiscountRate: parseFloat(newSettings.pointsDiscountRate) || 37.5,
    discounts: newSettings.discounts || oldSettings.discounts || [],
    content: newSettings.content || oldSettings.content || {},
    marketing: newSettings.marketing || oldSettings.marketing || {},
    features: newSettings.features || oldSettings.features || []
  };

  for (const [key, value] of Object.entries(settingsToSave)) {
    await saveSetting(key, value);
  }

  if (changes.length > 0) {
    await addAdminLog('UPDATE_SETTINGS', `تم تحديث إعدادات المتجر: ${changes.join(' | ')}`, { settings: settingsToSave });
  }

  res.json({ success: true, settings: settingsToSave });
});

// Admin POST update features
app.post('/api/admin/features', async (req, res) => {
  const features = req.body;
  if (!Array.isArray(features)) return res.status(400).json({ error: "Invalid features data" });
  await saveSetting('features', features);
  await addAdminLog('UPDATE_FEATURES', 'تم تحديث وترتيب مميزات المتجر');
  res.json({ success: true, features });
});

// Admin GET all email campaigns
app.get('/api/admin/email-campaigns', async (req, res) => {
  const campaigns = await getSetting('_emailCampaigns', []);
  res.json(campaigns);
});

// Admin POST create email campaign
app.post('/api/admin/email-campaigns', async (req, res) => {
  const { subject, previewText, body, recipientCount } = req.body;
  if (!subject || !body) return res.status(400).json({ error: "Subject and Body are required" });

  const campaigns = await getSetting('_emailCampaigns', []);
  const newCampaign = {
    id: 'camp_' + Date.now(),
    date: new Date().toISOString(),
    subject, previewText: previewText || "", body,
    recipientCount: recipientCount || 0, status: 'completed'
  };
  campaigns.unshift(newCampaign);
  await saveSetting('_emailCampaigns', campaigns);
  await addAdminLog('SEND_EMAIL_CAMPAIGN', `تم إرسال حملة البريد الإلكتروني الجماعية: ${subject}`);
  res.json({ success: true, campaigns });
});

// Admin GET backup database
app.get('/api/admin/backup-db', async (req, res) => {
  const db = await readDatabase();
  const backupData = JSON.stringify(db, null, 2);
  const tmpPath = path.join(__dirname, 'trivela_backup_temp.json');
  fs.writeFileSync(tmpPath, backupData, 'utf8');
  res.download(tmpPath, 'trivela_database_backup.json', () => {
    try { fs.unlinkSync(tmpPath); } catch {}
  });
});

// Admin POST restore database
app.post('/api/admin/restore-db', async (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.settings) {
    return res.status(400).json({ error: "ملف النسخة الاحتياطية غير صالح أو تالف." });
  }
  // Save settings
  if (backupData.settings) {
    for (const [key, value] of Object.entries(backupData.settings)) {
      await saveSetting(key, value);
    }
  }
  await addAdminLog('RESTORE_DATABASE', 'تم استرجاع قاعدة البيانات من نسخة احتياطية مرفوعة.', {});
  res.json({ success: true });
});

// POST update site content
app.post('/api/admin/content', async (req, res) => {
  const newContent = req.body;
  if (!newContent) return res.status(400).json({ error: "Invalid content data" });
  await saveSetting('content', newContent);
  await addAdminLog('UPDATE_CONTENT', 'تم تحديث محتوى وتصميم صفحات المتجر');
  res.json({ success: true, content: newContent });
});

// GET expenses
app.get('/api/admin/expenses', async (req, res) => {
  res.json(await getSetting('_expenses', []));
});

// POST add expense
app.post('/api/admin/expenses', async (req, res) => {
  const expenseData = req.body;
  if (!expenseData || !expenseData.title || isNaN(parseFloat(expenseData.amountUSD))) {
    return res.status(400).json({ error: "بيانات المصروف غير صالحة" });
  }

  const expenses = await getSetting('_expenses', []);
  const newExpense = {
    id: 'exp_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900),
    title: expenseData.title.trim(),
    amountUSD: parseFloat(expenseData.amountUSD),
    category: expenseData.category || 'other',
    date: expenseData.date || new Date().toISOString()
  };
  expenses.push(newExpense);
  await saveSetting('_expenses', expenses);
  await addAdminLog('ADD_EXPENSE', `تم إضافة مصروف جديد: ${newExpense.title} بقيمة ${newExpense.amountUSD}$`, { expense: newExpense });
  res.json({ success: true, expense: newExpense });
});

// DELETE expense
app.delete('/api/admin/expenses/:id', async (req, res) => {
  const expenseId = req.params.id;
  const expenses = await getSetting('_expenses', []);
  const idx = expenses.findIndex(e => e.id === expenseId);
  if (idx === -1) return res.status(404).json({ error: "المصروف غير موجود" });
  const removed = expenses.splice(idx, 1)[0];
  await saveSetting('_expenses', expenses);
  await addAdminLog('DELETE_EXPENSE', `تم حذف مصروف: ${removed.title} بقيمة ${removed.amountUSD}$`);
  res.json({ success: true });
});

// ==========================================
// ORDER & PROFIT LOG MANAGEMENT
// ==========================================

// Public GET track order by ID or phone
app.get('/api/orders/track/:id', async (req, res) => {
  const query = (req.params.id || '').trim();
  if (!query) return res.status(400).json({ error: "يرجى تحديد رقم الطلب أو رقم الهاتف" });

  let order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(query);
  if (!order) {
    order = await sqliteDb.prepare('SELECT * FROM orders WHERE user_phone = ? OR whatsapp_phone = ? ORDER BY created_at DESC LIMIT 1').get(query, query);
  }

  if (!order) {
    return res.status(404).json({ error: "لم يتم العثور على الطلب. يرجى التأكد من الرقم والمحاولة مجدداً." });
  }

  const mapped = mapOrderFromDb(order);
  const maskEmail = (em) => {
    if (!em || !em.includes('@')) return null;
    const [name, domain] = em.split('@');
    return name.substring(0, 2) + '***@' + domain;
  };

  res.json({
    ...mapped,
    eaEmailMasked: maskEmail(mapped.eaEmail),
    sonyEmailMasked: maskEmail(mapped.sonyEmail)
  });
});

// User GET my-orders
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userPhone = req.user.phone;
  const userEmail = req.user.email;

  const ordersRaw = await sqliteDb.prepare(`
    SELECT * FROM orders 
    WHERE user_id = ? OR user_phone = ? OR user_email = ?
    ORDER BY created_at DESC
  `).all(userId, userPhone, userEmail);

  res.json(ordersRaw.map(mapOrderFromDb));
});

// GET all orders for admin
app.get('/api/admin/orders', async (req, res) => {
  const db = await readDatabase();
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

// DELETE an order
app.delete('/api/admin/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  
  await sqliteDb.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
  await addAdminLog('DELETE_ORDER', `تم حذف الطلب #${orderId.substring(6,14)} بالكامل — العميل: ${order.user_name}`, { orderId });
  res.json({ success: true });
});

// POST submit a new order
app.post('/api/orders', async (req, res) => {
  const orderData = req.body;
  if (!orderData || !orderData.service || !orderData.priceSAR) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  // Coupon validation
  if (orderData.couponCode) {
    const code = orderData.couponCode.toUpperCase().trim();
    const coupon = await sqliteDb.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
    if (!coupon) return res.status(400).json({ error: "كوبون الخصم المدخل غير صالح." });
    if ((coupon.used_count || 0) >= (coupon.max_uses || 999)) {
      return res.status(400).json({ error: "كوبون الخصم استنفذ الحد الأقصى للاستخدام." });
    }
  }

  const orderId = 'order_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900);
  const paymentMethod = orderData.paymentMethod === 'paytabs' ? 'paytabs' : 'whatsapp';
  
  // Add extra order columns for the full order data
  try {
    const columns = await sqliteDb.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
    const extraColumns = [
      'ea_password', 'backup_code1', 'backup_code2', 'backup_code3',
      'sony_email', 'sony_password', 'sony_backup_code1', 'sony_backup_code2', 'sony_backup_code3',
      'discord_handle', 'order_notes', 'amount_paid', 'supplier_cost', 'profit',
      'paid_at', 'started_at', 'cancelled_at', 'paytabs_tran_ref'
    ];
    for (const col of extraColumns) {
      if (!columns.includes(col)) {
        await sqliteDb.prepare(`ALTER TABLE orders ADD COLUMN ${col} TEXT`).run();
      }
    }
  } catch {}

  await sqliteDb.prepare(`
    INSERT INTO orders (id, user_id, user_phone, user_email, user_name, service, platform, ea_email, ea_password,
      backup_code1, backup_code2, backup_code3,
      sony_email, sony_password, sony_backup_code1, sony_backup_code2, sony_backup_code3,
      discord_handle, order_notes, payment_method,
      price_sar, status, coupon_code, amount_paid, supplier_cost, profit, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, 0, 0, datetime('now'), datetime('now'))
  `).run(
    orderId,
    null,
    orderData.customerPhone || 'غير محدد',
    orderData.customerEmail || null,
    orderData.customerName || 'زائر',
    orderData.service,
    orderData.platform || 'غير محدد',
    orderData.eaEmail || null,
    orderData.eaPassword || null,
    orderData.backupCode1 || null,
    orderData.backupCode2 || null,
    orderData.backupCode3 || null,
    orderData.sonyEmail || null,
    orderData.sonyPassword || null,
    orderData.sonyBackupCode1 || null,
    orderData.sonyBackupCode2 || null,
    orderData.sonyBackupCode3 || null,
    orderData.discordHandle || null,
    orderData.orderNotes || null,
    paymentMethod,
    parseFloat(orderData.priceSAR),
    orderData.couponCode || null
  );

  // Track coupon usage
  if (orderData.couponCode) {
    const code = orderData.couponCode.toUpperCase().trim();
    await sqliteDb.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(code);
  }

  await addAdminLog('NEW_ORDER', `طلب جديد #${orderId.substring(6,14)} من ${orderData.customerName || 'زائر'} [طريقة الدفع: ${paymentMethod === 'paytabs' ? 'PayTabs إلكتروني' : 'واتساب'}] — ${orderData.service}`, { orderId, paymentMethod });

  const newOrder = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

  // Handle PayTabs Direct Payment
  if (paymentMethod === 'paytabs') {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;
    const returnUrl = `${baseUrl}/api/payment/paytabs/return`;
    const callbackUrl = `${baseUrl}/api/payment/paytabs/callback`;

    try {
      const paytabsRes = await createPaymentPage(
        { ...newOrder, customerName: orderData.customerName, customerEmail: orderData.customerEmail, customerPhone: orderData.customerPhone, ip: req.ip },
        returnUrl,
        callbackUrl
      );

      if (paytabsRes.success && paytabsRes.redirect_url) {
        if (paytabsRes.tran_ref) {
          await sqliteDb.prepare('UPDATE orders SET paytabs_tran_ref = ? WHERE id = ?').run(paytabsRes.tran_ref, orderId);
        }
        return res.json({
          success: true,
          paymentMethod: 'paytabs',
          paymentUrl: paytabsRes.redirect_url,
          tranRef: paytabsRes.tran_ref,
          order: mapOrderFromDb(newOrder)
        });
      } else {
        return res.json({
          success: true,
          paymentMethod: 'whatsapp',
          paymentFallback: true,
          order: mapOrderFromDb(newOrder),
          message: 'تم تسجيل الطلب! تعذر فتح بوابة الدفع، يرجى المتابعة عبر الواتساب.'
        });
      }
    } catch (payErr) {
      console.error('PayTabs error on order create:', payErr);
      return res.json({
        success: true,
        paymentMethod: 'whatsapp',
        paymentFallback: true,
        order: mapOrderFromDb(newOrder)
      });
    }
  }

  // Default: WhatsApp manual payment
  res.json({ success: true, paymentMethod: 'whatsapp', order: mapOrderFromDb(newOrder) });
});

// ==========================================
// PAYTABS GATEWAY WEBHOOK & RETURN ROUTES
// ==========================================

// PayTabs Server-to-Server IPN Callback
app.post('/api/payment/paytabs/callback', async (req, res) => {
  try {
    const body = req.body;
    const tranRef = body.tran_ref || body.tranRef;
    const cartId = body.cart_id || body.cartId;
    const status = (body.payment_result && body.payment_result.response_status) || body.status;

    console.log(`💳 [PayTabs Callback] Cart: ${cartId}, Status: ${status}, Ref: ${tranRef}`);

    if (cartId) {
      const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(cartId);
      if (order && (status === 'A' || status === '100' || status === 'success' || status === 'Authorised')) {
        const now = new Date().toISOString();
        const amtPaid = order.price_sar || 0;
        await sqliteDb.prepare("UPDATE orders SET status = 'paid', payment_method = 'paytabs', amount_paid = ?, paid_at = ?, updated_at = ? WHERE id = ?").run(amtPaid, now, now, cartId);
        await addAdminLog('ORDER_PAID_ONLINE', `تم تأكيد دفع الطلب #${cartId.substring(6,14)} إلكترونياً عبر PayTabs (${amtPaid} ر.س) — العميل: ${order.user_name}`, { orderId: cartId, tranRef });
      }
    }
    res.status(200).send('OK');
  } catch (e) {
    console.error('PayTabs callback error:', e);
    res.status(500).send('Error');
  }
});

// PayTabs Customer Return Redirect
app.all('/api/payment/paytabs/return', async (req, res) => {
  const orderId = req.query.orderId || req.body.cart_id || req.body.cartId;
  const tranRef = req.query.tranRef || req.body.tran_ref || req.body.tranRef;

  if (!orderId) {
    return res.redirect('/track.html');
  }

  if (tranRef) {
    try {
      const verResult = await verifyTransaction(tranRef);
      if (verResult.isPaid) {
        const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (order && order.status === 'pending') {
          const now = new Date().toISOString();
          await sqliteDb.prepare("UPDATE orders SET status = 'paid', payment_method = 'paytabs', amount_paid = ?, paid_at = ?, updated_at = ? WHERE id = ?").run(order.price_sar || 0, now, now, orderId);
          await addAdminLog('ORDER_PAID_ONLINE', `تم تأكيد دفع الطلب #${orderId.substring(6,14)} عبر PayTabs — العميل: ${order.user_name}`, { orderId, tranRef });
        }
      }
    } catch (e) {
      console.error('Error verifying PayTabs return:', e);
    }
  }

  return res.redirect(`/track.html?orderId=${encodeURIComponent(orderId)}&payment_status=success`);
});


// PUT update order status
app.put('/api/admin/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { status, amountPaid, supplierCost } = req.body;

  const validStatuses = ['pending', 'paid', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }

  const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

  const now = new Date().toISOString();

  if (status === 'paid') {
    const amtPaidUSD = parseFloat(amountPaid);
    const amtPaidSAR = !isNaN(amtPaidUSD) ? amtPaidUSD * 3.75 : order.price_sar;
    await sqliteDb.prepare('UPDATE orders SET status = ?, amount_paid = ?, paid_at = ?, updated_at = ? WHERE id = ?').run('paid', amtPaidSAR, now, now, orderId);
    await addAdminLog('ORDER_PAID', `تم تأكيد دفع الطلب #${orderId.substring(6,14)} — ${order.user_name} — ${(amtPaidSAR / 3.75).toFixed(2)} $`, { orderId });
  } else if (status === 'in_progress') {
    const costUSD = parseFloat(supplierCost);
    const costSAR = !isNaN(costUSD) ? costUSD * 3.75 : 0;
    await sqliteDb.prepare('UPDATE orders SET status = ?, supplier_cost = ?, started_at = ?, updated_at = ? WHERE id = ?').run('in_progress', costSAR, now, now, orderId);
    await addAdminLog('ORDER_IN_PROGRESS', `تم إرسال الطلب #${orderId.substring(6,14)} للمورد — تكلفة المورد: ${(costSAR / 3.75).toFixed(2)} $`, { orderId });
  } else if (status === 'completed') {
    const updatedOrder = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const profit = ((updatedOrder.amount_paid || updatedOrder.price_sar) - (updatedOrder.supplier_cost || 0));
    await sqliteDb.prepare('UPDATE orders SET status = ?, profit = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('completed', profit, now, now, orderId);
    await addAdminLog('ORDER_COMPLETED', `تم إتمام الطلب #${orderId.substring(6,14)} — ${order.service} — ربح صافي: ${(profit / 3.75).toFixed(2)} $`, { orderId, profit });
  } else if (status === 'cancelled') {
    await sqliteDb.prepare('UPDATE orders SET status = ?, cancelled_at = ?, updated_at = ? WHERE id = ?').run('cancelled', now, now, orderId);
    await addAdminLog('ORDER_CANCELLED', `تم إلغاء الطلب #${orderId.substring(6,14)} — ${order.user_name}`, { orderId });
  }

  const finalOrder = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ success: true, order: mapOrderFromDb(finalOrder) });
});

// POST update order credentials/notes
app.post('/api/admin/orders/:id/update-details', async (req, res) => {
  const orderId = req.params.id;
  const { eaEmail, eaPassword, sonyEmail, sonyPassword, backupCodes, adminNotes } = req.body;

  const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

  if (eaEmail !== undefined) await sqliteDb.prepare('UPDATE orders SET ea_email = ? WHERE id = ?').run(eaEmail.trim(), orderId);
  if (eaPassword !== undefined) await sqliteDb.prepare('UPDATE orders SET ea_password = ? WHERE id = ?').run(eaPassword.trim(), orderId);
  if (sonyEmail !== undefined) await sqliteDb.prepare('UPDATE orders SET sony_email = ? WHERE id = ?').run(sonyEmail.trim(), orderId);
  if (sonyPassword !== undefined) await sqliteDb.prepare('UPDATE orders SET sony_password = ? WHERE id = ?').run(sonyPassword.trim(), orderId);
  if (adminNotes !== undefined) await sqliteDb.prepare('UPDATE orders SET admin_notes = ? WHERE id = ?').run(adminNotes.trim(), orderId);

  await sqliteDb.prepare("UPDATE orders SET updated_at = datetime('now') WHERE id = ?").run(orderId);
  await addAdminLog('UPDATE_ORDER_DETAILS', `تم تعديل بيانات/ملاحظات الطلب #${orderId.substring(6,14)}`, { orderId });

  const updatedOrder = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ success: true, order: mapOrderFromDb(updatedOrder) });
});

// Legacy: POST complete order
app.post('/api/admin/orders/:id/complete', async (req, res) => {
  const orderId = req.params.id;
  const { supplierCost } = req.body;
  const order = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  
  const cost = (parseFloat(supplierCost) || 0) * 3.75;
  const profit = ((order.amount_paid || order.price_sar) - cost);
  const now = new Date().toISOString();
  
  await sqliteDb.prepare('UPDATE orders SET status = ?, supplier_cost = ?, profit = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('completed', cost, profit, now, now, orderId);
  await addAdminLog('COMPLETE_ORDER', `تم إتمام الطلب ${orderId} بتكلفة مورد ${(cost / 3.75).toFixed(2)} $`, { orderId });
  
  const finalOrder = await sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ success: true, order: mapOrderFromDb(finalOrder) });
});

// ==========================================
// FAQS & REVIEWS CONTENT EDITORS
// ==========================================

// POST add/update FAQ
app.post('/api/admin/faqs', async (req, res) => {
  const { id, q, a, question, answer } = req.body;
  const finalQ = q || question;
  const finalA = a || answer;
  if (!finalQ || !finalA) return res.status(400).json({ error: "الرجاء إدخال السؤال والجواب" });

  const faqId = id || 'faq_' + Date.now();
  const existing = await sqliteDb.prepare('SELECT id FROM faqs WHERE id = ?').get(faqId);
  
  if (existing) {
    await sqliteDb.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(finalQ, finalA, faqId);
    await addAdminLog('UPDATE_FAQ', `تم تعديل السؤال الشائع: "${finalQ}"`, { faqId });
  } else {
    await sqliteDb.prepare('INSERT INTO faqs (id, question, answer) VALUES (?, ?, ?)').run(faqId, finalQ, finalA);
    await addAdminLog('ADD_FAQ', `تم إضافة سؤال شائع جديد: "${finalQ}"`, { faqId });
  }

  const faqs = (await sqliteDb.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all()).map(f => ({
    id: f.id, q: f.question, a: f.answer, question: f.question, answer: f.answer
  }));
  res.json({ success: true, faqs });
});

// DELETE FAQ
app.delete('/api/admin/faqs/:id', async (req, res) => {
  const faqId = req.params.id;
  const faq = await sqliteDb.prepare('SELECT * FROM faqs WHERE id = ?').get(faqId);
  if (!faq) return res.status(404).json({ error: "FAQ not found" });
  
  await sqliteDb.prepare('DELETE FROM faqs WHERE id = ?').run(faqId);
  await addAdminLog('DELETE_FAQ', `تم حذف السؤال الشائع: "${faq.question}"`, { faqId });

  const faqs = (await sqliteDb.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all()).map(f => ({
    id: f.id, q: f.question, a: f.answer, question: f.question, answer: f.answer
  }));
  res.json({ success: true, faqs });
});

// GET all reviews (admin)
app.get('/api/admin/reviews', async (req, res) => {
  const reviews = (await sqliteDb.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all()).map(r => ({
    id: r.id, name: r.user_name, stars: r.rating, text: r.comment,
    badge: '', status: r.visible === 1 ? 'approved' : 'pending'
  }));
  res.json({ success: true, reviews });
});

// POST add/update Review
app.post('/api/admin/reviews', async (req, res) => {
  const { id, name, platform, stars, text, badge, status } = req.body;
  if (!name || !text) return res.status(400).json({ error: "الرجاء إدخال اسم العميل والتقييم" });

  const revId = id || 'rev_' + Date.now();
  const visible = status === 'approved' ? 1 : 0;
  const existing = await sqliteDb.prepare('SELECT id FROM reviews WHERE id = ?').get(revId);

  if (existing) {
    await sqliteDb.prepare('UPDATE reviews SET user_name = ?, rating = ?, comment = ?, visible = ? WHERE id = ?').run(name.trim(), parseInt(stars, 10) || 5, text.trim(), visible, revId);
    await addAdminLog('UPDATE_REVIEW', `تم تعديل تقييم العميل: "${name}"`, { revId });
  } else {
    await sqliteDb.prepare('INSERT INTO reviews (id, user_name, rating, comment, visible) VALUES (?, ?, ?, ?, ?)').run(revId, name.trim(), parseInt(stars, 10) || 5, text.trim(), visible);
    await addAdminLog('ADD_REVIEW', `تم إضافة تقييم جديد للعميل: "${name}"`, { revId });
  }

  const reviews = (await sqliteDb.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all()).map(r => ({
    id: r.id, name: r.user_name, stars: r.rating, text: r.comment,
    badge: '', status: r.visible === 1 ? 'approved' : 'pending'
  }));
  res.json({ success: true, reviews });
});

// DELETE Review
app.delete('/api/admin/reviews/:id', async (req, res) => {
  const revId = req.params.id;
  const rev = await sqliteDb.prepare('SELECT * FROM reviews WHERE id = ?').get(revId);
  if (!rev) return res.status(404).json({ error: "Review not found" });

  await sqliteDb.prepare('DELETE FROM reviews WHERE id = ?').run(revId);
  await addAdminLog('DELETE_REVIEW', `تم حذف تقييم العميل: "${rev.user_name}"`, { revId });

  const reviews = (await sqliteDb.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all()).map(r => ({
    id: r.id, name: r.user_name, stars: r.rating, text: r.comment,
    badge: '', status: r.visible === 1 ? 'approved' : 'pending'
  }));
  res.json({ success: true, reviews });
});

// ==========================================
// COUPON MANAGEMENT ROUTES
// ==========================================

// Public GET all coupons
app.get('/api/public/coupons', async (req, res) => {
  const coupons = (await sqliteDb.prepare('SELECT * FROM coupons').all()).map(c => ({
    code: c.code, percent: c.discount_percent, maxUses: c.max_uses,
    usedCount: c.used_count, expiryDate: c.created_at
  }));
  res.json(coupons);
});

// Admin GET all coupons
app.get('/api/admin/coupons', async (req, res) => {
  const coupons = (await sqliteDb.prepare('SELECT * FROM coupons').all()).map(c => ({
    code: c.code, percent: c.discount_percent, maxUses: c.max_uses,
    usedCount: c.used_count, expiryDate: c.created_at
  }));
  res.json(coupons);
});

// Admin POST add/update coupon
app.post('/api/admin/coupons', async (req, res) => {
  const newCoupon = req.body;
  if (!newCoupon || !newCoupon.code || newCoupon.percent === undefined) {
    return res.status(400).json({ error: "بيانات الكوبون غير صالحة" });
  }

  const code = newCoupon.code.toUpperCase().trim();
  const existing = await sqliteDb.prepare('SELECT id FROM coupons WHERE code = ?').get(code);

  if (existing) {
    await sqliteDb.prepare('UPDATE coupons SET discount_percent = ?, max_uses = ?, used_count = ? WHERE code = ?').run(
      parseFloat(newCoupon.percent), parseInt(newCoupon.maxUses, 10) || 999,
      parseInt(newCoupon.usedCount, 10) || 0, code
    );
    await addAdminLog('UPDATE_COUPON', `تم تعديل الكوبون: "${code}" (خصم ${newCoupon.percent}%)`, { code });
  } else {
    await sqliteDb.prepare('INSERT INTO coupons (id, code, discount_percent, max_uses, used_count, active) VALUES (?, ?, ?, ?, ?, 1)').run(
      'cpn_' + Date.now(), code, parseFloat(newCoupon.percent),
      parseInt(newCoupon.maxUses, 10) || 999, parseInt(newCoupon.usedCount, 10) || 0
    );
    await addAdminLog('ADD_COUPON', `تم إضافة كوبون جديد: "${code}" (خصم ${newCoupon.percent}%)`, { code });
  }

  const coupons = (await sqliteDb.prepare('SELECT * FROM coupons').all()).map(c => ({
    code: c.code, percent: c.discount_percent, maxUses: c.max_uses,
    usedCount: c.used_count, expiryDate: c.created_at
  }));
  res.json({ success: true, coupons });
});

// Admin DELETE coupon
app.delete('/api/admin/coupons/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const existing = await sqliteDb.prepare('SELECT id FROM coupons WHERE code = ?').get(code);
  if (!existing) return res.status(404).json({ error: "الكوبون غير موجود" });

  await sqliteDb.prepare('DELETE FROM coupons WHERE code = ?').run(code);
  await addAdminLog('DELETE_COUPON', `تم حذف الكوبون التسويقي: "${code}"`, { code });

  const coupons = (await sqliteDb.prepare('SELECT * FROM coupons').all()).map(c => ({
    code: c.code, percent: c.discount_percent, maxUses: c.max_uses,
    usedCount: c.used_count, expiryDate: c.created_at
  }));
  res.json({ success: true, coupons });
});

// Redeem loyalty points
app.post('/api/public/redeem-points', authenticateToken, async (req, res) => {
  const { rewardType } = req.body;
  const userId = req.user.id;

  const validRewards = {
    'coins50k': { cost: 1000, discount: 0, flatDiscount: 0, freeCoins: 50000, label: "+50,000 كوينز" },
    'coins100k': { cost: 1800, discount: 0, flatDiscount: 0, freeCoins: 100000, label: "+100,000 كوينز" },
    'coins250k': { cost: 4000, discount: 0, flatDiscount: 0, freeCoins: 250000, label: "+250,000 كوينز" },
    'discount15': { cost: 800, discount: 0, flatDiscount: 15, freeCoins: 0, label: "15 ر.س" },
    'discount40': { cost: 2000, discount: 0, flatDiscount: 40, freeCoins: 0, label: "40 ر.س" }
  };

  if (!validRewards[rewardType]) return res.status(400).json({ error: "نوع مكافأة غير صالح" });

  const reward = validRewards[rewardType];
  const user = await sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  if ((user.points || 0) < reward.cost) return res.status(400).json({ error: "رصيد نقاطك غير كافٍ لاستبدال هذه المكافأة" });

  const newPoints = (user.points || 0) - reward.cost;
  await sqliteDb.prepare('UPDATE users SET points = ? WHERE id = ?').run(newPoints, userId);

  const couponCode = `TRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  await sqliteDb.prepare('INSERT INTO points_history (user_id, amount, reason) VALUES (?, ?, ?)').run(
    userId, -reward.cost, `استبدال نقاط بمكافأة ${reward.label} (${couponCode})`
  );

  await sqliteDb.prepare('INSERT INTO coupons (id, code, discount_percent, max_uses, used_count, active) VALUES (?, ?, ?, 1, 0, 1)').run(
    'cpn_' + Date.now(), couponCode, reward.discount
  );

  res.json({ success: true, points: newPoints, couponCode, discount: reward.discount, label: reward.label });
});

// ==========================================
// ADD .env VARS for new features
// ==========================================

// Update .env with JWT_SECRET and RESEND_API_KEY placeholders if not present (local only)
if (!process.env.VERCEL) {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (!envContent.includes('RESEND_API_KEY')) {
        envContent += '\n# Resend API Key for OTP emails\nRESEND_API_KEY=\n';
      }
      if (!envContent.includes('OTP_FROM_EMAIL')) {
        envContent += '# Email sender address (use onboarding@resend.dev for testing)\nOTP_FROM_EMAIL=onboarding@resend.dev\n';
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch {}
}

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Trivela Server running at: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
  });
}

module.exports = app;
