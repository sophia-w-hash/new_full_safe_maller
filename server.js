import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SITE_PASSWORD = process.env.SITE_PASSWORD || '##';

app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { success: false, message: "Rate limit exceeded. Please wait." }
});

app.use('/api/', apiLimiter);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const transporterCache = new Map();

function getSafeTransporter(email, appPassword) {
  const cleanEmail = email.toLowerCase().trim();
  const cacheKey = `${cleanEmail}_${appPassword}`;

  if (!transporterCache.has(cacheKey)) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cleanEmail, pass: appPassword },
      pool: true,
      maxConnections: 5,
      maxMessages: Infinity,
      rateDelta: 1000,
      rateLimit: 5,
      connectionTimeout: 12000,
      greetingTimeout: 6000,
      socketTimeout: 15000
    });
    transporterCache.set(cacheKey, transporter);
  }

  return transporterCache.get(cacheKey);
}

function parseSpintax(text) {
  if (!text) return "";
  let spun = text;
  const regex = /{([^{}]+)}/g;
  let iterations = 0;
  while (regex.test(spun) && iterations < 10) {
    spun = spun.replace(regex, (_, choices) => {
      const options = choices.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    iterations++;
  }
  return spun;
}

function obfuscateTextForInbox(text) {
  if (!text) return "";
  const sensitiveWords = ['buy', 'click', 'free', 'money', 'offer', 'urgent', 'winner', 'deal', 'cash', 'crypto', 'bonus', 'percent', 'discount', 'limited', 'verify', 'account'];
  let processed = text;
  sensitiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    processed = processed.replace(regex, (match) => {
      if (match.length > 2) {
        return match.slice(0, 1) + '\u200C' + match.slice(1);
      }
      return match;
    });
  });
  return processed;
}

// Fixed PNG / Image auto-responsive sizing wrapper
function sanitizeAndWrapHtml(rawBody) {
  let cleaned = rawBody
    .replace(/<a[^>]*href=['"][^'"]*unsubscribe[^'"]*['"][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a[^>]*href=['"][^'"]*optout[^'"]*['"][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/unsubscribe/gi, '')
    .replace(/opt-out/gi, '');

  const isFullDoc = /<html[\s\S]*>/i.test(cleaned);
  if (isFullDoc) return cleaned;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #ffffff; }
        .email-container { max-width: 600px; margin: 0 auto; padding: 20px; font-size: 15px; }
        img { max-width: 100% !important; height: auto !important; display: block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${cleaned}
      </div>
    </body>
    </html>
  `.trim();
}

function convertHtmlToPlainText(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

app.post("/api/auth", (req, res) => {
  const { password } = req.body;
  if (password === SITE_PASSWORD) return res.json({ success: true });
  return res.status(401).json({ success: false, message: "Incorrect password" });
});

app.post("/api/verify", async (req, res) => {
  const { email, appPassword } = req.body;
  if (!email || !appPassword) {
    return res.status(400).json({ success: false, message: "Credentials required" });
  }

  try {
    const transporter = getSafeTransporter(email, appPassword);
    await transporter.verify();
    return res.json({ success: true, message: "SMTP connection verified" });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Authentication failed" });
  }
});

app.post("/api/send-single", async (req, res) => {
  const { senderName, email, appPassword, subject, messageBody, to } = req.body;

  if (!email || !appPassword || !to) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const senderEmail = email.toLowerCase().trim();
  const displayName = (senderName && senderName.trim()) ? senderName.trim() : "Sender";

  try {
    const transporter = getSafeTransporter(senderEmail, appPassword);

    let finalSubject = parseSpintax(subject);
    let finalBody = parseSpintax(messageBody);

    finalSubject = obfuscateTextForInbox(finalSubject);
    finalBody = obfuscateTextForInbox(finalBody);

    const isHtml = /<[a-z][\s\S]*>/i.test(finalBody) || finalBody.includes('<img');

    const randomHex = crypto.randomBytes(8).toString('hex');
    const domain = senderEmail.split('@')[1] || 'gmail.com';
    const messageId = `<${Date.now()}.${randomHex}@${domain}>`;

    const mailOptions = {
      from: `"${displayName}" <${senderEmail}>`,
      to: to.trim(),
      subject: finalSubject,
      headers: {
        'Message-ID': messageId,
        'Date': new Date().toUTCString(),
        'X-Mailer': 'Gmail Webmail Engine 1.0',
        'X-Priority': '3',
        'Importance': 'normal',
        'Precedence': 'bulk',
        'Auto-Submitted': 'no'
      }
    };

    if (isHtml) {
      mailOptions.html = sanitizeAndWrapHtml(finalBody);
      mailOptions.text = convertHtmlToPlainText(finalBody);
    } else {
      mailOptions.text = finalBody;
    }

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, recipient: to });

  } catch (error) {
    console.error(`Send error to ${to}:`, error.message);
    return res.json({ 
      success: false, 
      recipient: to, 
      error: error.message.includes("Invalid login") ? "Invalid App Password" : error.message 
    });
  }
});

app.post("/api/stop", (req, res) => {
  res.json({ success: true, message: "Process stopped" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server active on port ${PORT}`);
});

export default app;
