// Customer Order Tracking System logic
let currentTrackedOrderId = '';
let trackEventSource = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check URL parameters for automatic tracking (e.g. track.html?order=order_123 or track.html?orderId=order_123)
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order') || params.get('id') || params.get('orderId');
  const paymentStatus = params.get('payment_status') || params.get('payment');

  if (paymentStatus && (paymentStatus.includes('success') || paymentStatus === 'paytabs_success')) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 20px; border-radius: 16px; margin: 20px auto; max-width: 800px; text-align: center; font-weight: 800; font-family: Cairo, sans-serif; box-shadow: 0 8px 24px rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem;';
    banner.innerHTML = '<i class="fas fa-circle-check" style="font-size: 1.4rem;"></i> <span>تم استلام وتأكيد دفعتك الإلكترونية بنجاح عبر PayTabs! طلبك الآن مؤكد وجارٍ تنفيذه فوراً.</span>';
    const mainContent = document.querySelector('.tracking-container') || document.body;
    mainContent.insertBefore(banner, mainContent.firstChild);
  }

  if (orderId) {
    const input = document.getElementById('orderIdSearch');
    if (input) input.value = orderId;
    trackOrder(orderId);
  }


  // Logged-in orders dropdown loader
  const token = localStorage.getItem('trivela_token');
  if (token) {
    const guestPrompt = document.getElementById('guestLoginPrompt');
    const myOrdersBox = document.getElementById('loggedInUserOrders');
    const selectEl = document.getElementById('userOrdersSelect');
    
    if (guestPrompt) guestPrompt.style.display = 'none';
    if (myOrdersBox) myOrdersBox.style.display = 'block';

    const statusMap = {
      'pending': 'بانتظار الدفع',
      'paid': 'تم الدفع وتوجيه المورد',
      'in_progress': 'قيد الشحن',
      'completed': 'مكتمل ✅',
      'cancelled': 'ملغي ❌'
    };

    fetch('/api/orders/my-orders', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(orders => {
      if (orders && orders.length > 0) {
        orders.forEach(o => {
          const shortId = o.id.length > 8 ? o.id.substring(o.id.length - 8) : o.id;
          const statusText = o.credentialsError ? 'خطأ ببيانات الدخول ⚠️' : (statusMap[o.status] || o.status);
          const option = document.createElement('option');
          option.value = o.id;
          option.textContent = `#${shortId} — ${o.service} [${statusText}]`;
          selectEl.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'لا توجد طلبات سابقة مسجلة بحسابك.';
        selectEl.appendChild(option);
      }
    })
    .catch(err => {
      console.error("Failed to load user orders:", err);
    });
  }
});

window.onUserOrderSelectChange = function(select) {
  const orderId = select.value;
  if (orderId) {
    document.getElementById('orderIdSearch').value = orderId;
    trackOrder(orderId);
  }
};

window.trackOrderSubmit = function() {
  const orderId = document.getElementById('orderIdSearch').value.trim();
  if (!orderId) {
    alert("يرجى إدخال رقم الطلب أو رقم الجوال أولاً.");
    return;
  }
  trackOrder(orderId);
};

function trackOrder(orderId) {
  currentTrackedOrderId = orderId;

  // Setup Server-Sent Events (SSE) for real-time tracking updates
  if (trackEventSource) {
    trackEventSource.close();
  }
  trackEventSource = new EventSource(`/api/common/live-updates?orderId=${orderId}`);
  trackEventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'order_update' && data.orderId === orderId) {
        console.log("⚡ Real-time order update received:", data.order);
        const o = data.order;
        
        // Dynamic UI Updates
        updateStepper(o.status, o.credentialsError, o.consoleActiveError);
        
        const consoleBox = document.getElementById('consoleActiveBox');
        if (consoleBox) {
          consoleBox.style.display = o.consoleActiveError ? 'block' : 'none';
        }

        const corrBox = document.getElementById('correctionBox');
        const corrSony = document.getElementById('correctionSonyFields');
        const corrEa = document.getElementById('correctionEaFields');

        if (o.credentialsError) {
          corrBox.style.display = 'block';
          corrSony.style.display = o.sonyEmailMasked ? 'block' : 'none';
          corrEa.style.display = o.eaEmailMasked ? 'block' : 'none';
          document.getElementById('corrSonyBackup1').required = !!o.sonyEmailMasked;
          document.getElementById('corrEaBackup1').required = !!o.eaEmailMasked;
        } else {
          corrBox.style.display = 'none';
        }
      }
    } catch (err) {
      console.error("Error parsing SSE data:", err);
    }
  };
  
  fetch(`/api/orders/track/${orderId}`)
    .then(res => {
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    })
    .then(order => {
      // Display panel
      document.getElementById('trackingResultPanel').style.display = 'block';
      
      // Basic info
      document.getElementById('txtOrderHeaderId').textContent = `طلب #${order.id.substring(6, 14)}`;
      document.getElementById('valCustomerName').textContent = order.customerName;
      document.getElementById('valService').textContent = order.service;
      document.getElementById('valPlatform').textContent = order.platform;
      
      // Formatting price
      const cur = getActiveCurrency();
      const rate = getCurrencyRate(cur);
      const convertedPrice = order.priceSAR / 3.75 * rate;
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: cur.dec,
        maximumFractionDigits: cur.dec
      }).format(convertedPrice) + ' ' + cur.symbol;
      document.getElementById('valPrice').textContent = formatted;

      // Account Masked display
      let accountDisplay = '—';
      if (order.eaEmailMasked && order.sonyEmailMasked) {
        accountDisplay = `سوني: ${order.sonyEmailMasked} / EA: ${order.eaEmailMasked}`;
      } else if (order.eaEmailMasked) {
        accountDisplay = `EA: ${order.eaEmailMasked}`;
      } else if (order.sonyEmailMasked) {
        accountDisplay = `سوني: ${order.sonyEmailMasked}`;
      }
      document.getElementById('valAccountMasked').textContent = accountDisplay;

      // Stepper & Status Badge
      updateStepper(order.status, order.credentialsError, order.consoleActiveError);

      // Console Active Alert Box Logic
      const consoleBox = document.getElementById('consoleActiveBox');
      if (consoleBox) {
        consoleBox.style.display = order.consoleActiveError ? 'block' : 'none';
      }

      // Correction Box Logic
      const corrBox = document.getElementById('correctionBox');
      const corrSony = document.getElementById('correctionSonyFields');
      const corrEa = document.getElementById('correctionEaFields');

      if (order.credentialsError) {
        corrBox.style.display = 'block';
        corrSony.style.display = order.sonyEmailMasked ? 'block' : 'none';
        corrEa.style.display = order.eaEmailMasked ? 'block' : 'none';
        
        // Mark fields as required if visible
        document.getElementById('corrSonyBackup1').required = !!order.sonyEmailMasked;
        document.getElementById('corrEaBackup1').required = !!order.eaEmailMasked;
      } else {
        corrBox.style.display = 'none';
      }
    })
    .catch(err => {
      alert("الطلب غير موجود. يرجى التحقق من الرقم والمحاولة مرة أخرى.");
      document.getElementById('trackingResultPanel').style.display = 'none';
    });
}

