import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

app.post("/api/send-single", async (req, res) => {
  const { email, appPassword, subject, messageBody, to } = req.body;

  if (!email || !appPassword || !to) {
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email.trim(), pass: appPassword.trim() }
    });

    const finalSubject = parseSpintax(subject);
    const finalBody = parseSpintax(messageBody);

    const mailOptions = {
      from: email.trim(),
      to: to.trim(),
      subject: finalSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${finalBody}
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, recipient: to });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
