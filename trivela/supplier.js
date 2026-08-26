// Supplier Dashboard Controller logic
let supplierToken = localStorage.getItem('supplierToken') || '';
let supplierName = localStorage.getItem('supplierName') || '';
let supplierId = localStorage.getItem('supplierId') || '';
let currentTab = 'active'; // 'active' or 'completed'
let supplierOrders = [];
let autoRefreshInterval = null;
let supplierEventSource = null;

function setupSupplierSSE() {
  if (!supplierToken) return;
  if (supplierEventSource) {
    supplierEventSource.close();
  }
  supplierEventSource = new EventSource(`/api/common/live-updates?supplierToken=${supplierToken}`);
  supplierEventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'order_update') {
        console.log("⚡ SSE: Order updated, reloading supplier orders list...", data.orderId);
        loadSupplierOrders();
      }
    } catch (err) {
      console.error("Error processing supplier SSE update:", err);
    }
  };
  supplierEventSource.onerror = function() {
    console.log("Supplier SSE disconnected. Retrying...");
  };
}

document.addEventListener('DOMContentLoaded', () => {
  checkSupplierAuth();
  initPWAAndPush();
});

window.handleSupplierLogin = function(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('suppUsername');
  const passwordInput = document.getElementById('suppPassword');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  fetch('/api/supplier/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(r => {
      if (!r.ok) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
      return r.json();
    })
    .then(data => {
      if (data.success) {
        localStorage.setItem('supplierToken', data.token);
        localStorage.setItem('supplierName', data.supplier.name);
        localStorage.setItem('supplierId', data.supplier.id);
        
        supplierToken = data.token;
        supplierName = data.supplier.name;
        supplierId = data.supplier.id;

        usernameInput.value = '';
        passwordInput.value = '';

        checkSupplierAuth();

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            setupPushSubscription(registration);
          }).catch(err => console.error("SW ready state failed:", err));
        }
      }
    })
    .catch(err => {
      alert(err.message || "فشل تسجيل الدخول.");
    });
};

window.handleSupplierLogout = function() {
  localStorage.removeItem('supplierToken');
  localStorage.removeItem('supplierName');
  localStorage.removeItem('supplierId');
  supplierToken = '';
  supplierName = '';
  supplierId = '';

  if (supplierEventSource) {
    supplierEventSource.close();
    supplierEventSource = null;
  }
  
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  const chk = document.getElementById('chkAutoRefresh');
  if (chk) chk.checked = false;

  document.getElementById('supplierLoginPanel').style.display = 'block';
  document.getElementById('supplierPortalPanel').style.display = 'none';
};

function checkSupplierAuth() {
  if (supplierToken) {
    document.getElementById('supplierLoginPanel').style.display = 'none';
    document.getElementById('supplierPortalPanel').style.display = 'block';
    document.getElementById('txtSupplierWelcome').textContent = `مرحباً، ${supplierName} (مورد)`;
    loadSupplierProfile();
    loadSupplierOrders();
    setupSupplierSSE();
  } else {
    document.getElementById('supplierLoginPanel').style.display = 'block';
    document.getElementById('supplierPortalPanel').style.display = 'none';
  }
}

function loadSupplierProfile() {
  fetch('/api/supplier/profile', {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  })
  .then(res => res.json())
  .then(profile => {
    document.getElementById('pricingConsoleInput').value = profile.pricePerMillionConsole || '';
    document.getElementById('pricingPcInput').value = profile.pricePerMillionPC || '';
  })
  .catch(err => console.error("Error loading supplier profile:", err));
}

window.saveSupplierPricing = function() {
  const priceConsole = parseFloat(document.getElementById('pricingConsoleInput').value) || 0;
  const pricePC = parseFloat(document.getElementById('pricingPcInput').value) || 0;

  fetch('/api/supplier/pricing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplierToken}`
    },
    body: JSON.stringify({ priceConsole, pricePC })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const alertEl = document.getElementById('pricingUpdateAlert');
      if (alertEl) {
        alertEl.style.display = 'block';
        setTimeout(() => {
          alertEl.style.display = 'none';
        }, 3000);
      }
    } else {
      alert("فشل حفظ الأسعار: " + (data.error || "خطأ غير معروف"));
    }
  })
  .catch(err => {
    console.error("Error saving pricing:", err);
    alert("فشل الاتصال بالسيرفر لحفظ الأسعار.");
  });
};

