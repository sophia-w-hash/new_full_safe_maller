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
const SITE_PASSWORD = process.env.SITE_PASSWORD || '####@';

// Security Setup
app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { success: false, message: "Rate limit exceeded. Please wait a moment." }
});

app.use('/api/', apiLimiter);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Transporter Cache Pool
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

// Spintax Parser ({Hi|Hello|Hey})
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

// Smart & Safe Auto Sender Display Name Extractor
function extractCleanDisplayName(email) {
  if (!email || !email.includes('@')) return "Sender";
  
  const username = email.split('@')[0];
  const cleaned = username
    .replace(/[._\-+]/g, ' ')
    .replace(/[0-9]/g, '')
    .trim();

  if (!cleaned) {
    const rawName = username.replace(/[0-9]/g, '').trim();
    return rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "Gmail User";
  }

  return cleaned
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// HTML to Clean Plain Text
function convertHtmlToText(html) {
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

// Clean Email HTML Sanitizer & Wrapper (Guarantees No Unsubscribe Links or Triggers)
function formatCleanInboxHtml(rawBody) {
  // Strip any lingering unsubscribe links or unwanted footers dynamically
  let sanitizedBody = rawBody
    .replace(/<a[^>]*href=['"][^'"]*unsubscribe[^'"]*['"][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/unsubscribe/gi, '');

  const isAlreadyFullDoc = /<html[\s\S]*>/i.test(sanitizedBody);

  if (isAlreadyFullDoc) {
    return sanitizedBody;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #111111;">
      <div style="max-width: 650px; margin: 0 auto; padding: 20px 15px; font-size: 1.05em; line-height: 1.6;">
        ${sanitizedBody}
      </div>
    </body>
    </html>
  `.trim();
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
    return res.json({ success: true, message: "SMTP verified successfully" });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Authentication failed. Check App Password." });
  }
});

app.post("/api/send-single", async (req, res) => {
  const { email, appPassword, subject, messageBody, to } = req.body;

  if (!email || !appPassword || !to) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const senderEmail = email.toLowerCase().trim();
  const autoSenderName = extractCleanDisplayName(senderEmail);

  try {
    const transporter = getSafeTransporter(senderEmail, appPassword);

    const spunSubject = parseSpintax(subject);
    const spunBody = parseSpintax(messageBody);
    const isHtml = /<[a-z][\s\S]*>/i.test(spunBody);

    // Dynamic High-Reputation RFC Headers
    const randomHex = crypto.randomBytes(8).toString('hex');
    const domain = senderEmail.split('@')[1] || 'gmail.com';
    const customMessageId = `<${Date.now()}.${randomHex}@${domain}>`;

    const mailOptions = {
      from: `"${autoSenderName}" <${senderEmail}>`,
      to: to.trim(),
      subject: spunSubject,
      headers: {
        'Message-ID': customMessageId,
        'Date': new Date().toUTCString(),
        'X-Mailer': 'Gmail / Webmail',
        'X-Priority': '3',
        'Importance': 'normal'
      }
    };

    if (isHtml) {
      mailOptions.html = formatCleanInboxHtml(spunBody);
      mailOptions.text = convertHtmlToText(spunBody);
    } else {
      mailOptions.text = spunBody;
    }

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, recipient: to });

  } catch (error) {
    console.error(`Error sending to ${to}:`, error.message);
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
  console.log(`Server running on port ${PORT}`);
});

export default app;
