let scrapedPlayerData = null;
let allUsers = [];
let adminActivePlayers = [];
let adminActiveOrders = [];
let currentOrderFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadActivePlayers();
  loadAllUsers();
  loadQuickStats();
  loadStoreSettings();
  loadOrdersList();
  loadAdminLogs();
  loadFAQs();
  loadReviews();

  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) {
    const sbcSubCategoryGroup = document.getElementById('sbcSubCategoryGroup');
    const objectiveSubCategoryGroup = document.getElementById('objectiveSubCategoryGroup');
    const toggleSubGroups = () => {
      if (sbcSubCategoryGroup) {
        sbcSubCategoryGroup.style.display = categorySelect.value === 'sbc' ? 'block' : 'none';
      }
      if (objectiveSubCategoryGroup) {
        objectiveSubCategoryGroup.style.display = categorySelect.value === 'objectives' ? 'block' : 'none';
      }
    };
    categorySelect.addEventListener('change', toggleSubGroups);
    toggleSubGroups();
  }
});

// Top header 5-group navigation tab switching
// Top header 5-group navigation tab switching
function switchMainTab(tabId) {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const isActive = btn.getAttribute('onclick').includes(tabId);
    btn.classList.toggle('active', isActive);
  });

  // Hide all sub-tab bars
  const barStats = document.getElementById('sub-bar-stats');
  const barStore = document.getElementById('sub-bar-store');
  const barContent = document.getElementById('sub-bar-content');
  const barSystem = document.getElementById('sub-bar-system');
  if (barStats) barStats.style.display = 'none';
  if (barStore) barStore.style.display = 'none';
  if (barContent) barContent.style.display = 'none';
  if (barSystem) barSystem.style.display = 'none';

  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

  if (tabId === 'stats-reports') {
    if (barStats) barStats.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-stats .sub-tab-btn.active') || document.querySelector('#sub-bar-stats .sub-tab-btn');
    if (activeSub) {
      activeSub.classList.add('active');
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    }
  } 
  else if (tabId === 'store-products') {
    if (barStore) barStore.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-store .sub-tab-btn.active') || document.querySelector('#sub-bar-store .sub-tab-btn');
    if (activeSub) {
      activeSub.classList.add('active');
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    }
  } 
  else if (tabId === 'customers-marketing') {
    const panel = document.getElementById('users-panel');
    if (panel) panel.classList.add('active');
  } 
  else if (tabId === 'content-design') {
    if (barContent) barContent.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-content .sub-tab-btn.active') || document.querySelector('#sub-bar-content .sub-tab-btn');
    if (activeSub) {
      activeSub.classList.add('active');
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    }
  } 
  else if (tabId === 'system') {
    if (barSystem) barSystem.style.display = 'flex';
    const activeSub = document.querySelector('#sub-bar-system .sub-tab-btn.active') || document.querySelector('#sub-bar-system .sub-tab-btn');
    if (activeSub) {
      activeSub.classList.add('active');
      const panelId = activeSub.getAttribute('onclick').match(/'([^']+)'/)[1];
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    }
  }
}

// Inner sub-tab switching within main tab view
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
}

// Load statistics details
function loadQuickStats() {
  fetch('/api/admin/stats')
    .then(res => res.json())
    .then(data => {
      document.getElementById('statTotalUsers').textContent = data.totalUsers.toLocaleString();
      
      const statVisits = document.getElementById('statTotalVisits');
      if (statVisits) statVisits.textContent = data.totalVisits.toLocaleString();
      
      const statVisitorTotal = document.getElementById('statVisitorTotal');
      if (statVisitorTotal) statVisitorTotal.textContent = data.totalVisits.toLocaleString();

      const statToday = document.getElementById('statVisitsToday');
      if (statToday) statToday.textContent = data.visitsToday.toLocaleString();
      
      const statVisitorToday = document.getElementById('statVisitorToday');
      if (statVisitorToday) statVisitorToday.textContent = data.visitsToday.toLocaleString();

      const statSales = document.getElementById('statTotalSales');
      if (statSales) statSales.textContent = `${data.totalSales.toLocaleString()} SAR`;
      
      const statProfit = document.getElementById('statTotalProfit');
      if (statProfit) statProfit.textContent = `${data.totalProfit.toLocaleString()} SAR`;
      
      const statPending = document.getElementById('statPendingOrders');
      if (statPending) statPending.textContent = data.pendingOrdersCount.toLocaleString();
    })
    .catch(err => {
      console.error("Error loading stats:", err);
    });
}

// Store Settings Loading & Saving
function loadStoreSettings() {
  fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      if (data.settings) {
        const settings = data.settings;
        document.getElementById('settingMaintenance').checked = !!settings.maintenanceMode;
        document.getElementById('settingWhatsapp').value = settings.whatsappPhone || '';
        document.getElementById('settingInstagram').value = settings.instagramUrl || '';
        document.getElementById('settingRateConsole').value = settings.baseRateConsole || 2.80;
        document.getElementById('settingRatePC').value = settings.baseRatePC || 2.40;

        // Update dashboard system status widgets
        const qConsole = document.getElementById('lblQuickConsoleRate');
        const qPC = document.getElementById('lblQuickPcRate');
        const qMaint = document.getElementById('lblQuickMaintBadge');
        const qNormal = document.getElementById('lblQuickNormalBadge');

        if (qConsole) qConsole.textContent = `$${parseFloat(settings.baseRateConsole || 2.80).toFixed(2)}`;
        if (qPC) qPC.textContent = `$${parseFloat(settings.baseRatePC || 2.40).toFixed(2)}`;

        if (qMaint && qNormal) {
          if (settings.maintenanceMode) {
            qMaint.style.display = 'inline-block';
            qNormal.style.display = 'none';
          } else {
            qMaint.style.display = 'none';
            qNormal.style.display = 'inline-block';
          }
        }
      }
    })
    .catch(err => console.error("Error loading settings:", err));
}