window.switchSupplierTab = function(tab) {
  currentTab = tab;
  document.getElementById('btnActiveTab').classList.toggle('active', tab === 'active');
  document.getElementById('btnCompletedTab').classList.toggle('active', tab === 'completed');
  renderSupplierOrders();
};

function loadSupplierOrders() {
  fetch('/api/supplier/orders', {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  })
    .then(r => {
      if (r.status === 401 || r.status === 403) {
        handleSupplierLogout();
        throw new Error("Session expired");
      }
      return r.json();
    })
    .then(data => {
      supplierOrders = data;
      updateSupplierStats();
      renderSupplierOrders();
    })
    .catch(err => {
      console.error("Error loading supplier orders:", err);
    });
}

function updateSupplierStats() {
  let totalEarningsSAR = 0;
  let completedCount = 0;
  let activeCount = 0;

  supplierOrders.forEach(o => {
    if (o.status === 'completed') {
      completedCount++;
      totalEarningsSAR += (o.supplierCost || 0);
    } else if (o.status === 'paid' || o.status === 'in_progress') {
      activeCount++;
    }
  });

  const totalEarningsUSD = totalEarningsSAR / 3.75;

  const earningsEl = document.getElementById('statTotalEarnings');
  const completedEl = document.getElementById('statCompletedCount');
  const activeEl = document.getElementById('statActiveCount');

  if (earningsEl) {
    earningsEl.innerHTML = `$${totalEarningsUSD.toFixed(2)} <span style="font-size: 0.8rem; font-family: Cairo; color: #64748b;">(${totalEarningsSAR.toFixed(0)} ر.س)</span>`;
  }
  if (completedEl) completedEl.textContent = completedCount;
  if (activeEl) activeEl.textContent = activeCount;
}

window.onSearchOrFilterChange = function() {
  renderSupplierOrders();
};

window.onDateFilterSelectChange = function() {
  const dateSelect = document.getElementById('dateFilterSelect');
  const customContainer = document.getElementById('customDateRangeContainer');
  
  if (dateSelect && customContainer) {
    if (dateSelect.value === 'custom') {
      customContainer.style.display = 'block';
    } else {
      customContainer.style.display = 'none';
      // Clear custom date inputs
      document.getElementById('dateStartInput').value = '';
      document.getElementById('dateEndInput').value = '';
    }
  }
  renderSupplierOrders();
};

window.toggleAutoRefresh = function(chk) {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  
  if (chk.checked) {
    autoRefreshInterval = setInterval(() => {
      loadSupplierOrders();
    }, 60000); // 60 seconds
  }
};

