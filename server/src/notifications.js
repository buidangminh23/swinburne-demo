import nodemailer from "nodemailer";

const MAX_LOG = 100;
const history = [];
let sequence = 0;

function buildTransport() {
  const host = process.env.SMTP_HOST;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = buildTransport();
const fromAddress = process.env.MAIL_FROM ?? "Swinburne Equipment Portal <no-reply@swin.edu.au>";
const liveSmtp = Boolean(process.env.SMTP_HOST);

function record(entry) {
  history.unshift(entry);
  if (history.length > MAX_LOG) {
    history.length = MAX_LOG;
  }
}

export async function sendNotification({ to, type, subject, message, meta = {} }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const entry = {
    id: ++sequence,
    type,
    to: recipients,
    subject,
    message,
    meta,
    channel: liveSmtp ? "smtp" : "logged",
    createdAt: new Date().toISOString()
  };
  record(entry);

  if (recipients.length === 0) {
    return entry;
  }

  try {
    await transport.sendMail({
      from: fromAddress,
      to: recipients.join(", "),
      subject,
      text: message
    });
  } catch (error) {
    console.error(`[notification] delivery failed for ${type}: ${error.message}`);
  }
  console.log(`[notification:${type}] -> ${recipients.join(", ")} :: ${subject}`);
  return entry;
}

export function listNotifications(limit = 20) {
  return history.slice(0, Math.max(0, limit));
}