function saveStoreSettings(event) {
  event.preventDefault();
  const maintenanceMode = document.getElementById('settingMaintenance').checked;
  const whatsappPhone = document.getElementById('settingWhatsapp').value.trim();
  const instagramUrl = document.getElementById('settingInstagram').value.trim();
  const baseRateConsole = parseFloat(document.getElementById('settingRateConsole').value);
  const baseRatePC = parseFloat(document.getElementById('settingRatePC').value);

  const payload = { maintenanceMode, whatsappPhone, instagramUrl, baseRateConsole, baseRatePC };

  fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("تم حفظ إعدادات المتجر بالكامل بنجاح!");
        loadQuickStats();
        loadAdminLogs();
      } else {
        alert("حدث خطأ أثناء حفظ الإعدادات.");
      }
    })
    .catch(err => alert("فشل الاتصال بالسيرفر لحفظ الإعدادات."));
}

// Toggle maintenance mode checkbox directly
function toggleMaintenanceModeDirectly() {
  const checked = document.getElementById('settingMaintenance').checked;
  
  fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      const settings = data.settings || {};
      const payload = {
        maintenanceMode: checked,
        whatsappPhone: settings.whatsappPhone || "966500000000",
        instagramUrl: settings.instagramUrl || "https://instagram.com/Trivela",
        baseRateConsole: settings.baseRateConsole || 2.80,
        baseRatePC: settings.baseRatePC || 2.40
      };

      return fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadQuickStats();
        loadAdminLogs();
        alert(checked ? "تم تفعيل وضع الصيانة بنجاح!" : "تم إلغاء تفعيل وضع الصيانة.");
      } else {
        alert("حدث خطأ أثناء تبديل وضع الصيانة.");
        document.getElementById('settingMaintenance').checked = !checked;
      }
    })
    .catch(err => {
      console.error("Error setting maintenance mode:", err);
      alert("فشل الاتصال بالسيرفر.");
      document.getElementById('settingMaintenance').checked = !checked;
    });
}

// Load Admin Logs list
function loadAdminLogs() {
  fetch('/api/admin/logs')
    .then(res => res.json())
    .then(data => {
      // Also render a subset on dashboard quick logs
      renderQuickAdminLogs(data);
      
      // Update admin operations count badge on dashboard
      const opCount = document.getElementById('statAdminOperationsCount');
      if (opCount) opCount.textContent = data.length.toLocaleString();

      const container = document.getElementById('logsListContainer');
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = '<div class="log-item">No logs registered.</div>';
        return;
      }
      
      container.innerHTML = data.map(log => {
        const dateStr = new Date(log.timestamp).toLocaleString('ar-EG');
        return `
          <div class="log-item">
            <span class="log-time">[${dateStr}]</span> 
            <span class="log-action">&lt;${log.action}&gt;</span> 
            <span class="log-msg">${log.message}</span>
          </div>
        `;
      }).join('');
    })
    .catch(err => console.error("Error loading logs:", err));
}

// Load Orders and Complete
function loadOrdersList() {
  fetch('/api/admin/orders')
    .then(res => res.json())
    .then(data => {
      adminActiveOrders = data;
      renderOrdersList(data);
      
      // Update total orders counter in dashboard
      const oCount = document.getElementById('statTotalOrdersCount');
      if (oCount) oCount.textContent = data.length.toLocaleString();
      
      renderDashboardChart();
      renderTopServicesBreakdown();
    })
    .catch(err => console.error("Error loading orders:", err));
}