function renderSupplierOrders() {
  const container = document.getElementById('supplierOrdersListContainer');
  if (!container) return;

  // 1. Filter by tab
  let filtered = [];
  if (currentTab === 'active') {
    filtered = supplierOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  } else {
    filtered = supplierOrders.filter(o => o.status === 'completed');
  }

  // 2. Filter by search input
  const searchInput = document.getElementById('supplierSearchInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  if (query) {
    filtered = filtered.filter(o => {
      const shortId = o.id.substring(6, 14).toLowerCase();
      const service = (o.service || '').toLowerCase();
      const platform = (o.platform || '').toLowerCase();
      return shortId.includes(query) || service.includes(query) || platform.includes(query);
    });
  }

  // 3. Filter by platform dropdown
  const platformFilter = document.getElementById('platformFilterSelect');
  const platformVal = platformFilter ? platformFilter.value : 'all';
  if (platformVal !== 'all') {
    filtered = filtered.filter(o => {
      const isConsole = o.platform && (o.platform.includes('Console') || o.platform.includes('سوني') || o.platform.includes('PlayStation'));
      if (platformVal === 'console') return isConsole;
      if (platformVal === 'pc') return !isConsole;
      return true;
    });
  }

  // 4. Filter by Date range
  const dateSelect = document.getElementById('dateFilterSelect');
  const dateVal = dateSelect ? dateSelect.value : 'all';
  if (dateVal !== 'all') {
    const now = new Date();
    let startLimit = null;
    let endLimit = null;
    
    if (dateVal === 'today') {
      startLimit = new Date();
      startLimit.setHours(0,0,0,0);
    } else if (dateVal === 'yesterday') {
      startLimit = new Date();
      startLimit.setDate(startLimit.getDate() - 1);
      startLimit.setHours(0,0,0,0);
      
      endLimit = new Date();
      endLimit.setDate(endLimit.getDate() - 1);
      endLimit.setHours(23,59,59,999);
    } else if (dateVal === 'week') {
      startLimit = new Date();
      startLimit.setDate(startLimit.getDate() - 7);
      startLimit.setHours(0,0,0,0);
    } else if (dateVal === 'month') {
      startLimit = new Date();
      startLimit.setDate(startLimit.getDate() - 30);
      startLimit.setHours(0,0,0,0);
    } else if (dateVal === 'custom') {
      const startVal = document.getElementById('dateStartInput').value;
      const endVal = document.getElementById('dateEndInput').value;
      if (startVal) {
        startLimit = new Date(startVal);
        startLimit.setHours(0,0,0,0);
      }
      if (endVal) {
        endLimit = new Date(endVal);
        endLimit.setHours(23,59,59,999);
      }
    }
    
    filtered = filtered.filter(o => {
      const orderDate = new Date(o.timestamp);
      if (startLimit && orderDate < startLimit) return false;
      if (endLimit && orderDate > endLimit) return false;
      return true;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-family:Cairo;">لا توجد طلبات تطابق معايير البحث والفرز حالياً.</div>`;
    return;
  }

  container.innerHTML = filtered.map(o => {
    const shortId = o.id.substring(6, 14);
    const dateStr = new Date(o.timestamp).toLocaleString('ar-SA');
    
    // Status label mapping
    const statusMap = {
      'pending': { label: 'معلق بانتظار الدفع', color: '#cbd5e1' },
      'paid': { label: 'مدفوع - جاهز للبدء', color: '#3b82f6' },
      'in_progress': { label: 'قيد التنفيذ والشحن', color: '#a855f7' },
      'completed': { label: 'مكتمل بنجاح', color: '#10b981' }
    };
    const currentStatus = statusMap[o.status] || { label: o.status, color: '#94a3b8' };

    // Platform label
    const isConsole = o.platform && (o.platform.includes('Console') || o.platform.includes('سوني') || o.platform.includes('PlayStation'));
    const platformLabel = isConsole ? 'سوني / اكس بوكس (Console)' : 'بي سي (PC)';

    // Predefined admin notes block
    const adminNotesHtml = o.orderNotes ? `
      <div style="background: rgba(217, 158, 43, 0.08); border: 1px solid rgba(217, 158, 43, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 12px; color: #ffd76a; font-size: 0.8rem; font-family: Cairo; text-align: right;">
        <i class="fas fa-file-invoice"></i> <strong>ملاحظات العميل / الإدارة:</strong> ${o.orderNotes}
      </div>` : '';

    // Credentials HTML
    let credentialsHtml = '';
    if (o.status !== 'completed') {
      const eaEmailRow = o.eaEmail ? `
        <div class="creds-row">
          <span>ايميل EA: <strong>${o.eaEmail}</strong></span>
          <button class="copy-btn" onclick="copyToClipboard('${o.eaEmail}', this)">نسخ</button>
        </div>` : '';
      const eaPasswordRow = o.eaPassword ? `
        <div class="creds-row">
          <span>كلمة مرور EA: <strong id="pass_ea_${o.id}" data-password="${o.eaPassword}" style="-webkit-text-security: disc; letter-spacing: 2px;">••••••••</strong></span>
          <div style="display: flex; gap: 6px;">
            <button class="copy-btn" onclick="togglePasswordVisibility('pass_ea_${o.id}', this)" title="عرض كلمة المرور"><i class="fas fa-eye"></i></button>
            <button class="copy-btn" onclick="copyToClipboard('${o.eaPassword}', this)">نسخ</button>
          </div>
        </div>` : '';
      
      // Clickable to strike backup codes
      const eaBackupRow = o.backupCode1 ? `
        <div class="creds-row" style="flex-wrap: wrap; gap: 8px;">
          <span>رموز EA الاحتياطية (انقر للتشطيب):</span>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.backupCode1}</span>
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.backupCode2}</span>
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.backupCode3}</span>
          </div>
          <button class="copy-btn" onclick="copyToClipboard('${o.backupCode1} ${o.backupCode2} ${o.backupCode3}', this)" style="margin-right: auto;">نسخ الكل</button>
        </div>` : '';

      const sonyEmailRow = o.sonyEmail ? `
        <div class="creds-row">
          <span>ايميل سوني (PSN): <strong>${o.sonyEmail}</strong></span>
          <button class="copy-btn" onclick="copyToClipboard('${o.sonyEmail}', this)">نسخ</button>
        </div>` : '';
      const sonyPasswordRow = o.sonyPassword ? `
        <div class="creds-row">
          <span>كلمة مرور سوني: <strong id="pass_sony_${o.id}" data-password="${o.sonyPassword}" style="-webkit-text-security: disc; letter-spacing: 2px;">••••••••</strong></span>
          <div style="display: flex; gap: 6px;">
            <button class="copy-btn" onclick="togglePasswordVisibility('pass_sony_${o.id}', this)" title="عرض كلمة المرور"><i class="fas fa-eye"></i></button>
            <button class="copy-btn" onclick="copyToClipboard('${o.sonyPassword}', this)">نسخ</button>
          </div>
        </div>` : '';
      
      const sonyBackupRow = o.sonyBackupCode1 ? `
        <div class="creds-row" style="flex-wrap: wrap; gap: 8px;">
          <span>رموز سوني الاحتياطية (انقر للتشطيب):</span>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.sonyBackupCode1}</span>
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.sonyBackupCode2}</span>
            <span class="code-badge" onclick="this.classList.toggle('strike-through')" title="انقر للتشطيب">${o.sonyBackupCode3}</span>
          </div>
          <button class="copy-btn" onclick="copyToClipboard('${o.sonyBackupCode1} ${o.sonyBackupCode2} ${o.sonyBackupCode3}', this)" style="margin-right: auto;">نسخ الكل</button>
        </div>` : '';

      credentialsHtml = `
        <div class="creds-box">
          <h5 style="font-family: Cairo; font-weight: bold; margin-top: 0; margin-bottom: 10px; color:#c084fc; font-size: 0.8rem;"><i class="fas fa-key"></i> بيانات الدخول للحساب:</h5>
          ${sonyEmailRow}
          ${sonyPasswordRow}
          ${sonyBackupRow}
          ${eaEmailRow}
          ${eaPasswordRow}
          ${eaBackupRow}
        </div>
      `;
    }

    // Credentials / Console Error Indicator
    let errorWarning = '';
    if (o.credentialsError) {
      errorWarning = `
        <div style="background: rgba(239, 68, 68, 0.06); border: 1px solid #ef4444; border-radius: 8px; padding: 10px; margin-bottom: 15px; color: #b91c1c; font-size: 0.82rem; font-family: Cairo; text-align: right;">
          <i class="fas fa-exclamation-triangle"></i> لقد أبلغت عن خطأ في الأكواد. ننتظر حالياً قيام العميل بتصحيحها من صفحة التتبع الخاصة به.
        </div>`;
    } else if (o.consoleActiveError) {
      errorWarning = `
        <div style="background: rgba(234, 179, 8, 0.06); border: 1px solid #eab308; border-radius: 8px; padding: 10px; margin-bottom: 15px; color: #b45309; font-size: 0.82rem; font-family: Cairo; text-align: right;">
          <i class="fas fa-gamepad"></i> لقد أبلغت أن العميل متصل باللعبة. ننتظر حالياً قيام العميل بالخروج وتأكيد ذلك من صفحة التتبع الخاصة به.
        </div>`;
    }

    // Actions block
    let actionsHtml = '';
    if (o.status === 'paid') {
      actionsHtml = `
        <button onclick="startProcessingOrder('${o.id}')" class="supplier-btn" style="background: linear-gradient(135deg, #10b981, #059669); margin-top: 15px;">
          <i class="fas fa-play"></i> بدء العمل والشحن الآن
        </button>
      `;
    } else if (o.status === 'in_progress') {
      // Get predefined cost in USD to display to supplier as reference
      const costUSD = o.supplierCost ? (o.supplierCost / 3.75).toFixed(2) : '0.00';
      
      actionsHtml = `
        <div style="margin-top: 20px; border-top: 1px solid var(--supplier-border); padding-top: 15px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: Cairo; font-size: 0.82rem; color: #cbd5e1;">💰 التكلفة المحددة لك لهذا الطلب:</span>
            <strong style="font-family: Montserrat; font-size: 1rem; color: #10b981;">$${costUSD}</strong>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 5px;">ملاحظات المورد</label>
            <input type="text" id="supp_notes_${o.id}" class="supplier-input" placeholder="اكتب أي ملاحظات إضافية هنا..." style="margin: 0;" value="${o.supplierNotes || ''}" />
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="reportConsoleActive('${o.id}')" class="supplier-btn" style="background: #eab308; flex: 1; min-width: 130px;">
              <i class="fas fa-gamepad"></i> العميل داخل اللعبة
            </button>
            <button onclick="reportCredentialsError('${o.id}')" class="supplier-btn" style="background: #ef4444; flex: 0.8; min-width: 110px;">
              <i class="fas fa-exclamation-triangle"></i> خطأ بالأكواد
            </button>
            <button onclick="completeOrderSubmit('${o.id}')" class="supplier-btn" style="background: linear-gradient(135deg, #10b981, #059669); flex: 1.2; min-width: 140px;">
              <i class="fas fa-circle-check"></i> تم الشحن بنجاح
            </button>
          </div>
        </div>
      `;
    } else if (o.status === 'completed') {
      const costUSD = o.supplierCost ? (o.supplierCost / 3.75).toFixed(2) : '0.00';
      actionsHtml = `
        <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 10px; text-align: center; color: #34d399; font-weight: bold; font-size: 0.85rem; font-family: Cairo;">
            <i class="fas fa-circle-check"></i> تم إكمال الطلب وتسليمه للعميل بنجاح.
          </div>
          <div style="font-size: 0.75rem; text-align: left; color: #94a3b8; font-family: Cairo; padding-left: 5px;">
            التكلفة المسجلة: $${costUSD}
          </div>
        </div>
      `;
    }

    return `
      <div class="supplier-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <span style="font-family: Montserrat; font-weight: 900; font-size: 1rem; color: #fff;">#${shortId}</span>
            <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:#cbd5e1; padding:3px 10px; border-radius:12px; margin-right:8px; font-family:Cairo; font-weight:700;">${o.service}</span>
          </div>
          <span style="font-family: Cairo; font-weight: 800; font-size: 0.78rem; padding: 4px 12px; border-radius: 20px; background: ${currentStatus.color}20; color: ${currentStatus.color};">
            ${currentStatus.label}
          </span>
        </div>

        <div style="font-size: 0.8rem; color: #94a3b8; font-family: Montserrat; margin-bottom: 12px;">
          <i class="fas fa-clock"></i> ${dateStr} | المنصة: ${platformLabel}
        </div>

        ${adminNotesHtml}
        ${errorWarning}
        ${credentialsHtml}
        ${actionsHtml}
      </div>
    `;
  }).join('');
}

window.copyToClipboard = function(text, btn) {
  navigator.clipboard.writeText(text)
    .then(() => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> تم نسخها';
      btn.style.background = 'rgba(16, 185, 129, 0.2)';
      btn.style.color = '#34d399';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.background = '';
        btn.style.color = '';
      }, 1500);
    })
    .catch(() => {
      alert("فشل نسخ النص.");
    });
};

