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

  if (cleanPass.length < 16) {
    return res.status(400).json({
      error: 'App Password 16 characters hona chahiye. Google Account → Security → App Passwords se banao.'
    });
  }

  // ✅ Spin words — har email thodi alag hogi = spam filter bypass
  const spinWord = (options) => options[Math.floor(Math.random() * options.length)];

  const greetings  = ['Hi', 'Hello', 'Hey', 'Dear'];
  const closings   = ['Best regards', 'Kind regards', 'Thanks', 'Warm regards', 'Regards'];
  const connectors = ['Also,', 'Additionally,', 'Furthermore,', 'Moreover,'];

  // ✅ Recipient ka naam email se nikalo
  const recipientLocal = toAddress.split('@')[0];
  const recipientName  = recipientLocal.split(/[.\-_0-9]/)[0];
  const firstName      = recipientName.length >= 2
    ? recipientName.charAt(0).toUpperCase() + recipientName.slice(1).toLowerCase()
    : '';

  // ✅ Message spin karo
  const greeting  = firstName
    ? `${spinWord(greetings)} ${firstName},`
    : `${spinWord(greetings)},`;

  const closing   = `\n\n${spinWord(closings)},\n${cleanName}`;
  const connector = spinWord(connectors);

  // ✅ Message body mein connector add karo (natural feel)
  const lines     = plainText.split('\n');
  let spunBody    = plainText;
  if (lines.length >= 2) {
    lines[1] = connector + ' ' + lines[1];
    spunBody = lines.join('\n');
  }

  const finalText = `${greeting}\n\n${spunBody}${closing}`;

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
    await transporter.verify();

    await transporter.sendMail({
      from: `"${cleanName}" <${fromAddress}>`,
      replyTo: fromAddress,
      to: toAddress,
      subject: String(subject).trim(),
      text: finalText,
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
    console.error('[send-email]', error.code, error.message);
    let safeError = 'Failed to send. Try again.';
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials') || error.message.includes('535'))
      safeError = '❌ Gmail login failed — App Password galat hai ya 2-Step Verification OFF hai.';
    else if (error.message.includes('Too many login') || error.message.includes('rate limit'))
      safeError = '⏳ Too many attempts. 10 minute baad try karo.';
    else if (error.message.includes('quota exceeded') || error.message.includes('Daily limit'))
      safeError = '📛 Gmail daily limit (500/day) reach ho gaya.';
    else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND'))
      safeError = '🌐 Network error. Internet check karo.';
    return res.status(500).json({ error: safeError });
  }
};
