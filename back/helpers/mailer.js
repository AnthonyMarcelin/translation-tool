const nodemailer = require('nodemailer');
const { smtp, APP_URL } = require('../config');

// Build a transport only if SMTP is configured. Otherwise emails are logged to
// the console so local dev and demos still surface the invite link.
let transport = null;
if (smtp.host && smtp.user && smtp.pass) {
  transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

function inviteUrl(token) {
  return `${APP_URL.replace(/\/$/, '')}/invite/${token}`;
}

async function sendInviteEmail({ email, token, projectName, orgName, role }) {
  const url = inviteUrl(token);

  if (!transport) {
    console.log(`[Invite] (SMTP not configured) ${email} → ${projectName}: ${url}`);
    return { sent: false, url };
  }

  const subject = `You've been invited to ${projectName}`;
  const text =
    `You've been invited to join the project "${projectName}"` +
    (orgName ? ` in ${orgName}` : '') +
    ` as ${role}.\n\nAccept your invitation: ${url}\n\nThis link expires in 7 days.`;
  const html =
    `<p>You've been invited to join the project <strong>${projectName}</strong>` +
    (orgName ? ` in <strong>${orgName}</strong>` : '') +
    ` as <strong>${role}</strong>.</p>` +
    `<p><a href="${url}">Accept your invitation</a></p>` +
    `<p style="color:#64748b;font-size:13px">This link expires in 7 days.</p>`;

  try {
    await transport.sendMail({ from: smtp.from, to: email, subject, text, html });
    return { sent: true, url };
  } catch (e) {
    // Don't fail the invite creation if email delivery fails — the token is
    // still returned to the caller, who can share the link manually.
    console.error('[Invite] Email delivery failed:', e.message);
    return { sent: false, url, error: e.message };
  }
}

module.exports = { sendInviteEmail, inviteUrl };