function renderOrdersList(orders) {
  // Dashboard mini-table (top 5 pending)
  const miniTbody = document.getElementById('dashboardOrdersTableBody');
  if (miniTbody) {
    const pendingOrders = (orders || []).filter(o => o.status === 'pending').slice(0, 5);
    if (pendingOrders.length === 0) {
      miniTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-gray);padding:20px;font-weight:700;">🎉 لا توجد طلبات معلقة!</td></tr>';
    } else {
      miniTbody.innerHTML = pendingOrders.map(o => {
        const dateStr = new Date(o.timestamp).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        return `<tr>
            <td style="font-family:Montserrat,sans-serif;font-weight:700;font-size:0.85rem;">#${o.id.substring(6, 14)}</td>
            <td style="font-weight:700;">${o.customerName}</td>
            <td>${o.service}</td>
            <td style="font-family:Montserrat,sans-serif;font-weight:700;color:#10b981;">${o.priceSAR} ر.س</td>
            <td style="font-size:0.8rem;color:var(--text-gray);">${dateStr}</td>
            <td><button class="admin-btn admin-btn-success" onclick="switchMainTab('store-products');" style="padding:4px 10px;font-size:0.75rem;margin:0;">عرض</button></td>
          </tr>`;
      }).join('');
    }
  }

  // Update filter counters
  const allOrders = orders || [];
  const counts = { all: allOrders.length, pending: 0, paid: 0, in_progress: 0, completed: 0, cancelled: 0 };
  allOrders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  ['all','pending','paid','in_progress','completed','cancelled'].forEach(k => {
    const el = document.getElementById('orderCount_' + k);
    if (el) el.textContent = counts[k];
  });

  // Main orders container
  const container = document.getElementById('ordersCardsContainer');
  if (!container) return;

  let filtered = allOrders;
  if (currentOrderFilter !== 'all') filtered = allOrders.filter(o => o.status === currentOrderFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-gray);"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:12px;color:var(--border-color);"></i><h3 style="margin:0 0 6px;">لا توجد طلبات</h3><p style="margin:0;font-size:0.88rem;">لا توجد طلبات مطابقة للفلتر المحدد.</p></div>';
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
          <div style="flex:1;"><label style="font-size:0.72rem;color:var(--text-gray);font-weight:700;display:block;margin-bottom:3px;">تكلفة المورد (ر.س)</label>
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
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#059669;font-weight:700;">المدفوع</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#047857;">${(o.amountPaid||o.priceSAR).toLocaleString()} ر.س</div></div>
        <div style="width:1px;background:#a7f3d0;"></div>
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#dc2626;font-weight:700;">المورد</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#ef4444;">${(o.supplierCost||0).toLocaleString()} ر.س</div></div>
        <div style="width:1px;background:#a7f3d0;"></div>
        <div style="flex:1;text-align:center;"><div style="font-size:0.7rem;color:#ca8a04;font-weight:700;">الربح</div><div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1rem;color:#ca8a04;">${profit.toLocaleString()} ر.س</div></div>
      </div>`;
    }

    return `<div style="background:var(--card-bg);border-radius:16px;border:1px solid rgba(0,0,0,0.05);padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:0.9rem;color:var(--text-dark);">#${shortId}</span>
          <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:800;display:flex;align-items:center;gap:4px;"><i class="${st.icon}" style="font-size:0.7rem;"></i> ${st.label}</span>
        </div>
        <span style="font-size:0.78rem;color:var(--text-gray);font-family:Montserrat,sans-serif;">${dateStr}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:16px;align-items:start;">
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">العميل</div><div style="font-weight:800;color:var(--text-dark);font-size:0.95rem;">${o.customerName}</div><div style="font-size:0.8rem;color:var(--text-gray);margin-top:2px;direction:ltr;text-align:right;">${o.customerPhone||'—'}</div></div>
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">الخدمة</div><div style="font-weight:800;color:var(--gold-primary);font-size:0.9rem;">${o.service}</div><div style="margin-top:4px;"><span style="background:${platformColor}15;color:${platformColor};padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:800;">${platformLabel}</span></div></div>
        <div><div style="font-size:0.7rem;color:var(--text-gray);font-weight:700;margin-bottom:3px;">السعر</div><div style="font-family:Montserrat,sans-serif;font-weight:900;color:#10b981;font-size:1.15rem;">${o.priceSAR.toLocaleString()} <span style="font-size:0.7rem;">ر.س</span></div>${o.couponCode?`<div style="font-size:0.72rem;color:#a855f7;font-weight:700;margin-top:2px;">🎟️ ${o.couponCode}</div>`:''}</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <button onclick="contactCustomerWhatsApp('${o.id}')" style="width:42px;height:42px;border-radius:50%;background:#25d366;color:#fff;border:0;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;" title="واتساب"><i class="fab fa-whatsapp"></i></button>
          <span style="font-size:0.6rem;color:var(--text-gray);">واتساب</span>
        </div>
      </div>
      ${creds}${actions}
    </div>`;
  }).join('');
}

// ── Order filter state ──
function setOrderFilter(filter, btn) {
  currentOrderFilter = filter;
  document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOrdersList(adminActiveOrders);
}

// ── Order Status Transitions ──
function updateOrderStatus(orderId, newStatus, extraData = {}) {
  fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, ...extraData })
  }).then(r => r.json()).then(data => {
    if (data.success) { loadOrdersList(); loadQuickStats(); loadAdminLogs(); }
    else alert(data.error || "فشل تحديث الحالة.");
  }).catch(() => alert("فشل الاتصال بالسيرفر."));
}

function confirmPayment(orderId, defaultAmount) {
  const amount = prompt('أدخل المبلغ الذي دفعه العميل (ر.س):', defaultAmount);
  if (amount === null) return;
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) { alert("مبلغ غير صحيح."); return; }
  updateOrderStatus(orderId, 'paid', { amountPaid: parsed });
}

function sendToSupplier(orderId) {
  const input = document.getElementById('supplier_cost_' + orderId);
  const cost = parseFloat(input?.value);
  if (isNaN(cost) || cost < 0) { alert("أدخل تكلفة المورد أولاً."); return; }
  updateOrderStatus(orderId, 'in_progress', { supplierCost: cost });
}

function markSupplierDone(orderId) {
  if (!confirm("هل أنت متأكد أن المورد أنهى هذا الطلب؟")) return;
  updateOrderStatus(orderId, 'completed');
}

function cancelOrder(orderId) {
  if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
  updateOrderStatus(orderId, 'cancelled');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    const t = document.createElement('div');
    t.textContent = '✅ تم النسخ!';
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 20px;border-radius:10px;font-family:Cairo,sans-serif;font-weight:700;font-size:0.85rem;z-index:99999;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }).catch(() => {});
}

function completeOrder(orderId) {
  const costInput = document.getElementById('cost_input_' + orderId);
  const costVal = parseFloat(costInput?.value);
  if (isNaN(costVal) || costVal < 0) { alert("أدخل تكلفة مورد صحيحة."); return; }
  fetch('/api/admin/orders/' + orderId + '/complete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierCost: costVal })
  }).then(r => r.json()).then(data => {
    if (data.success) { loadOrdersList(); loadQuickStats(); loadAdminLogs(); }
    else alert(data.error || "فشل إتمام الطلب.");
  }).catch(() => alert("خطأ بالاتصال."));
}



// Scraper Tab State
let activeScraperTab = 'sbc-player';

function switchAdminScraperTab(tabId) {
  activeScraperTab = tabId;

  // Toggle active state in buttons
  document.getElementById('subTabSbcPlayer')?.classList.toggle('active', tabId === 'sbc-player');
  document.getElementById('subTabSbcUpgrade')?.classList.toggle('active', tabId === 'sub-tab-sbc-upgrade');
  document.getElementById('subTabObjective')?.classList.toggle('active', tabId === 'objective');

  // Update card labels and inputs visibility
  const scraperTitle = document.getElementById('scraperCardTitle');
  const urlInputLabel = document.getElementById('lblScraperUrlInput');
  const urlInput = document.getElementById('futggUrl');
  const categorySelect = document.getElementById('categorySelect');
  const sbcSubCategoryGroup = document.getElementById('sbcSubCategoryGroup');
  const objectiveSubCategoryGroup = document.getElementById('objectiveSubCategoryGroup');
  const sbcSubCategory = document.getElementById('sbcSubCategory');
  
  const ratingPositionFields = document.getElementById('ratingPositionFields');
  const sbcMetaFields = document.getElementById('sbcMetaFields');
  const sbcCountField = document.getElementById('sbcCount');
  const sbcCountWrapper = document.getElementById('sbcCountWrapper');

  // Hide previewContainer initially upon tab switch to avoid mismatching previews
  const previewBox = document.getElementById('previewContainer');
  if (previewBox) previewBox.style.display = 'none';
  if (urlInput) urlInput.value = '';
  
  // Clear status messages
  const scrapeStatus = document.getElementById('scrapeStatus');
  if (scrapeStatus) {
    scrapeStatus.style.display = 'none';
    scrapeStatus.textContent = '';
  }

  if (tabId === 'sbc-player') {
    if (scraperTitle) scraperTitle.innerHTML = '<i class="fas fa-spider"></i> استخراج تحدي لاعب جديد من FUT.GG';
    if (urlInputLabel) urlInputLabel.textContent = 'رابط صفحة اللاعب على موقع FUT.GG';
    if (urlInput) urlInput.placeholder = 'https://www.fut.gg/players/231677-marcus-rashford/';
    if (categorySelect) categorySelect.value = 'sbc';
    if (sbcSubCategory) sbcSubCategory.value = 'players';
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'block';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'none';
    
    if (ratingPositionFields) ratingPositionFields.style.display = 'block';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (sbcCountWrapper) sbcCountWrapper.style.display = 'block';
    if (sbcCountField) sbcCountField.value = "3 تشكيلات";
  } 
  else if (tabId === 'sub-tab-sbc-upgrade') {
    if (scraperTitle) scraperTitle.innerHTML = '<i class="fas fa-rotate"></i> استخراج ترقية أو بكج SBC جديد من FUT.GG';
    if (urlInputLabel) urlInputLabel.textContent = 'رابط صفحة تحدي SBC على موقع FUT.GG';
    if (urlInput) urlInput.placeholder = 'https://www.fut.gg/sbc/83-double-upgrade/';
    if (categorySelect) categorySelect.value = 'sbc';
    if (sbcSubCategory) sbcSubCategory.value = 'upgrades';
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'block';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'none';
    
    if (ratingPositionFields) ratingPositionFields.style.display = 'none';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (sbcCountWrapper) sbcCountWrapper.style.display = 'block';
    if (sbcCountField) sbcCountField.value = "3 تشكيلات";
  } 
  else if (tabId === 'objective') {
    if (scraperTitle) scraperTitle.innerHTML = '<i class="fas fa-list-check"></i> استخراج مهمة (Objective) جديدة من FUT.GG';
    if (urlInputLabel) urlInputLabel.textContent = 'رابط صفحة المهمة على موقع FUT.GG';
    if (urlInput) urlInput.placeholder = 'https://www.fut.gg/objectives/europe-completionist/';
    if (categorySelect) categorySelect.value = 'objectives';
    if (sbcSubCategoryGroup) sbcSubCategoryGroup.style.display = 'none';
    if (objectiveSubCategoryGroup) objectiveSubCategoryGroup.style.display = 'block';
    
    if (ratingPositionFields) ratingPositionFields.style.display = 'none';
    if (sbcMetaFields) sbcMetaFields.style.display = 'grid';
    if (sbcCountWrapper) sbcCountWrapper.style.display = 'none';
    if (sbcCountField) sbcCountField.value = "";
  }
}

// Scrape Fut.gg player URL
function scrapePlayerLink() {
  const urlInput = document.getElementById('futggUrl');
  const url = urlInput.value.trim();
  const btn = document.getElementById('btnScrape');
  const spinner = document.getElementById('scrapeSpinner');
  const statusMsg = document.getElementById('scrapeStatus');
  const previewBox = document.getElementById('previewContainer');

  if (!url) {
    showStatus("يرجى إدخال رابط لاعب Fut.gg أولاً.", "error");
    return;
  }

  btn.disabled = true;
  spinner.style.display = 'inline-block';
  statusMsg.style.display = 'none';
  previewBox.style.display = 'none';

  fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || "فشل الاتصال بالسيرفر") });
      }
      return res.json();
    })
    .then(data => {
      scrapedPlayerData = data;
      
      document.getElementById('previewImg').src = data.image;
      document.getElementById('priceName').value = data.name;
      document.getElementById('previewRating').value = data.rating;
      document.getElementById('previewPosition').value = data.position;
      document.getElementById('previewVersion').value = data.version;

      if (activeScraperTab === 'objective') {
        document.getElementById('sbcCount').value = '';
        const catSelect = document.getElementById('categorySelect');
        if (catSelect) {
          catSelect.value = 'objectives';
          catSelect.dispatchEvent(new Event('change'));
        }
      } else if (activeScraperTab === 'sub-tab-sbc-upgrade') {
        document.getElementById('sbcCount').value = '3 تشكيلات';
        const catSelect = document.getElementById('categorySelect');
        if (catSelect) {
          catSelect.value = 'sbc';
          catSelect.dispatchEvent(new Event('change'));
        }
        document.getElementById('sbcSubCategory').value = 'upgrades';
      } else {
        document.getElementById('sbcCount').value = '3 تشكيلات';
        const catSelect = document.getElementById('categorySelect');
        if (catSelect) {
          catSelect.value = 'sbc';
          catSelect.dispatchEvent(new Event('change'));
        }
        if (data.sbcSubCategory) {
          const sbcSubSelect = document.getElementById('sbcSubCategory');
          if (sbcSubSelect) sbcSubSelect.value = data.sbcSubCategory;
        }
      }
      document.getElementById('expiryDays').value = data.expiryDays || 7;

      previewBox.style.display = 'grid';
      showStatus("تم استخراج البيانات بنجاح. حدد السعر والقسم للإضافة.", "success");
    })
    .catch(err => {
      showStatus(err.message, "error");
    })
    .finally(() => {
      btn.disabled = false;
      spinner.style.display = 'none';
    });
}

// Save player to Store
function savePlayerToStore() {
  if (!scrapedPlayerData) return;

  const editedName = document.getElementById('priceName').value.trim();
  const sbcCount = document.getElementById('sbcCount').value.trim();
  const expiryDays = parseFloat(document.getElementById('expiryDays').value);
  const priceSAR = parseFloat(document.getElementById('priceSAR').value);
  const priceUSD = parseFloat(document.getElementById('priceUSD').value);
  const pricePCSARInput = document.getElementById('pricePCSAR');
  const pricePCUSDInput = document.getElementById('pricePCUSD');
  const pricePCSAR = pricePCSARInput ? parseFloat(pricePCSARInput.value) : priceSAR;
  const pricePCUSD = pricePCUSDInput ? parseFloat(pricePCUSDInput.value) : priceUSD;
  const category = document.getElementById('categorySelect').value;

  let sbcSubCategory = null;
  if (category === 'sbc') {
    const sbcSubSelect = document.getElementById('sbcSubCategory');
    sbcSubCategory = sbcSubSelect ? sbcSubSelect.value : 'players';
  } else if (category === 'objectives') {
    const objSubSelect = document.getElementById('objectiveSubCategory');
    sbcSubCategory = objSubSelect ? objSubSelect.value : 'custom';
  }

  const ratingVal = parseInt(document.getElementById('previewRating').value, 10);
  const rating = isNaN(ratingVal) ? 90 : ratingVal;
  const position = document.getElementById('previewPosition').value.trim() || 'SBC';
  const version = document.getElementById('previewVersion').value.trim() || 'تحدي';

  if (!editedName) {
    showStatus("يرجى إدخال اسم اللاعب.", "error");
    return;
  }
  if (isNaN(priceSAR) || priceSAR <= 0 || isNaN(priceUSD) || priceUSD <= 0) {
    showStatus("يرجى إدخال أسعار صحيحة.", "error");
    return;
  }
  if (isNaN(pricePCSAR) || pricePCSAR <= 0 || isNaN(pricePCUSD) || pricePCUSD <= 0) {
    showStatus("يرجى إدخال أسعار بي سي صحيحة.", "error");
    return;
  }
  if (isNaN(expiryDays) || expiryDays <= 0) {
    showStatus("يرجى إدخال عدد أيام صلاحية صحيح.", "error");
    return;
  }

  const expirationDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const uniqueId = scrapedPlayerData.id + "_" + Date.now();

  const payload = {
    id: uniqueId,
    name: editedName,
    rating: rating,
    position: position,
    version: version,
    image: scrapedPlayerData.image,
    category: category,
    sbcSubCategory: sbcSubCategory,
    priceSAR: priceSAR,
    priceUSD: priceUSD,
    pricePCSAR: pricePCSAR,
    pricePCUSD: pricePCUSD,
    sbcCount: sbcCount,
    expirationDate: expirationDate
  };

  fetch('/api/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showStatus(`تمت إضافة اللاعب ${payload.name} إلى المتجر بنجاح!`, "success");
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('futggUrl').value = '';
        scrapedPlayerData = null;
        renderPlayersList(data.players);
        loadQuickStats();
        loadAdminLogs();
      } else {
        showStatus("فشل حفظ بيانات اللاعب.", "error");
      }
    })
    .catch(err => {
      showStatus("حدث خطأ أثناء الاتصال بالسيرفر لحفظ اللاعب.", "error");
    });
}

// Load currently active player list
function loadActivePlayers() {
  fetch('/api/players')
    .then(res => res.json())
    .then(data => {
      adminActivePlayers = data;
      renderPlayersList(data);
      populateBundlePlayerSelect();
    })
    .catch(err => {
      console.error("Error loading active players:", err);
    });
}

// Render players list
function renderPlayersList(players) {
  const tbody = document.getElementById('activePlayersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const catMap = {
    sbc: 'تحديات الـ SBC',
    objectives: 'المهام (Objectives)',
    rivals: 'الرايفلز (Rivals)',
    champions: 'فوت تشامبيون',
    packages: 'الباقات والعروض (Packages)',
    coaching: 'بناء التشكيلات والاستشارات'
  };

  if (!players || players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-gray);">لا توجد أي خدمات أو لاعبين مضافين حالياً.</td></tr>';
    return;
  }

  players.forEach(p => {
    let remainingText = 'دائم';
    if (p.expirationDate) {
      const diff = new Date(p.expirationDate).getTime() - Date.now();
      if (diff <= 0) {
        remainingText = '<span style="color:#ef4444; font-weight:700;">منتهي الصلاحية</span>';
      } else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        remainingText = `<span style="font-weight:700; color:#eab308;">${days} يوم و ${hours} ساعة</span>`;
      }
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${p.image}" class="table-img" alt="${p.name}"/></td>
      <td style="font-weight: 800; color: #ffffff;">${p.name}</td>
      <td style="font-family: Montserrat;">${p.rating}</td>
      <td><span style="font-weight: 700; color: var(--gold-primary);">${p.sbcCount || '—'}</span></td>
      <td>${remainingText}</td>
      <td><span style="font-weight: 700; color: var(--gold-primary);">${catMap[p.category] || p.category}</span></td>
      <td style="font-family: Montserrat; font-weight: 700; color: #10b981;">${p.priceSAR} ر.س</td>
      <td style="font-family: Montserrat; font-weight: 700; color: #10b981;">$${p.priceUSD}</td>
      <td>
        <button type="button" class="admin-btn admin-btn-danger" onclick="deletePlayer('${p.id}', '${p.category}')">
          <i class="fas fa-trash-can"></i> حذف
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Delete player
function deletePlayer(id, category) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الكارت من المتجر؟")) {
    return;
  }

  fetch(`/api/players/${id}?category=${category}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderPlayersList(data.players);
        loadQuickStats();
        loadAdminLogs();
      } else {
        alert("فشل حذف اللاعب من قاعدة البيانات.");
      }
    })
    .catch(err => {
      console.error("Error deleting player:", err);
      alert("حدث خطأ أثناء الاتصال بالسيرفر.");
    });
}

