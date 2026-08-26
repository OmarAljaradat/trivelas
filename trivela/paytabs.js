require('dotenv').config();
const https = require('https');

// Get PayTabs endpoint URL based on region
function getPayTabsBaseUrl(region) {
  const reg = (region || process.env.PAYTABS_REGION || 'GLOBAL').toUpperCase();
  switch (reg) {
    case 'SA':
    case 'KSA':
    case 'SAUDI':
      return 'https://secure.paytabs.sa';
    case 'JO':
    case 'JOR':
    case 'JORDAN':
      return 'https://secure-jordan.paytabs.com';
    case 'EG':
    case 'EGY':
    case 'EGYPT':
      return 'https://secure-egypt.paytabs.com';
    case 'OM':
    case 'OMAN':
      return 'https://secure-oman.paytabs.com';
    case 'GLOBAL':
    case 'UAE':
    default:
      return 'https://secure.paytabs.com';
  }
}

/**
 * Create a PayTabs hosted payment page
 * @param {Object} order - Order details
 * @param {string} returnUrl - URL customer is redirected to after payment
 * @param {string} callbackUrl - Webhook URL for server-to-server IPN
 * @returns {Promise<Object>} Result with redirect_url and tran_ref
 */
async function createPaymentPage(order, returnUrl, callbackUrl) {
  const profileId = process.env.PAYTABS_PROFILE_ID;
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  const currency = (process.env.PAYTABS_CURRENCY || 'JOD').toUpperCase();

  // Calculate cart amount based on gateway currency
  let cartAmount = parseFloat(order.priceSAR || order.price_sar || 0);
  if (currency === 'JOD') {
    cartAmount = parseFloat((cartAmount / 3.75 * 0.709).toFixed(2));
  } else if (currency === 'USD') {
    cartAmount = parseFloat((cartAmount / 3.75).toFixed(2));
  } else {
    cartAmount = parseFloat(cartAmount.toFixed(2));
  }

  // DEV / Test Fallback if keys are not yet provided
  if (!serverKey || !profileId || serverKey === 'YOUR_PAYTABS_SERVER_KEY') {
    console.log(`💳 [DEV PayTabs] Simulated payment page for Order #${order.id} (${cartAmount} ${currency})`);
    return {
      success: true,
      dev: true,
      redirect_url: `${returnUrl}?orderId=${encodeURIComponent(order.id)}&payment=simulated_success&tranRef=DEV_${Date.now()}&amount=${cartAmount}&currency=${currency}`,
      tran_ref: `DEV_${Date.now()}`
    };
  }

  const baseUrl = getPayTabsBaseUrl(process.env.PAYTABS_REGION || 'JO');
  const endpoint = `${baseUrl}/payment/request`;

  const payload = {
    profile_id: parseInt(profileId, 10),
    tran_type: "sale",
    tran_class: "ecom",
    cart_id: order.id,
    cart_description: order.service || "طلب من متجر Trivela",
    cart_currency: currency,
    cart_amount: cartAmount,
    callback: callbackUrl,
    return: returnUrl,
    customer_details: {
      name: order.customerName || order.user_name || "عميل تريفيلا",
      email: order.customerEmail || order.user_email || order.eaEmail || "customer@trivela.local",
      phone: order.customerPhone || order.user_phone || "00962775585112",
      street1: "Online Store",
      city: "Amman",
      state: "Amman",
      country: "JO",
      ip: order.ip || "127.0.0.1"
    },
    hide_shipping: true
  };

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const dataString = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'authorization': serverKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.redirect_url) {
            resolve({
              success: true,
              redirect_url: parsed.redirect_url,
              tran_ref: parsed.tran_ref
            });
          } else {
            console.error('PayTabs Error Response:', parsed);
            resolve({
              success: false,
              error: parsed.message || parsed.detail || 'فشل إنشاء رابط الدفع من PayTabs'
            });
          }
        } catch (e) {
          console.error('PayTabs JSON parse error:', e, body);
          resolve({ success: false, error: 'استجابة غير صالحة من بوابة PayTabs' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('PayTabs Request Error:', err);
      resolve({ success: false, error: 'تعذر الاتصال ببوابة PayTabs: ' + err.message });
    });

    req.write(dataString);
    req.end();
  });
}

/**
 * Query / verify transaction with PayTabs
 * @param {string} tranRef - Transaction reference ID
 * @returns {Promise<Object>} Verification result
 */
async function verifyTransaction(tranRef) {
  const profileId = process.env.PAYTABS_PROFILE_ID;
  const serverKey = process.env.PAYTABS_SERVER_KEY;

  if (!serverKey || !profileId || tranRef.startsWith('DEV_')) {
    return { success: true, isPaid: true, dev: true };
  }

  const baseUrl = getPayTabsBaseUrl(process.env.PAYTABS_REGION);
  const endpoint = `${baseUrl}/payment/query`;

  const payload = {
    profile_id: parseInt(profileId, 10),
    tran_ref: tranRef
  };

  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const dataString = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'authorization': serverKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          // PayTabs response_status: "A" = Authorised (Success)
          const isPaid = parsed.payment_result && (parsed.payment_result.response_status === 'A' || parsed.payment_result.response_code === '100');
          resolve({
            success: true,
            isPaid,
            data: parsed
          });
        } catch (e) {
          resolve({ success: false, error: 'فشل قراءة استجابة التحقق' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(dataString);
    req.end();
  });
}

module.exports = {
  createPaymentPage,
  verifyTransaction,
  getPayTabsBaseUrl
};