window.togglePasswordVisibility = function(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isHidden = el.style.webkitTextSecurity === 'disc';
  if (isHidden) {
    el.style.webkitTextSecurity = 'none';
    el.style.letterSpacing = 'normal';
    el.textContent = el.getAttribute('data-password');
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    el.style.webkitTextSecurity = 'disc';
    el.style.letterSpacing = '2px';
    el.textContent = '••••••••';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
};

window.startProcessingOrder = function(orderId) {
  fetch(`/api/supplier/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplierToken}`
    },
    body: JSON.stringify({ status: 'in_progress' })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadSupplierOrders();
      } else {
        alert(data.error || "فشل بدء الطلب.");
      }
    })
    .catch(() => alert("فشل الاتصال بالسيرفر."));
};

window.reportCredentialsError = function(orderId) {
  if (!confirm("هل أنت متأكد من الإبلاغ عن خطأ بالأكواد؟ سيتم إشعار العميل فوراً لتصحيحها.")) return;

  fetch(`/api/supplier/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplierToken}`
    },
    body: JSON.stringify({ credentialsError: true })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadSupplierOrders();
      } else {
        alert(data.error || "فشل إرسال التنبيه.");
      }
    })
    .catch(() => alert("فشل الاتصال بالسيرفر."));
};

window.completeOrderSubmit = function(orderId) {
  const notesInput = document.getElementById('supp_notes_' + orderId);
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!confirm("هل أنت متأكد من إكمال الطلب وتسليمه للعميل؟")) return;

  fetch(`/api/supplier/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplierToken}`
    },
    body: JSON.stringify({
      status: 'completed',
      credentialsError: false,
      supplierNotes: notes
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert("✅ تم إكمال الطلب بنجاح!");
        loadSupplierOrders();
      } else {
        alert(data.error || "فشل إكمال الطلب.");
      }
    })
    .catch(() => alert("فشل الاتصال بالسيرفر."));
};