// Show Status alert
function showStatus(text, type) {
  const statusMsg = document.getElementById('scrapeStatus');
  if (statusMsg) {
    statusMsg.textContent = text;
    statusMsg.className = `status-msg ${type}`;
  }
}

// ==========================================
// CUSTOMER LOYALTY POINTS FUNCTIONS
// ==========================================

function loadAllUsers() {
  fetch('/api/admin/users')
    .then(res => res.json())
    .then(data => {
      allUsers = data;
      renderUsersList(allUsers);
      renderDashboardChart();
    })
    .catch(err => {
      console.error("Error loading users:", err);
    });
}

function renderUsersList(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);">لا يوجد عملاء مسجلون حالياً.</td></tr>';
    return;
  }

  users.forEach(u => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 800; color: #ffffff;">${u.name}</td>
      <td style="font-family: Montserrat;">${u.phone}</td>
      <td style="font-family: Montserrat; color: var(--text-gray);">${u.email}</td>
      <td><span class="points-tag" style="font-size: 0.95rem; font-family: Montserrat;">${u.points}</span></td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-start;">
          <input type="number" id="points_input_${u.id}" class="admin-input" placeholder="مثال: 50" style="width: 100px; padding: 6px 10px; margin: 0;"/>
          <button type="button" class="admin-btn admin-btn-success" onclick="modifyPoints('${u.id}', 'add')" style="padding: 7px 14px; font-size: 0.85rem;">
            <i class="fas fa-plus"></i> شحن
          </button>
          <button type="button" class="admin-btn" onclick="modifyPoints('${u.id}', 'deduct')" style="padding: 7px 14px; font-size: 0.85rem; background: var(--gold-primary); color: #000000;">
            <i class="fas fa-minus"></i> خصم
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterUsers() {
  const query = document.getElementById('userSearchInput').value.toLowerCase().trim();
  if (!query) {
    renderUsersList(allUsers);
    return;
  }
  const filtered = allUsers.filter(u => 
    u.name.toLowerCase().includes(query) || 
    u.phone.includes(query) || 
    u.email.toLowerCase().includes(query)
  );
  renderUsersList(filtered);
}

function modifyPoints(userId, action) {
  const input = document.getElementById(`points_input_${userId}`);
  const rawVal = parseFloat(input.value);

  if (isNaN(rawVal) || rawVal <= 0) {
    alert("يرجى إدخال قيمة نقاط صحيحة وموجبة.");
    return;
  }

  const change = Math.round(rawVal);
  const netChange = action === 'add' ? change : -change;

  const reason = prompt(action === 'add' ? "أدخل سبب إضافة النقاط (مثال: نقاط مكافأة شراء كوينز):" : "أدخل سبب خصم النقاط (مثال: استبدال بخصم الدفع):");
  if (reason === null) return; // cancelled

  fetch(`/api/admin/users/${userId}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points: netChange, reason: reason.trim() })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(action === 'add' ? `تم شحن ${change} نقاط للعميل بنجاح!` : `تم خصم ${change} نقاط من رصيد العميل بنجاح!`);
        loadAllUsers();
        loadQuickStats();
        loadAdminLogs();
      } else {
        alert(data.error || "فشل تعديل رصيد النقاط.");
      }
    })
    .catch(err => {
      console.error("Error modifying points:", err);
      alert("حدث خطأ أثناء الاتصال بالسيرفر.");
    });
}

// ==========================================
// FAQS MANAGEMENT FUNCTIONS
// ==========================================

function loadFAQs() {
  fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('faqsTableBody');
      if (!tbody) return;
      if (!data.faqs || data.faqs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-gray);">لا توجد أسئلة شائعة حالياً.</td></tr>';
        return;
      }
      
      tbody.innerHTML = data.faqs.map(f => `
        <tr>
          <td style="font-weight:bold; color:#ffffff;">${f.q}</td>
          <td>${f.a}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="admin-btn" onclick="editFAQ('${f.id}', '${escapeHtml(f.q)}', '${escapeHtml(f.a)}')" style="padding:6px 12px; font-size:0.8rem; background:#2563eb; color:#ffffff;"><i class="fas fa-edit"></i> تعديل</button>
              <button class="admin-btn admin-btn-danger" onclick="deleteFAQ('${f.id}')" style="padding:6px 12px; font-size:0.8rem;"><i class="fas fa-trash-can"></i> حذف</button>
            </div>
          </td>
        </tr>
      `).join('');
    })
    .catch(err => console.error("Error loading FAQs:", err));
}

function escapeHtml(text) {
  return text
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

function saveFAQ(event) {
  event.preventDefault();
  const id = document.getElementById('faqId').value;
  const q = document.getElementById('faqQuestion').value.trim();
  const a = document.getElementById('faqAnswer').value.trim();

  fetch('/api/admin/faqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id || undefined, q, a })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("تم حفظ السؤال الشائع بنجاح!");
        resetFAQForm();
        loadFAQs();
        loadAdminLogs();
      } else {
        alert("فشل حفظ السؤال.");
      }
    })
    .catch(err => console.error("Error saving FAQ:", err));
}

function editFAQ(id, q, a) {
  document.getElementById('faqId').value = id;
  document.getElementById('faqQuestion').value = q;
  document.getElementById('faqAnswer').value = a;
  
  document.getElementById('faqForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteFAQ(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا السؤال؟")) return;

  fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("تم حذف السؤال الشائع.");
        loadFAQs();
        loadAdminLogs();
      } else {
        alert("فشل حذف السؤال.");
      }
    })
    .catch(err => console.error("Error deleting FAQ:", err));
}

function resetFAQForm() {
  document.getElementById('faqId').value = '';
  document.getElementById('faqForm').reset();
}

// ==========================================
// REVIEWS MANAGEMENT FUNCTIONS
// ==========================================

function loadReviews() {
  fetch('/api/public/content')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('reviewsTableBody');
      if (!tbody) return;
      if (!data.reviews || data.reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);">لا توجد تقييمات حالياً.</td></tr>';
        return;
      }
      
      tbody.innerHTML = data.reviews.map(r => `
        <tr>
          <td style="font-weight:bold; color:#ffffff;">${r.name} ${r.badge ? `<span style="background:rgba(16,185,129,0.1); color:#10b981; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin-right:6px;">${r.badge}</span>` : ''}</td>
          <td><span style="font-family: Montserrat; font-size:0.8rem;">${r.platform}</span></td>
          <td style="color:#eab308;">${'★'.repeat(r.stars)}</td>
          <td><span style="font-size:0.8rem;">${r.text}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="admin-btn" onclick="editReview('${r.id}', '${escapeHtml(r.name)}', '${escapeHtml(r.platform)}', ${r.stars}, '${escapeHtml(r.text)}', '${escapeHtml(r.badge || '')}')" style="padding:6px 12px; font-size:0.8rem; background:#2563eb; color:#ffffff;"><i class="fas fa-edit"></i> تعديل</button>
              <button class="admin-btn admin-btn-danger" onclick="deleteReview('${r.id}')" style="padding:6px 12px; font-size:0.8rem;"><i class="fas fa-trash-can"></i> حذف</button>
            </div>
          </td>
        </tr>
      `).join('');
    })
    .catch(err => console.error("Error loading reviews:", err));
}

// Save Review
function saveReview(event) {
  event.preventDefault();
  const id = document.getElementById('reviewId').value;
  const name = document.getElementById('revName').value.trim();
  const platform = document.getElementById('revPlatform').value.trim();
  const stars = parseInt(document.getElementById('revStars').value, 10);
  const badge = document.getElementById('revBadge').value.trim();
  const text = document.getElementById('revText').value.trim();

  fetch('/api/admin/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id || undefined, name, platform, stars, badge, text })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("تم حفظ التقييم بنجاح!");
        resetReviewForm();
        loadReviews();
        loadAdminLogs();
      } else {
        alert("فشل حفظ التقييم.");
      }
    })
    .catch(err => console.error("Error saving review:", err));
}

function editReview(id, name, platform, stars, text, badge) {
  document.getElementById('reviewId').value = id;
  document.getElementById('revName').value = name;
  document.getElementById('revPlatform').value = platform;
  document.getElementById('revStars').value = stars;
  document.getElementById('revBadge').value = badge;
  document.getElementById('revText').value = text;
  
  document.getElementById('reviewForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteReview(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا التقييم؟")) return;

  fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("تم حذف التقييم.");
        loadReviews();
        loadAdminLogs();
      } else {
        alert("فشل حذف التقييم.");
      }
    })
    .catch(err => console.error("Error deleting review:", err));
}

function resetReviewForm() {
  document.getElementById('reviewId').value = '';
  document.getElementById('reviewForm').reset();
}

// Combo Bundle helper functions
function populateBundlePlayerSelect() {
  const select = document.getElementById('bundleSbcPlayerSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر لاعب SBC --</option>';
  
  // Filter active players for category 'sbc'
  const sbcs = adminActivePlayers.filter(p => p.category === 'sbc');
  sbcs.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (ريت ${p.rating}) - ${p.priceSAR} ر.س`;
    select.appendChild(opt);
  });
  
  calculateBundlePrices();
}

