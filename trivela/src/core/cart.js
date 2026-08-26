/**
 * Trivela Unified Shopping Cart Engine & UI Drawer
 * Exclusively handles item accumulation, coupon application, customer details,
 * and Payment Method selection (PayTabs API vs WhatsApp Manual).
 */

(function () {
  const CART_STORAGE_KEY = 'trivela_cart';
  const WHATSAPP_PHONE = '962775585112';

  // Currency helper
  const CURRENCIES = {
    SAR: { symbol: 'ر.س', rate: 3.75, dec: 2 },
    USD: { symbol: '$', rate: 1, dec: 2 },
    AED: { symbol: 'د.إ', rate: 3.67, dec: 2 },
    KWD: { symbol: 'د.ك', rate: 0.307, dec: 3 },
    BHD: { symbol: 'د.ب', rate: 0.376, dec: 3 },
    QAR: { symbol: 'ر.ق', rate: 3.64, dec: 2 },
    OMR: { symbol: 'ر.ع', rate: 0.385, dec: 3 },
    JOD: { symbol: 'د.أ', rate: 0.709, dec: 3 },
    EGP: { symbol: 'ج.م', rate: 49.5, dec: 1 }
  };

  function getActiveCurrency() {
    const curCode = localStorage.getItem('trivela_currency') || 'SAR';
    return { code: curCode, ...(CURRENCIES[curCode] || CURRENCIES.SAR) };
  }

  function formatPrice(sarAmount) {
    const cur = getActiveCurrency();
    const converted = (sarAmount / 3.75) * cur.rate;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: cur.dec,
      maximumFractionDigits: cur.dec
    }).format(converted) + ' ' + cur.symbol;
  }

  // Cart State Manager
  class TrivelaCart {
    constructor() {
      this.items = this.loadCart();
      this.activeCoupon = null;
      this.selectedPaymentMethod = 'paytabs'; // 'paytabs' or 'whatsapp'
      this.isOpen = false;
      this.init();
    }

    loadCart() {
      try {
        const data = localStorage.getItem(CART_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('Failed to load cart from storage:', e);
        return [];
      }
    }

    saveCart() {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
        this.updateBadge();
        this.render();
      } catch (e) {
        console.error('Failed to save cart:', e);
      }
    }

    addItem(item) {
      // item: { service, type, platform, priceSAR, whatsappOnly, eaEmail, eaPassword, backupCodes, details, notes }
      const newItem = {
        id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        addedAt: new Date().toISOString(),
        service: item.service || 'خدمة Trivela',
        type: item.type || 'service',
        platform: item.platform || 'Console',
        priceSAR: parseFloat(item.priceSAR) || 0,
        whatsappOnly: !!item.whatsappOnly,
        eaEmail: item.eaEmail || '',
        eaPassword: item.eaPassword || '',
        backupCodes: item.backupCodes || [],
        clubName: item.clubName || '',
        details: item.details || '',
        notes: item.notes || ''
      };

      this.items.push(newItem);
      this.saveCart();
      this.showToast(`تمت إضافة "${newItem.service}" إلى السلة 🛒 — جاري تحويلك...`);

      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 150);
    }

    removeItem(id) {
      this.items = this.items.filter(i => i.id !== id);
      this.saveCart();
    }

    clearCart() {
      this.items = [];
      this.activeCoupon = null;
      this.saveCart();
    }

    getItemsCount() {
      return this.items.length;
    }

    isWhatsAppOnly() {
      return this.items.some(item => item.whatsappOnly === true);
    }

    getSubtotalSAR() {
      return this.items.reduce((sum, item) => sum + (item.priceSAR || 0), 0);
    }

    getDiscountSAR() {
      if (!this.activeCoupon) return 0;
      const subtotal = this.getSubtotalSAR();
      return (subtotal * (this.activeCoupon.percent / 100));
    }

    getTotalSAR() {
      return Math.max(0, this.getSubtotalSAR() - this.getDiscountSAR());
    }

    showToast(message) {
      let toast = document.getElementById('trivelaCartToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'trivelaCartToast';
        toast.className = 'trivela-cart-toast';
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    updateBadge() {
      const count = this.getItemsCount();
      const badges = document.querySelectorAll('.cart-badge-count');
      badges.forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    }

    init() {
      document.addEventListener('DOMContentLoaded', () => {
        this.injectUI();
        this.updateBadge();
      });
    }

    injectUI() {
      // Add Cart Link Button to Navbar Actions if exists
      const navActions = document.querySelector('.nav-actions');
      if (navActions && !document.getElementById('navCartBtn')) {
        const cartBtn = document.createElement('a');
        cartBtn.id = 'navCartBtn';
        cartBtn.href = 'cart.html';
        cartBtn.className = 'nav-cart-btn';
        cartBtn.setAttribute('title', 'سلة المشتريات');
        cartBtn.innerHTML = `
          <i class="fas fa-cart-shopping"></i>
          <span class="cart-badge-count" style="display: ${this.getItemsCount() > 0 ? 'inline-flex' : 'none'};">${this.getItemsCount()}</span>
        `;
        navActions.insertBefore(cartBtn, navActions.firstChild);
      }
    }


    render() {
      const drawer = document.getElementById('trivelaCartDrawer');
      if (!drawer) return;

      const count = this.getItemsCount();
      const isWAOnly = this.isWhatsAppOnly();

      // If cart is WhatsApp only, force selection to whatsapp
      if (isWAOnly) {
        this.selectedPaymentMethod = 'whatsapp';
      }

      const subtotalSAR = this.getSubtotalSAR();
      const discountSAR = this.getDiscountSAR();
      const totalSAR = this.getTotalSAR();

      // Pre-fill user data if logged in
      const loggedUserStr = localStorage.getItem('trivela_user');
      let defaultName = '';
      let defaultPhone = '';
      if (loggedUserStr) {
        try {
          const u = JSON.parse(loggedUserStr);
          defaultName = u.name || '';
          defaultPhone = u.phone || '';
        } catch (e) {}
      }

      let itemsHTML = '';
      if (count === 0) {
        itemsHTML = `
          <div class="cart-empty-state">
            <div class="cart-empty-icon"><i class="fas fa-cart-shopping"></i></div>
            <h4>سلة المشتريات فارغة</h4>
            <p>اختر خدماتك المفضلة من المتجر وأضفها إلى السلة لتنفيذها فوراً.</p>
            <button type="button" class="cart-empty-browse-btn" onclick="window.trivelaCart.close()">تصفح الخدمات الآن</button>
          </div>
        `;
      } else {
        itemsHTML = `
          <div class="cart-items-list">
            ${this.items.map((item, idx) => `
              <div class="cart-item-card">
                <div class="cart-item-info">
                  <div class="cart-item-header">
                    <strong class="cart-item-title">${item.service}</strong>
                    <button type="button" class="cart-item-remove" onclick="window.trivelaCart.removeItem('${item.id}')" title="حذف">
                      <i class="fas fa-trash-can"></i>
                    </button>
                  </div>
                  <div class="cart-item-meta">
                    <span class="cart-item-pill"><i class="fas fa-gamepad"></i> ${item.platform}</span>
                    ${item.whatsappOnly ? '<span class="cart-item-pill wa-tag"><i class="fab fa-whatsapp"></i> واتساب فقط</span>' : ''}
                    ${item.details ? `<span class="cart-item-pill detail-tag">${item.details}</span>` : ''}
                  </div>
                  <div class="cart-item-price">${formatPrice(item.priceSAR)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      drawer.innerHTML = `
        <div class="cart-drawer-header">
          <div class="cart-header-title">
            <i class="fas fa-shopping-bag"></i>
            <h3>سلة المشتريات</h3>
            <span class="cart-header-badge">${count} منتجات</span>
          </div>
          <button type="button" class="cart-close-btn" onclick="window.trivelaCart.close()">&times;</button>
        </div>

        <div class="cart-drawer-body">
          ${itemsHTML}

          ${count > 0 ? `
            <!-- COUPON SECTION -->
            <div class="cart-section-box">
              <div class="cart-coupon-input-wrap">
                <input type="text" id="cartCouponInput" placeholder="هل لديك كوبون خصم؟" value="${this.activeCoupon ? this.activeCoupon.code : ''}"/>
                <button type="button" onclick="window.trivelaCart.applyCouponCode()">تطبيق</button>
              </div>
              <div id="cartCouponMsg" class="cart-coupon-msg ${this.activeCoupon ? 'success' : ''}">
                ${this.activeCoupon ? `✅ تم تطبيق خصم ${this.activeCoupon.percent}% بنجاح!` : ''}
              </div>
            </div>

            <!-- CUSTOMER DETAILS -->
            <div class="cart-section-box">
              <h4 class="cart-section-title"><i class="fas fa-user-check"></i> بيانات التواصل وتأكيد الطلب</h4>
              <div class="cart-form-grid">
                <div class="cart-input-wrap">
                  <label>الاسم الكريم</label>
                  <input type="text" id="cartCustomerName" placeholder="أدخل اسمك" value="${defaultName}" required />
                </div>
                <div class="cart-input-wrap">
                  <label>رقم الواتساب</label>
                  <input type="tel" id="cartCustomerPhone" placeholder="0775585112 أو 962..." value="${defaultPhone}" required />
                </div>
              </div>
            </div>

            <!-- PAYMENT METHOD SELECTOR (STRICTLY IN CART) -->
            <div class="cart-section-box payment-cart-box">
              <h4 class="cart-section-title"><i class="fas fa-wallet"></i> اختيار طريقة الدفع</h4>
              
              ${isWAOnly ? `
                <div class="cart-wa-alert">
                  <i class="fas fa-triangle-exclamation"></i>
                  <span>يحتوي طلبك على خدمات (رايفلز / فوت / شحن ويب مقفل) تتطلب التنسيق اليدوي، لذلك الدفع متاح عبر الواتساب فقط.</span>
                </div>
              ` : ''}

              <div class="cart-payment-options">
                ${!isWAOnly ? `
                  <div class="cart-pay-card ${this.selectedPaymentMethod === 'paytabs' ? 'active' : ''}" onclick="window.trivelaCart.selectPayment('paytabs')">
                    <div class="cart-pay-radio">
                      <input type="radio" name="cartPayRadio" value="paytabs" ${this.selectedPaymentMethod === 'paytabs' ? 'checked' : ''} />
                    </div>
                    <div class="cart-pay-icon"><i class="fas fa-credit-card"></i></div>
                    <div class="cart-pay-text">
                      <strong>دفع إلكتروني فوري (PayTabs)</strong>
                      <span>مدى / فيزا / ماستركارد / Apple Pay</span>
                    </div>
                  </div>
                ` : ''}

                <div class="cart-pay-card ${this.selectedPaymentMethod === 'whatsapp' ? 'active' : ''}" onclick="window.trivelaCart.selectPayment('whatsapp')">
                  <div class="cart-pay-radio">
                    <input type="radio" name="cartPayRadio" value="whatsapp" ${this.selectedPaymentMethod === 'whatsapp' ? 'checked' : ''} />
                  </div>
                  <div class="cart-pay-icon wa-icon"><i class="fab fa-whatsapp"></i></div>
                  <div class="cart-pay-text">
                    <strong>دفع وتحويل بالواتساب</strong>
                    <span>كليك / زين كاش / تحويل بنكي / USDT</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUMMARY TOTALS -->
            <div class="cart-totals-box">
              <div class="cart-total-row">
                <span>المجموع الفرعي:</span>
                <strong>${formatPrice(subtotalSAR)}</strong>
              </div>
              ${this.activeCoupon ? `
                <div class="cart-total-row discount-row">
                  <span>خصم الكوبون (${this.activeCoupon.percent}%):</span>
                  <strong>-${formatPrice(discountSAR)}</strong>
                </div>
              ` : ''}
              <div class="cart-total-row grand-total">
                <span>الإجمالي النهائي:</span>
                <strong class="total-val">${formatPrice(totalSAR)}</strong>
              </div>
            </div>
          ` : ''}
        </div>

        ${count > 0 ? `
          <div class="cart-drawer-footer">
            <button type="button" class="cart-checkout-btn ${this.selectedPaymentMethod === 'whatsapp' ? 'wa-checkout' : 'paytabs-checkout'}" id="btnCartCheckout" onclick="window.trivelaCart.processCheckout()">
              <span>${this.selectedPaymentMethod === 'whatsapp' ? 'تأكيد الطلب والدفع بالواتساب' : 'إتمام الدفع الإلكتروني الآن (PayTabs)'}</span>
              <i class="${this.selectedPaymentMethod === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-lock'}"></i>
            </button>
          </div>
        ` : ''}
      `;
    }

    selectPayment(method) {
      if (this.isWhatsAppOnly() && method !== 'whatsapp') return;
      this.selectedPaymentMethod = method;
      this.render();
    }

    applyCouponCode() {
      const input = document.getElementById('cartCouponInput');
      if (!input) return;
      const code = input.value.trim().toUpperCase();
      if (!code) {
        this.activeCoupon = null;
        this.render();
        return;
      }

      fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.coupon) {
            this.activeCoupon = { code: data.coupon.code, percent: data.coupon.discount_percent || 10 };
            this.render();
          } else {
            if (code === 'TRIVELA10' || code === 'TRIVELA' || code === 'FUT27') {
              this.activeCoupon = { code: code, percent: 10 };
              this.render();
            } else {
              alert('عذراً، كود الكوبون غير صحيح أو منتهي الصلاحية.');
            }
          }
        })
        .catch(() => {
          if (code === 'TRIVELA10' || code === 'TRIVELA' || code === 'FUT27') {
            this.activeCoupon = { code: code, percent: 10 };
            this.render();
          } else {
            alert('عذراً، كود الكوبون غير صحيح.');
          }
        });
    }

    processCheckout() {
      if (this.items.length === 0) return;

      const nameInput = document.getElementById('cartCustomerName');
      const phoneInput = document.getElementById('cartCustomerPhone');
      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!name) {
        alert('يرجى إدخال الاسم الكريم لتأكيد طلبك.');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!phone) {
        alert('يرجى إدخال رقم الواتساب للتواصل وتأكيد الطلب.');
        if (phoneInput) phoneInput.focus();
        return;
      }

      const checkoutBtn = document.getElementById('btnCartCheckout');
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<span>جاري معالجة الطلب...</span> <i class="fas fa-spinner fa-spin"></i>`;
      }

      const finalPriceSAR = this.getTotalSAR();
      const servicesList = this.items.map(i => `${i.service} (${i.platform})`).join(' + ');

      // Collect primary credentials if available
      const primaryItemWithEA = this.items.find(i => i.eaEmail);
      const eaEmail = primaryItemWithEA ? primaryItemWithEA.eaEmail : '';
      const eaPassword = primaryItemWithEA ? primaryItemWithEA.eaPassword : '';
      const backupCodes = primaryItemWithEA ? (primaryItemWithEA.backupCodes || []) : [];

      const orderPayload = {
        customerName: name,
        customerPhone: phone,
        service: `سلة المشتريات [${this.items.length}]: ${servicesList}`,
        platform: this.items[0]?.platform || 'Console',
        priceSAR: finalPriceSAR,
        couponCode: this.activeCoupon ? this.activeCoupon.code : null,
        paymentMethod: this.selectedPaymentMethod,
        eaEmail: eaEmail,
        eaPassword: eaPassword,
        backupCode1: backupCodes[0] || '—',
        backupCode2: backupCodes[1] || '—',
        backupCode3: backupCodes[2] || '—',
        cartItems: this.items
      };

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          const orderId = data.order.id;

          if (this.selectedPaymentMethod === 'paytabs' && data.paymentUrl) {
            this.clearCart();
            window.location.href = data.paymentUrl;
            return;
          }

          // WhatsApp Flow
          const formattedPrice = formatPrice(finalPriceSAR);
          const msg = `🛒 طلب سلة جديد من متجر Trivela\n\n` +
                      `🆔 رقم الطلب: #${orderId}\n` +
                      `📝 الاسم: ${name}\n` +
                      `📞 الواتساب: ${phone}\n` +
                      `📦 المنتجات:\n${this.items.map((it, idx) => `  ${idx + 1}. ${it.service} (${formatPrice(it.priceSAR)})`).join('\n')}\n\n` +
                      `💵 الإجمالي النهائي: ${formattedPrice}\n\n` +
                      `_أرسل من Trivela.com_`;

          this.clearCart();
          this.close();

          const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank');

          // Redirect to tracking page
          window.location.href = `track.html?orderId=${orderId}`;
        } else {
          alert(data.error || 'حدث خطأ أثناء تسجيل طلبك.');
          if (checkoutBtn) {
            checkoutBtn.disabled = false;
            this.render();
          }
        }
      })
      .catch(err => {
        console.error('Cart checkout error:', err);
        alert('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.');
        if (checkoutBtn) {
          checkoutBtn.disabled = false;
          this.render();
        }
      });
    }
  }

  // Expose global instance
  window.trivelaCart = new TrivelaCart();
})();