window.reportConsoleActive = function(orderId) {
  if (!confirm("هل أنت متأكد من الإبلاغ عن تواجد العميل داخل اللعبة؟ سيتم إخطاره تلقائياً بالخروج.")) return;

  fetch(`/api/supplier/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supplierToken}`
    },
    body: JSON.stringify({ consoleActiveError: true })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadSupplierOrders();
      } else {
        alert(data.error || "فشل إرسال التنبيه.");
      }
    })
    .catch(() => alert("فشل الاتصال بالسيرفر."));
};

let deferredPrompt = null;

function initPWAAndPush() {
  // 1. Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        // If supplier is already logged in, setup push subscription
        if (supplierToken) {
          setupPushSubscription(registration);
        }
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  }

  // 2. Handle PWA Installation Prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.addEventListener('click', () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choiceResult => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
          } else {
            console.log('User dismissed the PWA install prompt');
          }
          deferredPrompt = null;
        });
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA app installed successfully');
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) installBtn.style.display = 'none';
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function setupPushSubscription(registration) {
  // If API pushManager is not supported, abort
  if (!('pushManager' in registration)) {
    console.warn('Push manager not supported in this browser');
    return;
  }

  // Request notifications permission if default
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        registerSubscription(registration);
      }
    });
  } else if (Notification.permission === 'granted') {
    registerSubscription(registration);
  } else {
    console.warn('Notification permission is denied');
  }
}

function registerSubscription(registration) {
  fetch('/api/supplier/vapid-public-key')
    .then(r => r.json())
    .then(data => {
      const publicKey = data.publicKey;
      const convertedKey = urlBase64ToUint8Array(publicKey);
      
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    })
    .then(subscription => {
      return fetch('/api/supplier/subscribe-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supplierToken}`
        },
        body: JSON.stringify({ subscription })
      });
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        console.log('Web Push Subscription successfully registered on server!');
      }
    })
    .catch(err => {
      console.error('Failed to subscribe to Web Push:', err);
    });
}
