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

  if (!gmailId || !appPassword || !subject || !messageBody || !to) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(to).trim()))     return res.status(400).json({ error: 'Invalid recipient email' });
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid Gmail address' });

  if (subject.length > 200)      return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000) return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
  if (senderName && senderName.length > 60) return res.status(400).json({ error: 'Sender name too long' });

  const cleanPass = String(appPassword).trim().replace(/\s/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: String(gmailId).trim(),
      pass: cleanPass,
    },
    tls: { rejectUnauthorized: true }
  });

  try {
    await transporter.sendMail({
      from: `"${(senderName || 'Fast Mail Launcher').replace(/[<>"]/g, '')}" <${String(gmailId).trim()}>`,
      to: String(to).trim(),
      subject: String(subject).trim(),
      text: String(messageBody).trim(),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="white-space:pre-wrap;line-height:1.7;color:#222;font-size:15px;">
            ${String(messageBody).trim()
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')
              .replace(/>/g,'&gt;')
              .replace(/\n/g,'<br/>')}
          </div>
          <hr style="margin-top:32px;border:none;border-top:1px solid #eee;"/>
          <p style="font-size:11px;color:#bbb;margin-top:8px;">Sent via Fast Mail Launcher</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    let safeError = 'Failed to send email. Please try again.';

    if (error.message) {
      if (error.message.includes('Invalid login') || error.message.includes('Username and Password') || error.message.includes('BadCredentials')) {
        safeError = 'Invalid Gmail or App Password. Make sure 2-Step Verification is ON.';
      } else if (error.message.includes('Too many login')) {
        safeError = 'Too many attempts. Please wait a few minutes.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
        safeError = 'Network error. Check your connection.';
      } else if (error.message.includes('Daily user sending quota exceeded')) {
        safeError = 'Gmail daily limit reached (500/day). Try again tomorrow.';
      }
    }

    console.error('[send-email] Error:', error.code || error.message);
    return res.status(500).json({ error: safeError });
  }
};
