const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
  if (!emailRegex.test(String(to).trim()))      return res.status(400).json({ error: 'Invalid recipient' });
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid Gmail' });
  if (subject.length > 200)      return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000) return res.status(400).json({ error: 'Message too long' });
  if (senderName && senderName.length > 60) return res.status(400).json({ error: 'Name too long' });

  const cleanPass   = String(appPassword).trim().replace(/\s/g, '');
  const cleanName   = (senderName || 'Team').replace(/[<>"]/g, '');
  const plainText   = String(messageBody).trim();
  const toAddress   = String(to).trim();
  const fromAddress = String(gmailId).trim();
  const domain      = fromAddress.split('@')[1] || 'gmail.com';
  const messageId   = `<${crypto.randomUUID()}.${Date.now()}@${domain}>`;

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
      from: `"${cleanName}" <${fromAddress}>`,
      replyTo: fromAddress,
      to: toAddress,
      subject: String(subject).trim(),
      text: plainText,
      headers: {
        'Message-ID':                messageId,
        'Date':                      new Date().toUTCString(),
        'MIME-Version':              '1.0',
        'Content-Type':              'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding': 'quoted-printable',
        'X-Mailer':                  'Mozilla Thunderbird 115.0',
        'X-Priority':                '3',
        'X-MSMail-Priority':         'Normal',
        'Importance':                'Normal',
      },
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    let safeError = 'Failed to send. Try again.';
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials'))
      safeError = 'Invalid Gmai
