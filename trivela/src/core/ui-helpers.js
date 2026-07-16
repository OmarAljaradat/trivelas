import { CURRENCIES } from './config.js';

export function applyExchangeRates(customRates) {
  if (!customRates) return;
  for (const code in customRates) {
    if (CURRENCIES[code] && !isNaN(parseFloat(customRates[code]))) {
      CURRENCIES[code].rate = parseFloat(customRates[code]);
    }
  }
}

export function getExpiryInfo(expirationDate) {
  if (!expirationDate) return null;
  const diff = new Date(expirationDate).getTime() - Date.now();
  if (diff <= 0) return { label: 'منتهي', urgent: true };

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) {
    return { label: `${days} يوم`, urgent: false };
  }
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours >= 1) {
    return { label: `${hours} ساعة`, urgent: true };
  }
  const mins = Math.floor(diff / (60 * 1000));
  return { label: `${mins} دقيقة`, urgent: true };
}

export function formatPriceConverted(priceSAR, priceUSD, selectedCurrency) {
  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.SAR;
  let finalPrice = priceSAR;
  if (selectedCurrency !== 'SAR') {
    finalPrice = priceUSD * cur.rate;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cur.dec,
    maximumFractionDigits: cur.dec
  }).format(finalPrice);
  return `${formatted} ${cur.symbol}`;
}

export function showOrderSuccessPopup(orderId, whatsappPhone, messageText) {
  let overlay = document.getElementById('orderSuccessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'orderSuccessOverlay';
    overlay.className = 'order-success-overlay';
    document.body.appendChild(overlay);
  }

  // Parse details from messageText
  let customerName = 'غير محدد';
  let serviceName = 'شحن كوينز / خدمة FC 27';
  let platform = 'CONSOLE';
  let priceStr = '0.00 ر.س';

  try {
    const lines = messageText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('الاسم:')) {
        customerName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('المنصة:')) {
        platform = trimmed.split(':')[1].trim().toUpperCase();
      } else if (trimmed.includes('الكمية:')) {
        serviceName = 'شحن كوينز: ' + trimmed.split(':')[1].trim();
      } else if (trimmed.includes('المهام المطلوبة:')) {
        serviceName = 'مهام: ' + trimmed.split(':')[1].trim();
      } else if (trimmed.includes('الخدمة المطلوبة:')) {
        serviceName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('التحدي المطلوبة:')) {
        serviceName = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('الباقة:')) {
        serviceName = 'باقة: ' + trimmed.split(':')[1].trim();
      } else if (trimmed.includes('إجمالي السعر المتوقع:') || trimmed.includes('السعر الإجمالي:') || trimmed.includes('إجمالي السعر:')) {
        priceStr = trimmed.split(':')[1].trim();
      }
    });
  } catch (err) {
    console.warn("Error parsing messageText:", err);
  }

  overlay.innerHTML = `
    <div class="order-success-card receipt-style">
      <div class="receipt-header">
        <img src="logo-official.png" class="receipt-logo" alt="Trivela" />
        <h3 class="receipt-title">سند استلام إلكتروني</h3>
        <p class="receipt-subtitle">متجر تريفيلا — متجر خدمات FIFA 27 المعتمد</p>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <span class="label">رقم الطلب:</span>
          <span class="value" style="font-family: 'Montserrat', sans-serif; font-weight: 800;">#${orderId}</span>
        </div>
        <div class="receipt-row">
          <span class="label">العميل:</span>
          <span class="value">${customerName}</span>
        </div>
        <div class="receipt-row">
          <span class="label">الخدمة:</span>
          <span class="value" style="max-width: 250px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${serviceName}</span>
        </div>
        <div class="receipt-row">
          <span class="label">المنصة:</span>
          <span class="value" style="font-family: 'Montserrat', sans-serif; font-weight: 700;">${platform}</span>
        </div>
        <div class="receipt-row">
          <span class="label">تاريخ الطلب:</span>
          <span class="value">${new Date().toLocaleDateString('ar-SA')}</span>
        </div>
        <div class="receipt-row total">
          <span class="label">المبلغ الإجمالي:</span>
          <span class="value">${priceStr}</span>
        </div>
      </div>
      
      <div class="receipt-footer-msg">
        <i class="fas fa-info-circle"></i>
        تم تسجيل طلبك بنجاح في النظام. يرجى الانتظار، وسيقوم أحد ممثلي الدعم الفني بالتواصل معك قريباً على رقم الجوال/الواتساب لتأكيد الدفع وإتمام الطلب.
      </div>
      
      <button type="button" class="order-success-btn" id="btnRedirectWhatsapp" style="width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px;">
        <span>حسناً، بانتظاركم</span>
      </button>
      
      <div class="receipt-bottom-decoration"></div>
    </div>
  `;

  overlay.classList.add('open');

  const btn = document.getElementById('btnRedirectWhatsapp');
  if (btn) {
    btn.onclick = () => {
      showPostOrderReviewForm(overlay, customerName, platform);
    };
  }
}