function calculateBundlePrices() {
  const select = document.getElementById('bundleSbcPlayerSelect');
  const coinsInput = document.getElementById('bundleCoinsAmount');
  const discountInput = document.getElementById('bundleDiscountPercent');
  
  if (!select || !coinsInput || !discountInput) return;
  
  const playerId = select.value;
  const coinsAmount = parseFloat(coinsInput.value) || 0;
  const discountPercent = parseFloat(discountInput.value) || 0;
  
  let playerPriceSAR = 0;
  let playerPcPriceSAR = 0;
  
  if (playerId) {
    const player = adminActivePlayers.find(p => p.id === playerId);
    if (player) {
      playerPriceSAR = player.priceSAR || 0;
      playerPcPriceSAR = player.pricePCSAR || playerPriceSAR;
    }
  }
  
  // 37.5 SAR per Million Console, 45 SAR per Million PC
  const coinsPriceConsole = (coinsAmount / 1000000) * 37.5;
  const coinsPricePc = (coinsAmount / 1000000) * 45;
  
  const originalTotalConsole = playerPriceSAR + coinsPriceConsole;
  const originalTotalPc = playerPcPriceSAR + coinsPricePc;
  
  const bundleConsole = Math.round(originalTotalConsole * (1 - discountPercent / 100));
  const bundlePc = Math.round(originalTotalPc * (1 - discountPercent / 100));
  
  document.getElementById('lblOriginalPlayerPrice').textContent = playerPriceSAR.toFixed(0);
  document.getElementById('lblOriginalCoinsPrice').textContent = coinsPriceConsole.toFixed(1);
  document.getElementById('lblOriginalTotalPrice').textContent = originalTotalConsole.toFixed(1);
  document.getElementById('lblBundleConsolePrice').textContent = bundleConsole;
  document.getElementById('lblBundlePcPrice').textContent = bundlePc;
}

