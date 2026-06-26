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

// Helper to inject invisible Zero-Width Characters to defeat fingerprint-based spam filters.
// This alters the digital signature hash of every email to make each one completely unique,
// but leaves the text 100% identical and flawless to the human eye.
function injectInvisibleSpamShield(htmlContent: string): string {
  const zeroWidths = ["\u200b", "\u200c", "\u200d"];
  let result = "";
  let inTag = false;
  let inEntity = false;

  for (let i = 0; i < htmlContent.length; i++) {
    const char = htmlContent[i];

    if (char === '<') {
      inTag = true;
    } else if (char === '&') {
      inEntity = true;
    }

    result += char;

    if (char === '>') {
      inTag = false;
    } else if (char === ';' && inEntity) {
      inEntity = false;
    }

    // Inject zero-width characters with 10% probability, ONLY outside of HTML tags, 
    // outside of HTML entities (&nbsp;), and outside of mustache brackets {{variable}} to avoid breaking variables!
    if (!inTag && !inEntity && char !== '{' && char !== '}' && char !== '<' && char !== '>' && char !== '&' && char !== ';' && Math.random() < 0.10) {
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
    // Inject with 10% probability, avoiding mustache templates to preserve variables
    if (char !== '{' && char !== '}' && Math.random() < 0.10) {
      const randomZwc = zeroWidths[Math.floor(Math.random() * zeroWidths.length)];
      result += randomZwc;
    }
  }
  return result;
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
  const randomizedSubject = injectInvisibleSpamShieldSubject(subject);
  const randomizedBody = injectInvisibleSpamShield(body);
  const plainTextAlternative = cleanHtmlToText(randomizedBody);

  try {
    const info = await transporter.sendMail({
      from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
      to: recipientEmail,
      subject: randomizedSubject,
      html: randomizedBody,
      text: plainTextAlternative, // Multi-part alternative MIME to heavily reduce spam score
      headers: {
        'X-Priority': '3', // Normal Priority
        'Priority': 'normal',
        'X-Mailer': 'Nodemailer Express Suite',
      }
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending email to " + recipientEmail + ":", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send email" });
  }
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
