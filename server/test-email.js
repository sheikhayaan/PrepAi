/**
 * Email delivery checks (no network, no database).
 *
 * Verifies provider selection, template safety, and the guarantee that a mail
 * failure never escapes as an exception. Run with: node server/test-email.js
 */
const assert = require('assert');
const config = require('./src/config/env');
const email = require('./src/services/emailService');

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
}

function withProvider(provider, patch, fn) {
  const snapshot = { provider: config.email.provider, apiKey: config.email.apiKey, webhookUrl: config.email.webhookUrl };
  config.email.provider = provider;
  Object.assign(config.email, patch || {});
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      config.email.provider = snapshot.provider;
      config.email.apiKey = snapshot.apiKey;
      config.email.webhookUrl = snapshot.webhookUrl;
    });
}

(async () => {
  console.log('--- EMAIL DELIVERY ---');

  check('verification template carries a /verify-email link', () => {
    const message = email.buildVerificationEmail({ name: 'Ada', token: 'abc 123' });
    assert.strictEqual(message.type, 'verification');
    assert.ok(message.text.includes('/verify-email?token=abc%20123'), 'encoded token missing');
    assert.ok(message.html.includes('/verify-email?token=abc%20123'));
    assert.ok(message.subject.toLowerCase().includes('verify'));
  });

  check('reset template carries a /reset-password link', () => {
    const message = email.buildPasswordResetEmail({ name: 'Ada', token: 'xyz' });
    assert.strictEqual(message.type, 'password_reset');
    assert.ok(message.text.includes('/reset-password?token=xyz'));
    assert.ok(message.subject.toLowerCase().includes('reset'));
  });

  check('templates escape user-controlled names (no HTML injection)', () => {
    const message = email.buildVerificationEmail({ name: '<img src=x onerror=alert(1)>', token: 't' });
    assert.ok(!message.html.includes('<img src=x'), 'raw HTML leaked into the email body');
    assert.ok(message.html.includes('&lt;img src=x'), 'name was not escaped');
  });

  check('maskEmail never echoes the full address', () => {
    assert.strictEqual(email.maskEmail('someone@example.com'), 's***@example.com');
    assert.strictEqual(email.maskEmail('nonsense'), '[invalid]');
  });

  check('ACTION url honours APP_PUBLIC_URL and strips trailing slashes', () => {
    const previous = config.email.appUrl;
    config.email.appUrl = 'https://prepai.example.com/';
    const url = email.actionUrl('/reset-password', 'tok');
    config.email.appUrl = previous;
    assert.strictEqual(url, 'https://prepai.example.com/reset-password?token=tok');
  });

  await checkAsync('console provider resolves ok without any credentials', async () => {
    const result = await withProvider('console', {}, () => email.sendEmail({ to: 'a@b.com', subject: 's', text: 't' }));
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.provider, 'console');
  });

  await checkAsync('resend provider posts to the Resend API and reports success', async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ id: 'msg_1' }) };
    };
    try {
      const result = await withProvider('resend', { apiKey: 'test_key' }, () =>
        email.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>' })
      );
      assert.strictEqual(result.ok, true);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].url, 'https://api.resend.com/emails');
      assert.ok(String(calls[0].options.headers.Authorization).startsWith('Bearer '));
      const body = JSON.parse(calls[0].options.body);
      assert.deepStrictEqual(body.to, ['a@b.com']);
      assert.strictEqual(body.subject, 'Hi');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await checkAsync('sendgrid provider uses the v3 mail/send endpoint', async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 202 };
    };
    try {
      const result = await withProvider('sendgrid', { apiKey: 'sg' }, () =>
        email.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>' })
      );
      assert.strictEqual(result.ok, true);
      assert.strictEqual(calls[0].url, 'https://api.sendgrid.com/v3/mail/send');
      assert.strictEqual(JSON.parse(calls[0].options.body).personalizations[0].to[0].email, 'a@b.com');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await checkAsync('network failure resolves to ok:false instead of rejecting', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('socket hang up');
    };
    try {
      const result = await withProvider('resend', { apiKey: 'k' }, () =>
        email.sendEmail({ to: 'a@b.com', subject: 's', text: 't' })
      );
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'socket hang up');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await checkAsync('missing provider credentials short-circuit as unconfigured', async () => {
    const result = await withProvider('resend', { apiKey: '' }, () =>
      email.sendEmail({ to: 'a@b.com', subject: 's', text: 't' })
    );
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error, 'provider_unconfigured');
  });

  await checkAsync('invalid message is rejected without throwing', async () => {
    const result = await email.sendEmail({ to: '', subject: 's', text: 't' });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error, 'invalid_message');
  });

  console.log(`\n${process.exitCode ? 'EMAIL CHECKS FAILED' : 'ALL EMAIL CHECKS PASSED'} (${passed} checks)`);
})();