function saveBundleToStore() {
  const select = document.getElementById('bundleSbcPlayerSelect');
  const coinsInput = document.getElementById('bundleCoinsAmount');
  const discountInput = document.getElementById('bundleDiscountPercent');
  const titleInput = document.getElementById('bundleTitle');
  
  if (!select || !coinsInput || !discountInput || !titleInput) return;
  
  const playerId = select.value;
  const coinsAmount = parseInt(coinsInput.value) || 0;
  const discountPercent = parseFloat(discountInput.value) || 0;
  const title = titleInput.value.trim();
  
  if (!playerId) {
    alert("الرجاء اختيار لاعب SBC أولاً.");
    return;
  }
  if (!title) {
    alert("الرجاء إدخال اسم باقة الدمج.");
    return;
  }
  
  const selectedPlayer = adminActivePlayers.find(p => p.id === playerId);
  if (!selectedPlayer) return;
  
  // Calculate final prices
  const coinsPriceConsole = (coinsAmount / 1000000) * 37.5;
  const coinsPricePc = (coinsAmount / 1000000) * 45;
  
  const originalTotalConsole = selectedPlayer.priceSAR + coinsPriceConsole;
  const originalTotalPc = (selectedPlayer.pricePCSAR || selectedPlayer.priceSAR) + coinsPricePc;
  
  const priceSAR = Math.round(originalTotalConsole * (1 - discountPercent / 100));
  const pricePCSAR = Math.round(originalTotalPc * (1 - discountPercent / 100));
  
  // USD prices calculated via 3.75 conversion rate
  const priceUSD = Math.round(priceSAR / 3.75);
  const pricePCUSD = Math.round(pricePCSAR / 3.75);
  
  const payload = {
    id: 'bundle_' + Date.now(),
    name: title,
    rating: selectedPlayer.rating,
    position: selectedPlayer.position || 'CM',
    version: `خصم ${discountPercent}% شامل كوينز`,
    image: selectedPlayer.image,
    category: 'packages',
    priceSAR: priceSAR,
    priceUSD: priceUSD,
    pricePCSAR: pricePCSAR,
    pricePCUSD: pricePCUSD,
    isBundle: true,
    coinsAmount: coinsAmount,
    bundlePlayerId: playerId,
    discountPercent: discountPercent,
    originalPriceSAR: Math.round(originalTotalConsole)
  };
  
  fetch('/api/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`تمت إضافة باقة الدمج "${title}" بنجاح!`);
        titleInput.value = '';
        coinsInput.value = '1000000';
        discountInput.value = '15';
        select.value = '';
        renderPlayersList(data.players);
        loadQuickStats();
        loadAdminLogs();
      } else {
        alert("فشل حفظ باقة الدمج.");
      }
    })
    .catch(err => {
      console.error("Error saving bundle:", err);
      alert("حدث خطأ أثناء حفظ باقة الدمج.");
    });
}