function updateStepper(status, hasCredentialsError, hasConsoleActiveError) {
  const steps = ['pending', 'paid', 'in_progress', 'completed'];
  const statusLabels = {
    'pending': 'بانتظار الدفع',
    'paid': 'تم الدفع',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'cancelled': 'ملغي'
  };

  const badge = document.getElementById('txtOrderStatusBadge');
  const infoMsg = document.getElementById('txtStatusInfoMessage');
  const progress = document.getElementById('stepperProgressBar');

  // Update Status Badge text & styling
  badge.textContent = statusLabels[status] || status;
  badge.className = 'status-badge-generic';
  
  if (status === 'completed') {
    badge.style.background = '#d1fae5';
    badge.style.color = '#10b981';
  } else if (status === 'cancelled') {
    badge.style.background = '#fef2f2';
    badge.style.color = '#ef4444';
  } else if (status === 'in_progress') {
    badge.style.background = '#f3e8ff';
    badge.style.color = '#a855f7';
  } else {
    badge.style.background = '#f1f5f9';
    badge.style.color = '#64748b';
  }

  if (hasCredentialsError) {
    badge.textContent = 'خطأ بالأكواد ⚠️';
    badge.style.background = '#fef2f2';
    badge.style.color = '#ef4444';
  } else if (hasConsoleActiveError) {
    badge.textContent = 'متصل باللعبة 🎮⚠️';
    badge.style.background = '#fffbeb';
    badge.style.color = '#d97706';
  }

  // Update Stepper Elements
  let activeIndex = steps.indexOf(status);
  if (status === 'cancelled') activeIndex = -1;

  steps.forEach((step, idx) => {
    const el = document.getElementById('step-' + step);
    if (!el) return;

    el.classList.remove('active', 'completed');
    if (idx < activeIndex) {
      el.classList.add('completed');
    } else if (idx === activeIndex) {
      el.classList.add('active');
    }
  });

  // Progress Bar Width
  if (activeIndex === -1) {
    progress.style.width = '0%';
  } else {
    progress.style.width = (activeIndex / (steps.length - 1) * 100) + '%';
  }

  // Info message mapping
  if (hasCredentialsError) {
    infoMsg.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> <strong>يرجى تصحيح الأكواد:</strong> هناك مشكلة في بيانات الدخول، يرجى ملء النموذج أدناه فوراً.`;
    infoMsg.style.background = '#fef2f2';
    infoMsg.style.color = '#991b1b';
  } else {
    infoMsg.style.background = '#f1f5f9';
    infoMsg.style.color = '#475569';
    
    switch (status) {
      case 'pending':
        infoMsg.textContent = 'نحن بانتظار إتمام الدفع الإلكتروني لطلبك. في حال واجهتك أي مشكلة في الدفع، يمكنك التواصل مع الدعم الفني.';
        break;
      case 'paid':
        infoMsg.textContent = 'تم تأكيد الدفع الإلكتروني بنجاح! طلبك الآن في قائمة التنفيذ وجاري البدء فيه فوراً.';
        break;
      case 'in_progress':
        infoMsg.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <strong>الطلب قيد التنفيذ حالياً:</strong> يقوم المورد بشحن الكوينز أو إنهاء المهام. ⚠️ <strong>تنبيه هام:</strong> يرجى عدم تسجيل الدخول لحسابك حتى يكتمل الطلب.`;
        break;
      case 'completed':
        infoMsg.textContent = 'مبروك! تم شحن وإكمال طلبك بالكامل بنجاح. يمكنك الآن الدخول وتغيير كلمة مرور حسابك لزيادة الأمان.';
        break;
      case 'cancelled':
        infoMsg.textContent = 'تم إلغاء هذا الطلب من قبل الإدارة. يرجى مراجعة الدعم الفني لمزيد من المعلومات.';
        break;
      default:
        infoMsg.textContent = '';
    }
  }
}

