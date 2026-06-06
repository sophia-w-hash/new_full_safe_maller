const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { senderName, gmailId, appPassword, subject, messageBody, to } = req.body;

  if (!gmailId || !appPassword || !subject || !messageBody || !to) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to) || !emailRegex.test(gmailId)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailId.trim(),
      pass: appPassword.trim().replace(/\s/g, ''),
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${senderName || 'Fast Mail Launcher'}" <${gmailId.trim()}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: messageBody.trim(),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="white-space:pre-wrap;line-height:1.6;color:#333;">
            ${messageBody.trim().replace(/\n/g, '<br/>')}
          </div>
          <hr style="margin-top:30px;border:none;border-top:1px solid #eee;"/>
          <p style="font-size:12px;color:#aaa;margin-top:10px;">Sent via Fast Mail Launcher</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    let friendlyError = error.message;
    if (error.message.includes('Invalid login') || error.message.includes('Username and Password')) {
      friendlyError = 'Invalid Gmail or App Password. Make sure 2FA is ON.';
    } else if (error.message.includes('Too many login attempts')) {
      friendlyError = 'Too many attempts. Try again later.';
    }
    return res.status(500).json({ error: friendlyError });
  }
};
