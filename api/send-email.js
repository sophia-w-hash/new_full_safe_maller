const nodemailer = require('nodemailer');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { senderName, gmailId, appPassword, subject, messageBody, to } = req.body || {};

  if (!gmailId || !appPassword || !subject || !messageBody || !to)
    return res.status(400).json({ error: 'Missing required fields' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(to).trim()))      return res.status(400).json({ error: 'Invalid recipient' });
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid Gmail' });
  if (subject.length > 200)      return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000) return res.status(400).json({ error: 'Message too long' });
  if (senderName && senderName.length > 60) return res.status(400).json({ error: 'Name too long' });

  const cleanPass   = String(appPassword).trim().replace(/\s/g, '');
  const cleanName   = (senderName || '').replace(/[<>"]/g, '');
  const plainText   = String(messageBody).trim();
  const toAddress   = String(to).trim();
  const fromAddress = String(gmailId).trim();
  const domain      = fromAddress.split('@')[1] || 'gmail.com';
  const messageId   = `<${crypto.randomUUID()}@${domain}>`;

  if (cleanPass.length < 16)
    return res.status(400).json({ error: 'App Password 16 characters hona chahiye.' });

  const mailers = ['Apple Mail 16.0','Mozilla Thunderbird 115.0','Microsoft Outlook 16.0'];
  const xMailer = mailers[Math.floor(Math.random() * mailers.length)];
  const finalText = plainText + '\u200B'.repeat(Math.floor(Math.random() * 3) + 1);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: fromAddress, pass: cleanPass },
    tls: { rejectUnauthorized: true },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transporter.sendMail({
      from: cleanName ? `"${cleanName}" <${fromAddress}>` : `<${fromAddress}>`,
      replyTo: fromAddress,
      to: toAddress,
      subject: String(subject).trim(),
      text: finalText,
      headers: {
        'Message-ID':                messageId,
        'Date':                      new Date().toUTCString(),
        'MIME-Version':              '1.0',
        'Content-Type':              'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding': '7bit',
        'X-Mailer':                  xMailer,
        'X-Priority':                '3',
        'Importance':                'Normal',
      },
    });
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[send-email]', error.code, error.message);
    let safeError = 'Failed to send. Try again.';
    if (error.message.includes('Invalid login') || error.message.includes('535'))
      safeError = '❌ App Password galat hai ya 2FA OFF hai.';
    else if (error.message.includes('Too many login'))
      safeError = '⏳ 10 minute baad try karo.';
    else if (error.message.includes('quota exceeded'))
      safeError = '📛 Daily limit reach ho gaya.';
    else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT'))
      safeError = '🌐 Network error.';
    return res.status(500).json({ error: safeError });
  }
};
