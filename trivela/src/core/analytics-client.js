// self-executing client-side analytics tracker for Trivela Store
(function() {
  // 1. Detect visitor type (new vs returning)
  let visitorType = 'new';
  if (localStorage.getItem('trivela_returning_visitor')) {
    visitorType = 'returning';
  } else {
    localStorage.setItem('trivela_returning_visitor', 'true');
  }

  // 2. Detect page name
  const pagePath = window.location.pathname;
  let pageName = 'home';
  if (pagePath.includes('buy-coins')) pageName = 'coins';
  else if (pagePath.includes('buy-sbc-detail')) pageName = 'sbc';
  else if (pagePath.includes('buy-sbc')) pageName = 'sbc';
  else if (pagePath.includes('buy-rivals')) pageName = 'rivals';
  else if (pagePath.includes('buy-champions')) pageName = 'champions';
  else if (pagePath.includes('buy-objectives')) pageName = 'objectives';
  else if (pagePath.includes('buy-coaching')) pageName = 'coaching';
  else if (pagePath.includes('buy-packages')) pageName = 'packages';

  // 3. Send Ping
  fetch('/api/public/analytics-ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: visitorType,
      referrer: document.referrer || '',
      page: pageName
    })
  }).catch(e => console.warn('Analytics ping failed:', e));

  // 4. Global click listener for purchase/CTA buttons
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, a, input[type="submit"]');
    if (!btn) return;
    
    // Check if it's a purchase/submit/redirect CTA button
    const btnText = (btn.textContent || btn.value || '').trim();
    if (
      btnText.includes('شراء') || 
      btnText.includes('طلب') || 
      btnText.includes('أرسل') || 
      btnText.includes('اشحن') || 
      btnText.includes('اتمام') ||
      btn.classList.contains('cta-btn') || 
      btn.id === 'submit-order'
    ) {
      fetch('/api/public/analytics-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: pageName })
      }).catch(err => console.warn('Analytics click track failed:', err));
    }
  });
})();
