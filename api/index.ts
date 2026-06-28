import express from "express";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
app.use(express.json({ limit: '10mb' }));

// API to test SMTP connection with Gmail app password
app.post("/api/mail/test-connection", async (req, res) => {
  const { senderEmail, appPassword } = req.body;

  if (!senderEmail || !appPassword) {
    return res.status(400).json({ success: false, message: "Email and App Password are required" });
  }

  // Clean space from password
  const cleanedPassword = appPassword.replace(/\s+/g, "");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: cleanedPassword,
    },
  });

  try {
    await transporter.verify();
    return res.json({ success: true, message: "SMTP connection verified successfully!" });
  } catch (error: any) {
    console.error("Verification error:", error);
    return res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to verify. Please check your Gmail address and 16-digit App Password." 
    });
  }
});

// Helper to sanitize high-risk spam keywords automatically using smart synonyms or zero-width splits
function sanitizeSpamKeywords(text: string): string {
  const spamMap: { [key: string]: string } = {
    "free": "complimentary",
    "guaranteed": "assured",
    "100% satisfied": "fully satisfied",
    "earn money": "generate income",
    "make money": "grow income",
    "risk-free": "secure",
    "winner": "finalist",
    "cash": "funds",
    "millions": "substantial resources",
    "crypto": "digital assets",
    "bitcoin": "blockchain asset",
    "buy now": "get access",
    "click here": "explore details",
    "income": "earnings",
    "marketing": "outreach",
    "sales": "promotional",
    "cheap": "affordable"
  };

  let sanitized = text;
  for (const [word, replacement] of Object.entries(spamMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, (match) => {
      // In 50% of cases we substitute with an elegant professional synonym,
      // and in the other 50% we split the word with an invisible space so spam scanning engines won't match the word signature.
      if (Math.random() < 0.5) {
        return replacement;
      } else {
        return match.split('').join('\u200b');
      }
    });
  }
  return sanitized;
}

// Helper to inject invisible Zero-Width Characters to defeat fingerprint-based spam filters.
// This alters the digital signature hash of every email to make each one completely unique,
// but leaves the text 100% identical and flawless to the human eye.
function injectInvisibleSpamShield(htmlContent: string): string {
  const zeroWidths = ["\u200b", "\u200c", "\u200d"];
  let result = "";
  let inTag = false;
  let inEntity = false;
  let inStyleOrScript = false;
  let tagContent = "";

  for (let i = 0; i < htmlContent.length; i++) {
    const char = htmlContent[i];

    if (char === '<') {
      inTag = true;
      tagContent = "<";
    } else if (char === '&') {
      inEntity = true;
    }

    result += char;

    if (inTag) {
      tagContent += char;
    }

    if (char === '>') {
      inTag = false;
      const lowerTag = tagContent.toLowerCase();
      if (lowerTag.startsWith("<style") || lowerTag.startsWith("<script")) {
        inStyleOrScript = true;
      } else if (lowerTag.startsWith("</style") || lowerTag.startsWith("</script")) {
        inStyleOrScript = false;
      }
    } else if (char === ';' && inEntity) {
      inEntity = false;
    }

    // Inject zero-width characters with 4% probability (stealth golden ratio), ONLY outside of HTML tags, 
    // outside of style/script blocks, outside of HTML entities (&nbsp;), and outside of variables like {{variable}}
    if (
      !inTag && 
      !inStyleOrScript && 
      !inEntity && 
      char !== '{' && 
      char !== '}' && 
      char !== '<' && 
      char !== '>' && 
      char !== '&' && 
      char !== ';' && 
      Math.random() < 0.04
    ) {
      const randomZwc = zeroWidths[Math.floor(Math.random() * zeroWidths.length)];
      result += randomZwc;
    }
  }
  return result;
}

function injectInvisibleSpamShieldSubject(subjectText: string): string {
  const zeroWidths = ["\u200b", "\u200c", "\u200d"];
  let result = "";
  for (let i = 0; i < subjectText.length; i++) {
    const char = subjectText[i];
    result += char;
    // Inject with 4% probability, avoiding mustache templates to preserve variables
    if (char !== '{' && char !== '}' && Math.random() < 0.04) {
      const randomZwc = zeroWidths[Math.floor(Math.random() * zeroWidths.length)];
      result += randomZwc;
    }
  }
  return result;
}

function parseSpintax(text: string): string {
  // Recursively process Spintax {option1|option2|option3}
  const regex = /\{([^{}]+)\}/g;
  let hasSpintax = regex.test(text);
  
  while (hasSpintax) {
    text = text.replace(regex, (match, optionsString) => {
      // Split options by '|'
      const options = optionsString.split('|');
      const randomIndex = Math.floor(Math.random() * options.length);
      return options[randomIndex];
    });
    // Reset test state and retest to handle nested brackets if any
    regex.lastIndex = 0;
    hasSpintax = regex.test(text);
  }
  return text;
}

function cleanHtmlToText(html: string): string {
  // Simple regex-based HTML tag stripper to generate a clean plain text version
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text.replace(/\s+/g, ' ').trim();
}

