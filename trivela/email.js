require('dotenv').config();
const { Resend } = require('resend');
const crypto = require('crypto');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'onboarding@resend.dev';

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

const HTML_HEAD = `
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050b14; color: #ffffff; padding: 20px; direction: rtl; text-align: right; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0a1628; border-radius: 10px; padding: 30px; border-top: 4px solid #f59e0b; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
    .header { text-align: center; margin-bottom: 30px; }
    .title { color: #f59e0b; font-size: 24px; margin: 0; }
    .code-box { background-color: rgba(245, 158, 11, 0.1); border: 2px dashed #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
    .code { font-size: 36px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; margin: 0; font-family: monospace; }
    .footer { text-align: center; margin-top: 40px; font-size: 14px; color: #94a3b8; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; }
    .note { font-size: 14px; color: #cbd5e1; text-align: center; margin-top: 10px; }
  </style>
`;

async function sendOTP(email, code, type = 'verify') {
  const subject = type === 'reset' ? 'رمز إعادة تعيين كلمة المرور — Trivela' : 'رمز التحقق من حسابك — Trivela';
  
  if (!resend) {
    console.log(`📧 [DEV] OTP for ${email}: ${code}`);
    return { success: true, dev: true };
  }

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>${HTML_HEAD}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">Trivela</h1>
        </div>
        <h2 style="text-align: center; margin-bottom: 20px;">${type === 'reset' ? 'إعادة تعيين كلمة المرور' : 'تأكيد حسابك'}</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">مرحباً بك،</p>
        <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">يرجى استخدام رمز التحقق التالي للمتابعة:</p>
        
        <div class="code-box">
          <p class="code">${code}</p>
        </div>
        
        <p class="note">الكود صالح لمدة 10 دقائق</p>
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.</p>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Trivela. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subject,
      html: html
    });
    return { success: true, data };
  } catch (err) {
    console.error('Error sending OTP email:', err);
    return { success: false, error: err.message };
  }
}

async function sendWelcomeEmail(email, name) {
  const subject = 'مرحباً بك في Trivela! 🎮';
  
  if (!resend) {
    console.log(`📧 [DEV] Welcome email to ${email}`);
    return { success: true, dev: true };
  }

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>${HTML_HEAD}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">Trivela</h1>
        </div>
        <h2 style="text-align: center; margin-bottom: 20px;">مرحباً بك في عائلة Trivela! 🎮</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">أهلاً بك ${name}،</p>
        <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">نحن سعداء جداً بانضمامك إلينا. اكتشف أفضل العروض والخدمات لحسابك الآن.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://trivela.com" style="background-color: #f59e0b; color: #050b14; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">تصفح المتجر الآن</a>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Trivela. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subject,
      html: html
    });
    return { success: true, data };
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { generateOTP, sendOTP, sendWelcomeEmail };
