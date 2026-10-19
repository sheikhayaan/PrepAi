/**
 * Transactional email delivery.
 *
 * The platform must not depend on a single vendor, and a mail outage must never
 * break registration or password reset. This module therefore:
 *  - supports `console` (dev), `resend`, `sendgrid` and a generic `webhook`
 *  - uses global fetch only (no new runtime dependency)
 *  - never throws: every failure is logged + counted, callers stay responsive
 *  - never logs tokens or full action URLs
 */
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const NETWORK_PROVIDERS = new Set(['resend', 'sendgrid', 'webhook']);

function providerName() {
  return String(config.email.provider || 'console').toLowerCase();
}

function isEmailDeliveryConfigured() {
  const provider = providerName();
  if (provider === 'console') return false;
  if (provider === 'webhook') return Boolean(config.email.webhookUrl);
  return Boolean(config.email.apiKey);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return '[invalid]';
  return `${local.slice(0, 1)}***@${domain}`;
}

/**
 * Build the two links the product actually uses. `APP_PUBLIC_URL` wins over
 * CLIENT_URL so a deployment can point emails at its canonical domain even
 * when the API is served from a different host.
 */
function actionUrl(pathname, token) {
  const base = String(config.email.appUrl || '').replace(/\/+$/, '');
  return `${base}${pathname}?token=${encodeURIComponent(token)}`;
}

function layout({ title, intro, ctaLabel, ctaUrl, footer }) {
  return `<!doctype html>
<html><body style="margin:0;background:#05070d;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8eefc">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070d;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#0b1220;border:1px solid #1e293b;border-radius:16px;padding:32px">
        <tr><td>
          <div style="font-size:13px;letter-spacing:.18em;color:#22d3ee;font-weight:700">PREPAI</div>
          <h1 style="font-size:22px;margin:16px 0 8px;color:#f8fafc">${escapeHtml(title)}</h1>
          <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0 0 24px">${escapeHtml(intro)}</p>
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">${escapeHtml(ctaLabel)}</a>
          <p style="font-size:12px;line-height:1.6;color:#64748b;margin:24px 0 0">If the button does not work, paste this link into your browser:<br/><span style="color:#93c5fd;word-break:break-all">${escapeHtml(ctaUrl)}</span></p>
          <p style="font-size:12px;line-height:1.6;color:#64748b;margin:16px 0 0">${escapeHtml(footer || 'If you did not request this, you can ignore this email.')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildVerificationEmail({ name, token }) {
  const url = actionUrl('/verify-email', token);
  return {
    type: 'verification',
    subject: 'Verify your PrepAI email address',
    text: `Hi ${name || 'there'},\n\nConfirm your PrepAI email address within 24 hours:\n${url}\n\nIf you did not create an account, ignore this email.`,
    html: layout({
      title: 'Confirm your email',
      intro: `Hi ${name || 'there'}, confirm your address to unlock interview history, analytics and scoring. This link expires in 24 hours.`,
      ctaLabel: 'Verify email',
      ctaUrl: url,
    }),
  };
}

function buildPasswordResetEmail({ name, token }) {
  const url = actionUrl('/reset-password', token);
  return {
    type: 'password_reset',
    subject: 'Reset your PrepAI password',
    text: `Hi ${name || 'there'},\n\nReset your PrepAI password within 60 minutes:\n${url}\n\nIf you did not request this, your password is unchanged.`,
    html: layout({
      title: 'Reset your password',
      intro: `Hi ${name || 'there'}, use the button below to choose a new password. This link expires in 60 minutes and can be used once.`,
      ctaLabel: 'Reset password',
      ctaUrl: url,
      footer: 'If you did not request a reset, no action is needed. Your current password still works.',
    }),
  };
}

async function postJson(url, body, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.email.timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function deliver({ to, subject, text, html }) {
  const provider = providerName();
  const from = config.email.from;

  if (provider === 'console') {
    // Dev-only fallback: keeps the reset/verification flow testable without a
    // mail account. Never print action links in production.
    if (!config.isProduction) {
      logger.info('email.console', { to: maskEmail(to), subject });
      const link = String(text || '').match(/https?:\/\/\S+/)?.[0];
      if (link) console.log(`[email:console] ${subject} -> ${link}`);
    }
    return { ok: true, provider, skipped: true };
  }

  if (provider === 'resend') {
    const res = await postJson(
      'https://api.resend.com/emails',
      { from, to: [to], subject, text, html, ...(config.email.replyTo ? { reply_to: config.email.replyTo } : {}) },
      { Authorization: `Bearer ${config.email.apiKey}` }
    );
    return { ok: res.ok, provider, status: res.status };
  }

  if (provider === 'sendgrid') {
    const res = await postJson(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        ...(config.email.replyTo ? { reply_to: { email: config.email.replyTo } } : {}),
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      },
      { Authorization: `Bearer ${config.email.apiKey}` }
    );
    return { ok: res.ok, provider, status: res.status };
  }

  if (provider === 'webhook') {
    if (!config.email.webhookUrl) throw new Error('EMAIL_WEBHOOK_URL is not configured');
    const res = await postJson(
      config.email.webhookUrl,
      { from, to, subject, text, html },
      config.email.apiKey ? { Authorization: `Bearer ${config.email.apiKey}` } : {}
    );
    return { ok: res.ok, provider, status: res.status };
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

/**
 * Public entry point. Resolves to `{ ok, provider }` and never rejects, so a
 * caller can `void sendEmail(...)` without risking an unhandled rejection.
 */
async function sendEmail({ to, subject, text, html, type = 'transactional' }) {
  const provider = providerName();
  if (!to || !subject || (!text && !html)) {
    metrics.inc('prepai_email_sent_total', { provider, type, status: 'invalid' });
    logger.warn('email.invalid_message', { type });
    return { ok: false, provider, error: 'invalid_message' };
  }

  if (NETWORK_PROVIDERS.has(provider) && !isEmailDeliveryConfigured()) {
    metrics.inc('prepai_email_sent_total', { provider, type, status: 'unconfigured' });
    logger.error('email.provider_unconfigured', { provider, type });
    return { ok: false, provider, error: 'provider_unconfigured' };
  }

  try {
    const result = await deliver({ to, subject, text, html });
    metrics.inc('prepai_email_sent_total', { provider, type, status: result.ok ? 'sent' : 'failed' });
    if (!result.ok) logger.error('email.delivery_failed', { provider, type, status: result.status });
    return result;
  } catch (error) {
    metrics.inc('prepai_email_sent_total', { provider, type, status: 'failed' });
    logger.error('email.delivery_error', { provider, type, error: error.message });
    return { ok: false, provider, error: error.message };
  }
}

function sendVerificationEmail(user, token) {
  const message = buildVerificationEmail({ name: user.name, token });
  return sendEmail({ to: user.email, ...message });
}

function sendPasswordResetEmail(user, token) {
  const message = buildPasswordResetEmail({ name: user.name, token });
  return sendEmail({ to: user.email, ...message });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
  actionUrl,
  isEmailDeliveryConfigured,
  escapeHtml,
  maskEmail,
};
