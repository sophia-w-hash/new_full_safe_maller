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

// Security Middlewares
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 mins
  message: { success: false, message: "Too many requests. Please slow down." }
});

app.use('/api/', apiLimiter);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Transporter Cache Pool for High Efficiency & Connection Reuse
const transporterCache = new Map();

function getSafeTransporter(email, appPassword) {
  const cleanEmail = email.toLowerCase().trim();
  const cacheKey = `${cleanEmail}_${appPassword}`;

  if (!transporterCache.has(cacheKey)) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cleanEmail, pass: appPassword },
      pool: true,              // Connection reuse
      maxConnections: 1,       // Single connection to stay under Gmail limits
      maxMessages: 50,          // Rotates sockets safely
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000
    });
    transporterCache.set(cacheKey, transporter);
  }

  return transporterCache.get(cacheKey);
}

/* ==========================================================================
   SPINTAX PARSER ({Hi|Hello|Hey})
   ========================================================================== */
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

/* ==========================================================================
   HTML TO PLAIN-TEXT FALLBACK
   ========================================================================== */
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

/* ==========================================================================
   AUTHENTICATION & VERIFY ROUTES
   ========================================================================== */
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

/* ==========================================================================
   SINGLE EMAIL SEND API
   ========================================================================== */
app.post("/api/send-single", async (req, res) => {
  const { email, appPassword, senderName, subject, messageBody, to } = req.body;

  if (!email || !appPassword || !to) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const senderEmail = email.toLowerCase().trim();
  const cleanSenderName = (senderName || "").replace(/"/g, "").trim();

  try {
    const transporter = getSafeTransporter(senderEmail, appPassword);

    const spunSubject = parseSpintax(subject);
    const spunBody = parseSpintax(messageBody);
    const isHtml = /<[a-z][\s\S]*>/i.test(spunBody);

    // Natural Human Delay Simulation (Jitter 100ms to 150ms)
    const randomJitter = Math.floor(Math.random() * 80) + 70;
    await new Promise((resolve) => setTimeout(resolve, randomJitter));

    // RFC-Compliant Unique Message-ID
    const randomHex = crypto.randomBytes(8).toString('hex');
    const customMessageId = `<${randomHex}.${Date.now()}@gmail.com>`;

    const mailOptions = {
      from: cleanSenderName ? `"${cleanSenderName}" <${senderEmail}>` : senderEmail,
      to: to.trim(),
      subject: spunSubject,
      headers: {
        'Message-ID': customMessageId,
        'X-Entity-Ref-ID': randomHex,
        'Date': new Date().toUTCString()
      }
    };

    if (isHtml) {
      mailOptions.html = spunBody;
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
