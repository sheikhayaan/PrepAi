/**
 * Native RFC 6238 TOTP Utility
 * Standard Two-Factor Authentication with zero third-party dependencies
 */
const crypto = require('crypto');

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length = 20) {
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < randomBytes.length; i++) {
    result += BASE32_CHARS[randomBytes[i] % 32];
  }
  return result;
}

function base32ToBuffer(base32) {
  const cleaned = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateHOTP(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

function verifyTOTP(token, base32Secret, window = 1) {
  if (!token || !base32Secret || token.length !== 6) return false;
  try {
    const secretBuffer = base32ToBuffer(base32Secret);
    const epochSeconds = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(epochSeconds / 30);

    for (let step = currentStep - window; step <= currentStep + window; step++) {
      const generated = generateHOTP(secretBuffer, step);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(generated))) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

module.exports = {
  generateBase32Secret,
  verifyTOTP,
  generateRecoveryCodes,
};
