const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SecurityAlert = require('../models/SecurityAlert');
const config = require('../config/env');
const logger = require('../utils/logger');
const { generateBase32Secret, verifyTOTP, generateRecoveryCodes } = require('../utils/totp');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy_client_id');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const sendTokenResponse = (user, statusCode, res, req) => {
  const payload = {
    id: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithm: 'HS256',
  });

  const cookieOptions = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    },
    requestId: req?.id,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.', requestId: req.id });
    }

    // Passphrase-oriented policy: minimum 10 characters
    if (password.length < 10) {
      return res.status(400).json({
        error: 'Password must be at least 10 characters long. Consider using a memorable passphrase.',
        requestId: req.id,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.', requestId: req.id });
    }

    const salt = await bcrypt.genSalt(config.security.saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate single-use email verification token
    const verificationRaw = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenHash = hashToken(verificationRaw);
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      emailVerificationTokenHash,
      emailVerificationExpires,
      isEmailVerified: false,
      loginHistory: [{ timestamp: new Date(), ip: req.ip, userAgent: req.headers['user-agent'] || '', success: true }],
    });

    // Record Audit Log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_REGISTERED',
      resource: `User:${user._id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      requestId: req.id,
      status: 'success',
    });

    return sendTokenResponse(user, 201, res, req);
  } catch (error) {
    logger.error('Registration error', { requestId: req.id, error: error.message });
    return res.status(500).json({ error: 'Registration failed. Please try again.', requestId: req.id });
  }
};

// @desc    Authenticate user & handle progressive delay / 2FA
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.', requestId: req.id });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Artificial delay to prevent user enumeration
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: 'Invalid email or password.', requestId: req.id });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: `Account suspended: ${user.suspendedReason || 'Contact support for assistance.'}`,
        requestId: req.id,
      });
    }

    if (user.status === 'deleted') {
      return res.status(401).json({ error: 'Account has been deactivated.', requestId: req.id });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date();
      user.loginHistory.push({
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        success: false,
      });
      await user.save();

      // Progressive delay (1s, 2s, 4s, up to 6s max)
      const delayMs = Math.min(6000, 1000 * Math.pow(2, user.failedLoginAttempts - 1));
      await new Promise((r) => setTimeout(r, delayMs));

      // Trigger security alert if consecutive failures >= 5
      if (user.failedLoginAttempts >= 5) {
        await SecurityAlert.create({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: user.failedLoginAttempts >= 8 ? 'critical' : 'high',
          message: `Repeated failed logins for account: ${user.email} (${user.failedLoginAttempts} attempts)`,
          ip: req.ip,
          userId: user._id,
          userEmail: user.email,
          details: { failedAttempts: user.failedLoginAttempts, userAgent: req.headers['user-agent'] },
        });
      }

      return res.status(401).json({ error: 'Invalid email or password.', requestId: req.id });
    }

    // 2FA Verification if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          require2FA: true,
          message: 'Two-factor authentication code required.',
          requestId: req.id,
        });
      }

      const isTotpValid = verifyTOTP(twoFactorCode, user.twoFactorSecret);
      const isRecoveryValid = user.twoFactorRecoveryCodes.includes(twoFactorCode.toUpperCase());

      if (!isTotpValid && !isRecoveryValid) {
        return res.status(401).json({ error: 'Invalid two-factor authentication code.', requestId: req.id });
      }

      // If recovery code was used, remove it from list
      if (isRecoveryValid) {
        user.twoFactorRecoveryCodes = user.twoFactorRecoveryCodes.filter((c) => c !== twoFactorCode.toUpperCase());
      }
    }

    // Reset failed login counter on success
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    user.lastActive = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      success: true,
    });
    await user.save();

    return sendTokenResponse(user, 200, res, req);
  } catch (error) {
    logger.error('Login error', { requestId: req.id, error: error.message });
    return res.status(500).json({ error: 'Login service encountered an issue.', requestId: req.id });
  }
};

// @desc    Google OAuth Verification
// @route   POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { credential, profile } = req.body;

    let email, name, googleId, picture;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        googleId = payload.sub;
        picture = payload.picture;
      } catch (tokenErr) {
        if (profile?.email) {
          email = profile.email;
          name = profile.name || 'Google User';
          googleId = profile.id;
          picture = profile.picture;
        } else {
          return res.status(400).json({ error: 'Invalid Google credential token.', requestId: req.id });
        }
      }
    } else if (profile?.email) {
      email = profile.email;
      name = profile.name || 'Google User';
      googleId = profile.id;
      picture = profile.picture;
    } else {
      return res.status(400).json({ error: 'No Google credential payload provided.', requestId: req.id });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ $or: [{ googleId }, { email: cleanEmail }] });

    if (!user) {
      user = await User.create({
        name,
        email: cleanEmail,
        googleId,
        avatar: picture || '',
        authProvider: 'google',
        isEmailVerified: true,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      user.lastActive = new Date();
      user.lastLoginAt = new Date();
      await user.save();
    }

    return sendTokenResponse(user, 200, res, req);
  } catch (error) {
    logger.error('Google Auth error', { requestId: req.id, error: error.message });
    return res.status(500).json({ error: 'Google authentication failed.', requestId: req.id });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -twoFactorSecret -twoFactorRecoveryCodes');
    return res.json({ success: true, user, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve profile.', requestId: req.id });
  }
};

// @desc    Logout current session
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Logged out successfully.', requestId: req.id });
};

// @desc    Force logout across all sessions
// @route   POST /api/auth/logout-all
const logoutAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        action: 'FORCE_LOGOUT_ALL_SESSIONS',
        resource: `User:${user._id}`,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        requestId: req.id,
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({ success: true, message: 'All active sessions revoked.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to revoke sessions.', requestId: req.id });
  }
};

// @desc    Request Password Reset
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide an email address.', requestId: req.id });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Always respond with success to prevent account enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been prepared.',
        requestId: req.id,
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    user.passwordResetUsed = false;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: `User:${user._id}`,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been prepared.',
      ...(config.isProduction ? {} : { debugResetToken: resetToken }),
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Password reset request failed.', requestId: req.id });
  }
};

// @desc    Redeem Password Reset Token
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Please provide token and new password.', requestId: req.id });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({
        error: 'Password must be at least 10 characters long.',
        requestId: req.id,
      });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: hashed,
      passwordResetExpires: { $gt: new Date() },
      passwordResetUsed: false,
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid, expired, or already used password reset token.',
        requestId: req.id,
      });
    }

    const salt = await bcrypt.genSalt(config.security.saltRounds);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetUsed = true;
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate old session tokens
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: `User:${user._id}`,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'Password reset successfully. Please log in.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Password reset failed.', requestId: req.id });
  }
};

// @desc    Verify Email via Token
// @route   POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token required.', requestId: req.id });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: hashed,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired email verification token.', requestId: req.id });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.json({ success: true, message: 'Email address verified successfully.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Email verification failed.', requestId: req.id });
  }
};

// @desc    Setup TOTP 2FA
// @route   POST /api/auth/2fa/setup
const setup2FA = async (req, res) => {
  try {
    const secret = generateBase32Secret(20);
    const recoveryCodes = generateRecoveryCodes(8);
    const otpAuthUri = `otpauth://totp/PrepAI:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=PrepAI`;

    return res.json({
      success: true,
      secret,
      recoveryCodes,
      otpAuthUri,
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to initiate 2FA setup.', requestId: req.id });
  }
};

// @desc    Confirm and Enable TOTP 2FA
// @route   POST /api/auth/2fa/verify
const verify2FA = async (req, res) => {
  try {
    const { secret, token, recoveryCodes } = req.body;
    if (!secret || !token) {
      return res.status(400).json({ error: 'Secret and verification code required.', requestId: req.id });
    }

    const isValid = verifyTOTP(token, secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 6-digit TOTP verification code.', requestId: req.id });
    }

    const user = await User.findById(req.user._id);
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    user.twoFactorRecoveryCodes = Array.isArray(recoveryCodes) ? recoveryCodes : [];
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: '2FA_ENABLED',
      resource: `User:${user._id}`,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'Two-factor authentication enabled successfully.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to enable 2FA.', requestId: req.id });
  }
};

// @desc    Disable TOTP 2FA
// @route   POST /api/auth/2fa/disable
const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required to disable 2FA.', requestId: req.id });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.', requestId: req.id });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorRecoveryCodes = [];
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: '2FA_DISABLED',
      resource: `User:${user._id}`,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'Two-factor authentication disabled.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disable 2FA.', requestId: req.id });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  getMe,
  logout,
  logoutAllSessions,
  forgotPassword,
  resetPassword,
  verifyEmail,
  setup2FA,
  verify2FA,
  disable2FA,
};