window.submitCorrectionForm = function(event) {
  event.preventDefault();

  const payload = {};
  
  const sony1 = document.getElementById('corrSonyBackup1');
  const sony2 = document.getElementById('corrSonyBackup2');
  const sony3 = document.getElementById('corrSonyBackup3');
  
  if (sony1 && sony1.required) {
    payload.sonyBackupCode1 = sony1.value.trim();
    payload.sonyBackupCode2 = sony2.value.trim() || '—';
    payload.sonyBackupCode3 = sony3.value.trim() || '—';
  }

  const ea1 = document.getElementById('corrEaBackup1');
  const ea2 = document.getElementById('corrEaBackup2');
  const ea3 = document.getElementById('corrEaBackup3');
  
  if (ea1 && ea1.required) {
    payload.backupCode1 = ea1.value.trim();
    payload.backupCode2 = ea2.value.trim() || '—';
    payload.backupCode3 = ea3.value.trim() || '—';
  }

  fetch(`/api/orders/track/${currentTrackedOrderId}/update-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert("تم تحديث وحفظ الأكواد الجديدة بنجاح! تم تنبيه المورد للبدء بالعمل.");
        trackOrder(currentTrackedOrderId);
      } else {
        alert("فشل تحديث البيانات: " + data.error);
      }
    })
    .catch(() => alert("فشل الاتصال بالسيرفر."));
};

// Helper Currency getters
function getActiveCurrency() {
  const picker = document.getElementById('currencySelect');
  if (!picker) return { code: "SAR", symbol: "ر.س", dec: 0 };
  const code = picker.value;
  const config = {
    "SAR": { symbol: "ر.س", dec: 0 },
    "USD": { symbol: "$", dec: 2 },
    "AED": { symbol: "د.إ", dec: 0 },
    "KWD": { symbol: "د.ك", dec: 2 },
    "BHD": { symbol: "د.ب", dec: 2 },
    "QAR": { symbol: "ر.ق", dec: 0 },
    "OMR": { symbol: "ر.ع.", dec: 2 },
    "JOD": { symbol: "د.أ", dec: 2 },
    "EGP": { symbol: "ج.م", dec: 0 }
  };
  return { code, ...config[code] };
}

function getCurrencyRate(cur) {
  if (cur.code === 'SAR') return 1;
  const dbSettings = window.settings || { conversionRates: {} };
  const rates = dbSettings.conversionRates || {
    "USD": 0.266,
    "AED": 0.98,
    "KWD": 0.082,
    "BHD": 0.10,
    "QAR": 0.97,
    "OMR": 0.10,
    "JOD": 0.19,
    "EGP": 12.30
  };
  return rates[cur.code] || 1;
}

window.confirmConsoleLogout = function() {
  if (!currentTrackedOrderId) return;
  fetch(`/api/orders/track/${currentTrackedOrderId}/console-logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert("✅ تم تأكيد خروجك من اللعبة وإرسال التنبيه للمورد للبدء فوراً.");
      trackOrder(currentTrackedOrderId);
    } else {
      alert("فشل إرسال التنبيه: " + data.error);
    }
  })
  .catch(() => alert("فشل الاتصال بالسيرفر."));
};
