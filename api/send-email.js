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
  if (!emailRegex.test(String(to).trim()))      return res.status(400).json({ error: 'Invalid recipient email' });
  if (!emailRegex.test(String(gmailId).trim())) return res.status(400).json({ error: 'Invalid Gmail address' });

  if (subject.length > 200)       return res.status(400).json({ error: 'Subject too long' });
  if (messageBody.length > 5000)  return res.status(400).json({ error: 'Message too long' });
  if (senderName && senderName.length > 60) return res.status(400).json({ error: 'Sender name too long' });

  const cleanPass = String(appPassword).trim().replace(/\s/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: String(gmailId).trim(),
      pass: cleanPass,
    },
    tls: { rejectUnauthorized: true },
    pool: false, // har email ke liye fresh connection — inbox friendly
  });

  // ✅ Inbox ke liye best HTML template
  const cleanName   = (senderName || 'Team').replace(/[<>"]/g, '');
  const cleanBody   = String(messageBody).trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;overflow:hidden;
                 box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;font-size:15px;line-height:1.8;color:#222222;">
              ${cleanBody}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 24px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#999999;">
                This email was sent by ${cleanName}. If you wish to unsubscribe, please reply with "unsubscribe".
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${cleanName}" <${String(gmailId).trim()}>`,
      to: String(to).trim(),
      subject: String(subject).trim(),
      text: String(messageBody).trim(), // plain text version (spam filters check this)
      html: htmlBody,
      // ✅ Inbox-friendly headers
      headers: {
        'X-Mailer': 'Nodemailer',
        'X-Priority': '3',            // Normal priority (1=high → spam flag)
        'Importance': 'normal',
        'MIME-Version': '1.0',
      },
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
