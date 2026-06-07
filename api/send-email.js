const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { senderName, gmailId, appPassword, subject, messageBody, to } = req.body || {};

  if (!gmailId || !appPassword || !subject || !messageBody || !to)
    return res.status(400).json({ error: 'Missing required fields' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(to).trim()))      return res.status(400).json({ error: 'Invalid recipient email' });
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid Gmail address' });
  if (subject.length > 200)                     return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000)                return res.status(400).json({ error: 'Message too long' });
  if (senderName && senderName.length > 60)     return res.status(400).json({ error: 'Sender name too long' });

  const cleanPass  = String(appPassword).trim().replace(/\s/g, '');
  const cleanName  = (senderName || 'Team').replace(/[<>"]/g, '');
  const plainText  = String(messageBody).trim();
  const toAddress  = String(to).trim();
  const fromAddress = String(gmailId).trim();

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: fromAddress, pass: cleanPass },
    tls: { rejectUnauthorized: true },
    pool: false,
  });

  // ✅ Only plain text — no HTML at all
  // Plain text emails have highest inbox rate
  try {
    await transporter.sendMail({
      from: `"${cleanName}" <${fromAddress}>`,
      to: toAddress,
      subject: String(subject).trim(),
      text: plainText,   // ✅ ONLY plain text — no HTML
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    let safeError = 'Failed to send. Please try again.';
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      safeError = 'Invalid Gmail or App Password. Make sure 2-Step Verification is ON.';
    } else if (error.message.includes('Too many login')) {
      safeError = 'Too many attempts. Wait a few minutes.';
    } else if (error.message.includes('quota exceeded')) {
      safeError = 'Gmail daily limit reached (500/day). Try tomorrow.';
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      safeError = 'Network error. Check your connection.';
    }
    console.error('[send-email]', error.code || error.message);
    return res.status(500).json({ error: safeError });
  }
};
