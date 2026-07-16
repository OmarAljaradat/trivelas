import { adminService } from './src/features/admin/adminService.js';
import { auth } from './src/core/auth.js';

// Global state
let currentTab = 'orders';
let allOrders = [];
let allReviews = [];
let pollingInterval = null;

// Currency symbols
const CURRENCY_SYMBOLS = {
  SAR: 'ر.س',
  USD: '$',
  AED: 'د.إ',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
  JOD: 'د.أ',
  EGP: 'ج.م'
};

// Check admin auth immediately
async function checkAuth() {
  if (window.__adminGuardBlocked) return;
  const token = localStorage.getItem('trivela_token');
  if (!token) {
    window.location.href = '/login.html?redirect=/admin-mobile.html';
    return;
  }
}

// Register PWA Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('ServiceWorker registered successfully:', reg.scope))
        .catch((err) => console.warn('ServiceWorker registration failed:', err));
    });
  }
}

// ══════════ DATA LOADING ══════════ //

async function loadDashboardData() {
  try {
    // 1. Fetch Stats for today (days=1)
    const stats = await adminService.getQuickStats(1);
    
    // 2. Fetch Orders
    allOrders = await adminService.getOrdersList();
    
    // 3. Fetch Reviews
    allReviews = await adminService.getReviews();
    
    // Update dashboard metrics
    updateDashboardMetrics(stats, allOrders, allReviews);
    
    // Render current active tab
    if (currentTab === 'orders') {
      renderOrders();
    } else if (currentTab === 'reviews') {
      renderReviews();
    }
  } catch (err) {
    console.error("Error loading dashboard data:", err);
  }
}

function updateDashboardMetrics(stats, orders, reviews) {
  // Today's Sales (convert USD back to SAR for local Gulf store preference, 1 USD = 3.75 SAR)
  const salesSAR = Math.round((stats.totalSales || 0) * 3.75);
  const salesEl = document.getElementById('statTodaySales');
  if (salesEl) salesEl.textContent = `${salesSAR} ر.س`;
  
  // Active Orders (pending, paid, in_progress)
  const activeCount = orders.filter(o => ['pending', 'paid', 'in_progress'].includes(o.status)).length;
  const activeEl = document.getElementById('statActiveOrders');
  if (activeEl) activeEl.textContent = activeCount;
  
  // Pending Reviews Count
  const pendingReviewsCount = reviews.filter(r => r.status === 'pending').length;
  const pendingEl = document.getElementById('statPendingReviews');
  if (pendingEl) pendingEl.textContent = pendingReviewsCount;
}

// ══════════ ORDERS TAB VIEW ══════════ //

function renderOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  
  if (!allOrders || allOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <div class="empty-state-title">لا توجد طلبات مسجلة</div>
        <div class="empty-state-desc">سيظهر هنا أي طلب جديد يقوم العملاء بتقديمه فوراً.</div>
      </div>
    `;
    return;
  }
  
  // Sort orders: pending first, then paid, then in_progress, then completed, then cancelled
  const statusWeight = { pending: 1, paid: 2, in_progress: 3, completed: 4, cancelled: 5 };
  const sortedOrders = [...allOrders].sort((a, b) => {
    const wa = statusWeight[a.status] || 9;
    const wb = statusWeight[b.status] || 9;
    if (wa !== wb) return wa - wb;
    return new Date(b.timestamp) - new Date(a.timestamp); // newest first if same status
  });
  
  container.innerHTML = sortedOrders.map(order => {
    const cleanId = order.id.substring(6, 14);
    const dateStr = new Date(order.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(order.timestamp).toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' });
    
    // Status translation & classes
    let statusText = 'انتظار';
    if (order.status === 'paid') statusText = 'تم الدفع';
    if (order.status === 'in_progress') statusText = 'شحن بالمورد';
    if (order.status === 'completed') statusText = 'مكتمل';
    if (order.status === 'cancelled') statusText = 'ملغي';
    
    // Format coin amounts to readable value
    const formattedCoins = order.coinsAmount ? formatCoinsAmount(order.coinsAmount) : '';
    
    // Determine dynamic actions
    let actionButtons = '';
    
    if (order.status === 'pending') {
      actionButtons += `
        <button class="btn-action btn-whatsapp" onclick="openWhatsApp('${order.customerPhone}', '${order.id}', '${order.customerName}', '${formattedCoins}', '${order.platform}', '${order.priceSAR}')">
          <i class="fab fa-whatsapp"></i> واتساب
        </button>
        <button class="btn-action btn-state-change" onclick="openStatusModal('${order.id}', 'paid')">
          <i class="fas fa-check"></i> قبول الدفع
        </button>
      `;
    } else if (order.status === 'paid') {
      actionButtons += `
        <button class="btn-action btn-details" onclick="openDetailsModal('${order.id}')">
          <i class="fas fa-eye"></i> التفاصيل
        </button>
        <button class="btn-action btn-state-change" style="background:#a855f7;" onclick="openStatusModal('${order.id}', 'in_progress')">
          <i class="fas fa-truck-loading"></i> إرسال للمورد
        </button>
      `;
    } else if (order.status === 'in_progress') {
      actionButtons += `
        <button class="btn-action btn-details" onclick="openDetailsModal('${order.id}')">
          <i class="fas fa-eye"></i> التفاصيل
        </button>
        <button class="btn-action btn-state-change" style="background:#10b981;" onclick="openStatusModal('${order.id}', 'completed')">
          <i class="fas fa-check-double"></i> إتمام وشحن
        </button>
      `;
    } else {
      // Completed or cancelled
      actionButtons += `
        <button class="btn-action btn-details" style="width: 100%; flex: none;" onclick="openDetailsModal('${order.id}')">
          <i class="fas fa-eye"></i> تفاصيل الطلب
        </button>
      `;
    }
    
    return `
      <div class="mobile-card border-${order.status}">
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">${order.customerName} (#${cleanId})</span>
            <span class="card-subtitle">${dateStr}</span>
          </div>
          <span class="badge badge-${order.status}">${statusText}</span>
        </div>
        
        <div class="card-body-row">
          <div class="body-item">
            <span class="body-item-label">المنصة:</span>
            <span class="body-item-val">${order.platform === 'pc' ? 'PC' : 'Console'}</span>
          </div>
          <div class="body-item">
            <span class="body-item-label">الخدمة:</span>
            <span class="body-item-val">${order.service}</span>
          </div>
          <div class="body-item">
            <span class="body-item-label">الكمية:</span>
            <span class="body-item-val">${formattedCoins || order.service}</span>
          </div>
          <div class="body-item">
            <span class="body-item-label">السعر الفعلي:</span>
            <span class="body-item-val monts">${Math.round(order.priceSAR)} ر.س</span>
          </div>
        </div>
        
        <div class="card-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

// Format number of coins to M or K (helper)
function formatCoinsAmount(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  if (num >= 1000000) return (num / 1000000) % 1 === 0 ? `${num/1000000}M` : `${(num/1000000).toFixed(1)}M`;
  if (num >= 1000) return `${num/1000}K`;
  return String(num);
}

// ══════════ REVIEWS TAB VIEW ══════════ //

function renderReviews() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;
  
  const pendingReviews = allReviews.filter(r => r.status === 'pending');
  
  if (!pendingReviews || pendingReviews.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-star-half-stroke"></i>
        <div class="empty-state-title">لا توجد تقييمات معلقة</div>
        <div class="empty-state-desc">سيظهر هنا أي تقييم يرسله العميل للموافقة والتعديل قبل النشر.</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pendingReviews.map(rev => {
    let starsHtml = '';
    for (let i = 0; i < 5; i++) {
      starsHtml += `<i class="fa${i < rev.stars ? 's' : 'r'} fa-star" style="color:var(--gold-primary); font-size:0.75rem;"></i>`;
    }
    
    return `
      <div class="mobile-card" style="border-right: 4px solid var(--gold-primary);">
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">${rev.name} (${rev.platform || 'Console'})</span>
            <span class="card-subtitle">${starsHtml}</span>
          </div>
          <span class="badge badge-pending">معلق</span>
        </div>
        
        <div class="review-text-bubble">
          ${rev.text}
        </div>
        
        <div class="card-actions">
          <button class="btn-action btn-delete" onclick="deleteReview('${rev.id}')">
            <i class="fas fa-trash-alt"></i> رفض وحذف
          </button>
          <button class="btn-action btn-approve" onclick="approveReview('${rev.id}', '${rev.name.replace(/'/g, "\\'")}', '${rev.platform || 'Console'}', ${rev.stars}, '${rev.text.replace(/'/g, "\\'")}', '${rev.badge || ''}')">
            <i class="fas fa-check-circle"></i> قبول ونشر
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════ WHATSAPP CONTACT ACTION ══════════ //

window.openWhatsApp = function(phone, orderId, name, coins, platform, price) {
  const cleanId = orderId.substring(6, 14);
  const formattedPhone = phone.replace(/[\s\+\-]/g, '').trim();
  
  const text = `أهلاً بك يا بطل، تم استلام طلبك رقم #${cleanId} بنجاح! 🤩⚽

تفاصيل الطلب:
- العميل: ${name}
- الخدمة: شحن كوينز Comfort Trade
- الكمية: ${coins}
- الجهاز/المنصة: ${platform === 'pc' ? 'PC' : 'PlayStation / Xbox'}
- الإجمالي: ${Math.round(price)} ر.س

يرجى إرسال لقطة شاشة لإيصال التحويل البنكي لنبدأ الشحن الفوري لحسابك الآن! ⚡🚀`;
  
  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');
};

// ══════════ REVIEWS MODERATION ACTIONS ══════════ //

window.approveReview = async function(id, name, platform, stars, text, badge) {
  if (!confirm("هل أنت متأكد من رغبتك في الموافقة على هذا التقييم ونشره فوراً بالمتجر؟")) return;
  try {
    const reviewData = { id, name, platform, stars, text, badge, status: 'approved' };
    const data = await adminService.saveReview(reviewData);
    if (data.success) {
      alert("تم نشر التقييم بنجاح بالمتجر!");
      loadDashboardData();
    } else {
      alert("فشل نشر التقييم.");
    }
  } catch (err) {
    alert("خطأ أثناء الموافقة على التقييم.");
  }
};

window.deleteReview = async function(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا التقييم المعلق نهائياً؟")) return;
  try {
    const data = await adminService.deleteReview(id);
    if (data.success) {
      alert("تم رفض وحذف التقييم بنجاح!");
      loadDashboardData();
    } else {
      alert("فشل حذف التقييم.");
    }
  } catch (err) {
    alert("خطأ أثناء حذف التقييم.");
  }
};

// ══════════ DETAILS MODAL ══════════ //

window.openDetailsModal = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  
  const body = document.getElementById('detailsModalBody');
  if (!body) return;
  
  // Populate details
  let detailsHtml = `
    <div class="modal-body-item">
      <span class="modal-body-label">رقم الطلب:</span>
      <span class="modal-body-val monts">${order.id.substring(6, 14)}</span>
    </div>
    <div class="modal-body-item">
      <span class="modal-body-label">الاسم ورقم الجوال:</span>
      <span class="modal-body-val">${order.customerName} (${order.customerPhone})</span>
    </div>
    <div class="modal-body-item">
      <span class="modal-body-label">بريد EA للحساب:</span>
      <span class="modal-body-val code">${order.eaEmail || 'غير متوفر'}</span>
    </div>
    <div class="modal-body-item">
      <span class="modal-body-label">كلمة مرور EA:</span>
      <span class="modal-body-val code">${order.eaPassword || 'غير متوفر'}</span>
    </div>
    <div class="modal-body-item">
      <span class="modal-body-label">الرموز الاحتياطية (Backup Codes):</span>
      <span class="modal-body-val code">${(order.backupCodes || order.backup1 || '').replace(/,/g, '  |  ') || 'غير متوفر'}</span>
    </div>
  `;
  
  if (order.sonyEmail || order.sonyPassword) {
    detailsHtml += `
      <div class="modal-body-item">
        <span class="modal-body-label">بريد سوني (PSN):</span>
        <span class="modal-body-val code">${order.sonyEmail || 'غير متوفر'}</span>
      </div>
      <div class="modal-body-item">
        <span class="modal-body-label">كلمة مرور سوني:</span>
        <span class="modal-body-val code">${order.sonyPassword || 'غير متوفر'}</span>
      </div>
    `;
  }
  
  if (order.adminNotes) {
    detailsHtml += `
      <div class="modal-body-item" style="flex-direction:column; align-items:flex-start; gap:6px;">
        <span class="modal-body-label">ملاحظات الإدارة:</span>
        <span class="modal-body-val" style="width:100%; white-space:pre-wrap; background:rgba(0,0,0,0.1); padding:8px; border-radius:6px; font-size:0.8rem;">${order.adminNotes}</span>
      </div>
    `;
  }
  
  body.innerHTML = detailsHtml;
  
  const modal = document.getElementById('detailsModal');
  if (modal) modal.classList.add('open');
};

window.closeDetailsModal = function() {
  const modal = document.getElementById('detailsModal');
  if (modal) modal.classList.remove('open');
};

// ══════════ STATUS UPDATE MODAL ══════════ //

window.openStatusModal = function(orderId, targetStatus) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  
  document.getElementById('statusOrderId').value = orderId;
  document.getElementById('targetStatusVal').value = targetStatus;
  
  const title = document.getElementById('statusModalTitle');
  const groupCost = document.getElementById('groupSupplierCost');
  const groupAmt = document.getElementById('groupAmountPaid');
  const costInput = document.getElementById('supplierCostInput');
  const amtInput = document.getElementById('amountPaidInput');
  
  // Reset inputs
  costInput.value = '';
  amtInput.value = '';
  
  // Hide inputs by default
  groupCost.style.display = 'none';
  groupAmt.style.display = 'none';
  
  if (targetStatus === 'paid') {
    title.innerHTML = `<i class="fas fa-check"></i> قبول وتأكيد الدفع`;
    groupAmt.style.display = 'flex';
    // Prefill with dynamic conversion: priceSAR / 3.75 = USD value
    amtInput.value = (order.priceSAR / 3.75).toFixed(2);
  } else if (targetStatus === 'in_progress') {
    title.innerHTML = `<i class="fas fa-truck-loading"></i> إرسال الطلب للمورد`;
    groupCost.style.display = 'flex';
  } else if (targetStatus === 'completed') {
    title.innerHTML = `<i class="fas fa-check-double"></i> إتمام وشحن الطلب`;
    groupCost.style.display = 'flex';
    // If supplier cost was already saved, prefill it (divide by 3.75 to show USD)
    if (order.supplierCost > 0) {
      costInput.value = (order.supplierCost / 3.75).toFixed(2);
    }
  }
  
  const modal = document.getElementById('statusModal');
  if (modal) modal.classList.add('open');
};

window.closeStatusModal = function() {
  const modal = document.getElementById('statusModal');
  if (modal) modal.classList.remove('open');
};

window.submitStatusUpdate = async function(event) {
  event.preventDefault();
  
  const id = document.getElementById('statusOrderId').value;
  const status = document.getElementById('targetStatusVal').value;
  const costVal = document.getElementById('supplierCostInput').value;
  const amtVal = document.getElementById('amountPaidInput').value;
  
  const extraData = {};
  if (status === 'paid' && amtVal) {
    extraData.amountPaid = parseFloat(amtVal);
  }
  if ((status === 'in_progress' || status === 'completed') && costVal) {
    extraData.supplierCost = parseFloat(costVal);
  }
  
  try {
    const data = await adminService.updateOrderStatus(id, status, extraData);
    if (data.success) {
      closeStatusModal();
      loadDashboardData();
    } else {
      alert("فشل تحديث الحالة.");
    }
  } catch (err) {
    alert("حدث خطأ أثناء تحديث حالة الطلب.");
  }
};

// ══════════ TABS SWITCHING & NAVIGATION ══════════ //

window.switchTab = function(tabName, el) {
  currentTab = tabName;
  
  // Update nav UI active class
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  el.classList.add('active');
  
  // Show active view
  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
  
  if (tabName === 'orders') {
    document.getElementById('viewOrders').classList.add('active');
    renderOrders();
  } else if (tabName === 'reviews') {
    document.getElementById('viewReviews').classList.add('active');
    renderReviews();
  }
};

window.logoutAdmin = function() {
  if (confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة التحكم؟")) {
    localStorage.removeItem('trivela_token');
    window.location.href = '/login.html';
  }
};

// ══════════ ON PAGE INITIALIZATION ══════════ //

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  registerServiceWorker();
  loadDashboardData();
  
  // Start dynamic polling every 15 seconds to update orders in real-time
  pollingInterval = setInterval(loadDashboardData, 15000);
});

// Clear polling on tab close/unload
window.addEventListener('unload', () => {
  if (pollingInterval) clearInterval(pollingInterval);
});