function contactCustomerWhatsApp(orderId) {
  const order = adminActiveOrders.find(o => o.id === orderId);
  if (!order) return;
  
  const cleanPhone = order.customerPhone.replace(/[^0-9+]/g, ''); // Keep plus sign if present
  if (!cleanPhone) {
    alert("رقم الهاتف غير متاح أو مكتوب بشكل غير صحيح.");
    return;
  }
  
  const shortId = order.id.substring(6, 14);
  const msg = `👋 مرحباً بك ${order.customerName}، معك الدعم الفني لمتجر Trivela 🎮\n\n` +
              `📦 لقد استلمنا طلبك بنجاح وبانتظار تأكيد الدفع للبدء بالعمل:\n` +
              `🆔 رقم الطلب: #${shortId}\n` +
              `🌟 الخدمة المطلوبة: ${order.service}\n` +
              `🕹️ المنصة: ${order.platform === 'pc' ? 'بي سي (PC)' : 'بلايستيشن واكس بوكس'}\n` +
              `💵 الإجمالي النهائي: ${order.priceSAR.toLocaleString()} ر.س\n\n` +
              `💳 يرجى تأكيد وسيلة الدفع المناسبة لك لنرسل لك رابط الفاتورة والبدء فوراً.`;
              
  window.open(`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Dashboard Metrics, Chart & Breakdown Renderers ──

function renderDashboardChart() {
  const chartSvg = document.getElementById('dashboardLineChart');
  const pathOrders = document.getElementById('chartPathOrders');
  const pathUsers = document.getElementById('chartPathUsers');
  const axisLabels = document.getElementById('chartAxisLabels');
  
  if (!chartSvg || !pathOrders || !pathUsers || !axisLabels) return;

  // Generate last 30 days ISO strings
  const dates = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Count orders per date
  const ordersCountMap = {};
  dates.forEach(dt => ordersCountMap[dt] = 0);
  (adminActiveOrders || []).forEach(o => {
    try {
      const dt = new Date(o.timestamp).toISOString().split('T')[0];
      if (ordersCountMap[dt] !== undefined) {
        ordersCountMap[dt]++;
      }
    } catch(e){}
  });

  // Count users registrations per date
  const usersCountMap = {};
  dates.forEach(dt => usersCountMap[dt] = 0);
  (allUsers || []).forEach(u => {
    if (u.createdAt) {
      try {
        const dt = new Date(u.createdAt).toISOString().split('T')[0];
        if (usersCountMap[dt] !== undefined) {
          usersCountMap[dt]++;
        }
      } catch(e){}
    }
  });

  // Find max value to scale chart (min scale is 5 to prevent flat lines)
  const maxVal = Math.max(...Object.values(ordersCountMap), ...Object.values(usersCountMap), 5);

  // Map points to SVG coordinates
  const pointsOrders = [];
  const pointsUsers = [];
  
  dates.forEach((dt, index) => {
    const x = (index / 29) * 980 + 10;
    const yOrders = 200 - (ordersCountMap[dt] / maxVal) * 150;
    const yUsers = 200 - (usersCountMap[dt] / maxVal) * 150;
    
    pointsOrders.push(`${x},${yOrders}`);
    pointsUsers.push(`${x},${yUsers}`);
  });

  // Set path strings
  pathOrders.setAttribute('d', `M ${pointsOrders.join(' L ')}`);
  pathUsers.setAttribute('d', `M ${pointsUsers.join(' L ')}`);

  // Render axis labels (MM-DD) for every 5th label
  let labelsHtml = '';
  dates.forEach((dt, index) => {
    if (index % 5 === 0 || index === 29) {
      const x = (index / 29) * 980 + 10;
      const displayDate = dt.substring(5);
      labelsHtml += `<text x="${x}" y="225" text-anchor="middle">${displayDate}</text>`;
    }
  });
  axisLabels.innerHTML = labelsHtml;
}

function renderTopServicesBreakdown() {
  const container = document.getElementById('topServicesList');
  if (!container) return;

  const counts = {
    'coins': 0,
    'sbc': 0,
    'objectives': 0,
    'rivals': 0,
    'champions': 0,
    'packages': 0,
    'coaching': 0
  };

  (adminActiveOrders || []).forEach(o => {
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
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:6px;">
          <span style="color:var(--text-dark);">${info.title}</span>
          <span style="color:var(--text-gray); font-family:Montserrat,sans-serif;">${count} طلب (${percent}%)</span>
        </div>
        <div style="width:100%; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
          <div style="width:${percent}%; height:100%; background:${info.color}; border-radius:4px; transition:width 0.5s ease;"></div>
        </div>
      </div>
    `;
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
          <div style="font-weight:700; color:var(--text-dark);">${l.message}</div>
          <div style="font-size:0.75rem; color:var(--text-gray); font-family:Montserrat,sans-serif;">${dateStr}</div>
        </div>
      </div>
    `;
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
    o.status === 'completed' ? 'مكتمل' : 'معلق',
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
