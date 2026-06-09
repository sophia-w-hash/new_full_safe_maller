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
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid email' });
  if (subject.length > 200)      return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000) return res.status(400).json({ error: 'Message too long' });

  const cleanName   = (senderName || '').replace(/[<>"]/g, '');
  const plainText   = String(messageBody).trim();
  const toAddress   = String(to).trim();
  const fromAddress = String(gmailId).trim();
  const messageId   = `<${crypto.randomUUID()}@smtp-relay.brevo.com>`;
  const cleanPass   = String(appPassword).trim();

  // ✅ Brevo SMTP — 85-90% inbox rate
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: fromAddress,  // Brevo account email
      pass: cleanPass,    // Brevo SMTP key
    },
    tls: { rejectUnauthorized: true },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transporter.sendMail({
      from: cleanName
        ? `"${cleanName}" <${fromAddress}>`
        : `<${fromAddress}>`,
      replyTo: fromAddress,
      to: toAddress,
      subject: String(subject).trim(),
      text: plainText,
      headers: {
        'Message-ID': messageId,
        'Date':       new Date().toUTCString(),
      },
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[send-email]', error.code, error.message);
    let safeError = 'Failed to send. Try again.';
    if (error.message.includes('Invalid login') || error.message.includes('535'))
      safeError = '❌ Brevo credentials galat hain.';
    else if (error.message.includes('quota') || error.message.includes('limit'))
      safeError = '📛 Daily limit reach ho gayi.';
    else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT'))
      safeError = '🌐 Network error.';
    return res.status(500).json({ error: safeError });
  }
};
