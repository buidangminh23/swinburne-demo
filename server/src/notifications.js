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
    channel: "logged",
    delivered: false,
    readAt: null,
    createdAt: new Date().toISOString()
  };
  record(entry);

  if (recipients.length === 0) {
    return entry;
  }

  if (liveSmtp) {
    try {
      await transport.sendMail({
        from: fromAddress,
        to: recipients.join(", "),
        subject,
        text: message
      });
      entry.channel = "smtp";
      entry.delivered = true;
    } catch (error) {
      console.error(`[notification] delivery failed for ${type}: ${error.message}`);
    }
  } else {
    entry.delivered = true;
  }
  console.log(`[notification:${type}] -> ${recipients.join(", ")} :: ${subject}`);
  return entry;
}

function matchesRecipient(entry, recipient) {
  if (!recipient) {
    return true;
  }
  const target = String(recipient).toLowerCase();
  return entry.to.some((address) => String(address).toLowerCase() === target);
}

export function listNotifications(limit = 20, { recipient, type, status, search } = {}) {
  let entries = history.filter((entry) => matchesRecipient(entry, recipient));
  if (type && type !== "ALL") {
    entries = entries.filter((entry) => entry.type === type);
  }
  if (status === "unread") {
    entries = entries.filter((entry) => !entry.readAt);
  } else if (status === "read") {
    entries = entries.filter((entry) => entry.readAt);
  }
  if (search) {
    const needle = String(search).toLowerCase();
    entries = entries.filter((entry) =>
      `${entry.subject ?? ""} ${entry.message ?? ""}`.toLowerCase().includes(needle)
    );
  }
  return entries.slice(0, Math.max(0, limit));
}

export function markNotificationRead(id, recipient) {
  const entry = history.find(
    (candidate) => candidate.id === Number(id) && matchesRecipient(candidate, recipient)
  );
  if (!entry) {
    return null;
  }
  entry.readAt = entry.readAt ?? new Date().toISOString();
  return entry;
}