function showPostOrderReviewForm(overlay, customerName, platform) {
  overlay.innerHTML = `
    <div class="order-success-card receipt-style review-popup-card" style="animation: scaleUp 0.4s ease both;">
      <div class="receipt-header">
        <div style="width: 60px; height: 60px; background: rgba(236,72,153,0.1); color: #ec4899; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.8rem; animation: heartbeat 1.5s infinite;">
          <i class="fas fa-heart"></i>
        </div>
        <h3 class="receipt-title">رأيك يسعدنا ويهمنا!</h3>
        <p class="receipt-subtitle">كيف كانت تجربتك في الطلب من متجر تريفيلا؟</p>
      </div>

      <form id="postOrderReviewForm" style="margin-top: 20px; text-align: right;">
        <div class="admin-form-group" style="text-align: center; margin-bottom: 20px;">
          <label style="font-weight: 700; color: var(--blue-700); display: block; margin-bottom: 12px; font-size: 0.95rem;">اسحب أو انقر لتحديد التقييم بالنجوم:</label>
          <div class="interactive-stars" id="interactiveStars" style="display: inline-flex; gap: 10px; font-size: 2.3rem; cursor: pointer; direction: ltr;">
            <i class="far fa-star star-item" data-value="1" style="transition: all 0.15s ease;"></i>
            <i class="far fa-star star-item" data-value="2" style="transition: all 0.15s ease;"></i>
            <i class="far fa-star star-item" data-value="3" style="transition: all 0.15s ease;"></i>
            <i class="far fa-star star-item" data-value="4" style="transition: all 0.15s ease;"></i>
            <i class="far fa-star star-item" data-value="5" style="transition: all 0.15s ease;"></i>
          </div>
          <div id="starRatingLabel" style="font-weight: 700; color: #ca8a04; margin-top: 10px; font-size: 1rem; min-height: 24px;">اختر تقييمك</div>
          <input type="hidden" id="reviewStarsInput" value="5" />
        </div>

        <div class="admin-form-group">
          <label for="postReviewText" style="font-weight: 700; color: var(--blue-700); display: block; margin-bottom: 8px; font-size: 0.9rem;">اكتب تجربتك بالتفصيل (سرعة الشحن، الدعم، إلخ):</label>
          <textarea id="postReviewText" class="admin-input" rows="3" required placeholder="مثال: الخدمة سريعة جداً والدعم متعاون وسأكرر التجربة..." style="width: 100%; border: 2.5px solid var(--blue-100); border-radius: 12px; padding: 12px; font-family: Cairo, sans-serif; resize: none; font-size: 0.9rem; line-height: 1.6;"></textarea>
        </div>

        <button type="submit" class="order-success-btn" style="width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px; margin-top: 15px; border: none; background: linear-gradient(135deg, var(--blue-500) 0%, var(--blue-700) 100%); color: #fff; padding: 14px 20px; font-size: 1rem; border-radius: 12px; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.25s ease;">
          <span>إرسال التقييم للمراجعة</span>
          <i class="fas fa-paper-plane"></i>
        </button>

        <button type="button" id="skipReviewBtn" style="width: 100%; background: none; border: none; color: var(--text-gray); font-family: Cairo, sans-serif; font-weight: 700; font-size: 0.9rem; margin-top: 15px; cursor: pointer; text-decoration: underline;">
          تخطي التقييم والعودة للرئيسية
        </button>
      </form>
    </div>
  `;

  // Bind interactive stars behavior
  const starsContainer = document.getElementById('interactiveStars');
  const ratingInput = document.getElementById('reviewStarsInput');
  const ratingLabel = document.getElementById('starRatingLabel');
  const starItems = Array.from(starsContainer.querySelectorAll('.star-item'));

  const ratingTexts = {
    1: 'سيئ جداً 😞',
    2: 'مقبول 😐',
    3: 'جيد 🙂',
    4: 'ممتاز وعجبني 😄',
    5: 'أسطوري وسريع جداً! 😍'
  };

  function updateStarsUI(val) {
    ratingInput.value = val;
    ratingLabel.textContent = ratingTexts[val] || '';
    starItems.forEach((star, idx) => {
      if (idx < val) {
        star.className = 'fas fa-star star-item';
        star.style.color = '#eab308';
        star.style.transform = 'scale(1.15)';
      } else {
        star.className = 'far fa-star star-item';
        star.style.color = '#cbd5e1';
        star.style.transform = 'scale(1)';
      }
    });
  }

  // Pre-fill 5 stars
  updateStarsUI(5);

  // Bind hover/click events on stars
  starItems.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.getAttribute('data-value'), 10);
      updateStarsUI(val);
    });

    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-value'), 10);
      updateStarsUI(val);
    });
  });

  // Keep selected stars on mouseleave
  starsContainer.addEventListener('mouseleave', () => {
    const val = parseInt(ratingInput.value, 10);
    updateStarsUI(val);
  });

  // Skip review
  document.getElementById('skipReviewBtn').onclick = () => {
    overlay.classList.remove('open');
    window.location.href = 'index.html';
  };

  // Submit Review Form
  const form = document.getElementById('postOrderReviewForm');
  form.onsubmit = async (e) => {
    e.preventDefault();

    const text = document.getElementById('postReviewText').value.trim();
    const stars = parseInt(ratingInput.value, 10);

    const payload = {
      name: customerName,
      platform: platform || 'PS5',
      stars: stars,
      text: text
    };

    try {
      const response = await fetch('/api/public/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        overlay.innerHTML = `
          <div class="order-success-card receipt-style" style="text-align: center; padding: 40px 20px; animation: scaleUp 0.4s ease both;">
            <div style="width: 72px; height: 72px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2.2rem; box-shadow: 0 4px 15px rgba(22,163,74,0.15);">
              <i class="fas fa-check"></i>
            </div>
            <h3 class="receipt-title" style="color: #16a34a; font-size: 1.5rem; margin-bottom: 10px;">تم إرسال تقييمك بنجاح!</h3>
            <p class="receipt-subtitle" style="font-size: 0.95rem; margin-bottom: 0;">شكراً جزيلاً لمساعدتك لنا في تقديم أفضل تجربة ممكنة. سيتم مراجعة تقييمك ونشره قريباً في المتجر. ❤️</p>
          </div>
        `;

        setTimeout(() => {
          overlay.classList.remove('open');
          window.location.href = 'index.html';
        }, 3000);
      } else {
        alert("حدث خطأ أثناء إرسال التقييم.");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("فشل الاتصال بالسيرفر لإرسال التقييم.");
    }
  };
}