// API to send a single email (for bulk execution)
app.post("/api/mail/send-single", async (req, res) => {
  const { senderEmail, appPassword, senderName, recipientEmail, subject, body } = req.body;

  if (!senderEmail || !appPassword || !recipientEmail || !subject || !body) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const cleanedPassword = appPassword.replace(/\s+/g, "");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: cleanedPassword,
    },
  });

  // Apply real-time cryptographic/anti-fingerprinting randomized spam shields
  const spunSubject = parseSpintax(subject);
  const spunBody = parseSpintax(body);

  // Sanitize high-risk spam keywords automatically
  const cleanSubject = sanitizeSpamKeywords(spunSubject);
  const cleanBody = sanitizeSpamKeywords(spunBody);

  const randomizedSubject = injectInvisibleSpamShieldSubject(cleanSubject);
  let randomizedBody = injectInvisibleSpamShield(cleanBody);

  // INBOX-MAXIMIZER TECHNIQUE 1: Inject random dynamic HTML comments at the top and bottom of the body
  // This changes the body checksum signature of every single mail without changing the visual look.
  const randomSpamToken = Math.random().toString(36).substring(2, 15);
  randomizedBody = `<!-- ID: ${randomSpamToken} -->\n${randomizedBody}\n<!-- SECURE_TOKEN: ${Math.floor(100000 + Math.random() * 900000)} -->`;

  const plainTextAlternative = cleanHtmlToText(randomizedBody);

  // INBOX-MAXIMIZER TECHNIQUE 2: Generate highly authentic Domain-Aligned Message-ID to bypass Nodemailer default headers
  const senderDomain = senderEmail.split('@')[1] || 'gmail.com';
  const timeStamp = Date.now();
  const randHex = Math.floor(1000000000 + Math.random() * 9000000000).toString(16).toUpperCase();
  const alignedMessageId = `<${randHex}.${timeStamp}@${senderDomain}>`;

  // INBOX-MAXIMIZER TECHNIQUE 3: Dynamic Date header mimicking human desktop client latency offsets
  const simulatedOffsetMinutes = Math.floor(Math.random() * 5); // 0-4 minutes lag offset
  const simulatedDate = new Date(Date.now() - (simulatedOffsetMinutes * 60 * 1000));

  // Bulletproof SMTP send retry loop with Exponential Backoff
  let attempts = 0;
  const maxAttempts = 3;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    try {
      const info = await transporter.sendMail({
        from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
        to: recipientEmail,
        subject: randomizedSubject,
        html: randomizedBody,
        text: plainTextAlternative, // Multi-part alternative MIME to heavily reduce spam score
        messageId: alignedMessageId, // Real aligned header
        date: simulatedDate, // Simulated realistic date sending pattern
        headers: {
          'MIME-Version': '1.0',
          'X-Priority': '3', // Normal Priority
          'Priority': 'normal',
          // Trusted List-Unsubscribe standard for perfect Gmail & Yahoo inbox reception
          'List-Unsubscribe': `<mailto:${senderEmail}?subject=unsubscribe-request>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          // Spoof headers to look like Mozilla Thunderbird desktop client to bypass bulk filters
          'X-Mailer': 'Thunderbird 115.11.0 (Windows NT 10.0; rv:115.0)',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Thunderbird/115.11.0',
          'X-Accept-Language': 'en-US, en',
          'Content-Language': 'en-US',
          'Importance': 'Normal'
        }
      });

      return res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      attempts++;
      lastError = error;
      console.warn(`Attempt ${attempts} failed to send to ${recipientEmail}. Error: ${error.message}`);
      
      if (attempts < maxAttempts) {
        // Wait 800ms before retrying to prevent connection collision
        await new Promise(resolve => setTimeout(resolve, 800 * attempts));
      }
    }
  }

  // If all attempts failed
  console.error("All " + maxAttempts + " attempts failed for " + recipientEmail + ":", lastError);
  return res.status(500).json({ success: false, message: lastError?.message || "Failed to deliver email after retries" });
});

// API to generate smart email content using Gemini API
app.post("/api/mail/generate-content", async (req, res) => {
  const { prompt, tone, language = "English" } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, message: "Prompt is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Create an email based on this description: "${prompt}". 
Tone: ${tone || "professional"}. 
Language: ${language}.
Output should be formatted in standard JSON with two fields: "subject" (as a string) and "body" (as a well-formatted HTML string using professional, clean layout tags such as paragraphs, bullet points, and strong bold weights, but do NOT include <html> or <body> tags, just modern HTML formatting suitable for an email body). Use variables in double curly braces like {{name}} or other custom tags if they fit, e.g., {{company}}. Do not use markdown inside JSON fields. Just return the JSON structure.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            subject: { type: "STRING" as any, description: "Eye-catching subject line" },
            body: { type: "STRING" as any, description: "Professional HTML formatted email body with tags like <p>, <br>, <strong>, <ul>, <li>" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No text generated from Gemini");
    }

    const parsed = JSON.parse(textResult.trim());
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to generate smart email content" });
  }
});

// Export Express app for Vercel serverless function handling
export default app;
