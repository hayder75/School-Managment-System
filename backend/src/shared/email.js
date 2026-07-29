const config = require('../config');

let transporter = null;

async function getTransporter() {
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  try {
    const t = await getTransporter();
    await t.sendMail({ from: config.smtp.from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

async function sendInviteEmail(email, inviteLink, schoolName) {
  return sendMail({
    to: email,
    subject: `You've been invited to ${schoolName}`,
    html: `<p>You've been invited to join <strong>${schoolName}</strong>.</p><p>Click <a href="${inviteLink}">here</a> to set your password and get started.</p>`,
  });
}

async function sendFeeReminder(email, studentName, amount, dueDate) {
  return sendMail({
    to: email,
    subject: `Fee Reminder for ${studentName}`,
    html: `<p>Dear Parent,</p><p>This is a reminder that <strong>${studentName}</strong> has an outstanding fee of <strong>$${amount}</strong> due by <strong>${dueDate}</strong>.</p>`,
  });
}

module.exports = { sendMail, sendInviteEmail, sendFeeReminder };
