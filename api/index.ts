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

  try {
    const info = await transporter.sendMail({
      from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
      to: recipientEmail,
      subject: subject,
      html: body,
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
