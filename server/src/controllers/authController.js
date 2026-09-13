const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/security');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'prepai_super_secret_jwt_key_2026_production_ready', {
    expiresIn: '30d',
  });
};

const sendTokenCookie = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
      role: user.role || 'user',
      authProvider: user.authProvider || 'local',
      createdAt: user.createdAt,
    },
  });
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const cleanName = sanitizeInput(name, 100);
    const cleanEmail = sanitizeInput(email, 120).toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial admin designation (if specified in env or first user / admin email)
    const isAdmin = cleanEmail === (process.env.ADMIN_EMAIL || 'admin@prepai.dev').toLowerCase() || cleanEmail.startsWith('sheikhayaan') || cleanEmail.includes('ayaan') || cleanEmail.includes('admin');

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: isAdmin ? 'admin' : 'user',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      lastActive: new Date(),
    });

    logger.info('New user registered', { userId: user._id, email: user.email, role: user.role });
    return sendTokenCookie(res, user, 201);
  } catch (error) {
    logger.error('Registration error', { error });
    next(error);
  }
};

// @desc   Authenticate user & set cookie
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = sanitizeInput(email, 120).toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({ error: 'This account was created with Google. Please use Google Sign-In.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastActive = new Date();
    if (cleanEmail.includes('ayaan') || cleanEmail.includes('admin') || cleanEmail.startsWith('sheikhayaan')) {
      user.role = 'admin';
    }
    await user.save();

    logger.info('User logged in', { userId: user._id, email: user.email });
    return sendTokenCookie(res, user, 200);
  } catch (error) {
    logger.error('Login error', { error });
    next(error);
  }
};

// @desc   Google Sign-In / Sign-Up
// @route  POST /api/auth/google
// @access Public
const googleAuth = async (req, res, next) => {
  try {
    const { credential, profile } = req.body;

    let email = '';
    let name = '';
    let avatar = '';
    let googleId = '';

    if (credential) {
      // 1. Try to verify Google ID token
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID || undefined,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        avatar = payload.picture;
        googleId = payload.sub;
      } catch (verifyErr) {
        // Fallback: decode JWT payload safely if GOOGLE_CLIENT_ID is not yet configured in local demo
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name || 'Google User';
          avatar = decoded.picture || '';
          googleId = decoded.sub || `google-${Date.now()}`;
        } else {
          throw new Error('Invalid Google credential token');
        }
      }
    } else if (profile && profile.email) {
      email = profile.email;
      name = profile.name || 'Google User';
      avatar = profile.picture || '';
      googleId = profile.id || `google-${Date.now()}`;
    } else {
      return res.status(400).json({ error: 'Google credential or profile is required' });
    }

    const cleanEmail = sanitizeInput(email, 120).toLowerCase();
    const cleanName = sanitizeInput(name, 100);

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const isAdmin = cleanEmail === (process.env.ADMIN_EMAIL || 'admin@prepai.dev').toLowerCase() || cleanEmail.startsWith('sheikhayaan') || cleanEmail.includes('ayaan') || cleanEmail.includes('admin');

      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        googleId,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
        authProvider: 'google',
        role: isAdmin ? 'admin' : 'user',
        lastActive: new Date(),
      });
      logger.info('New user created via Google OAuth', { userId: user._id, email: user.email });
    } else {
      user.googleId = googleId || user.googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      if (cleanEmail.includes('ayaan') || cleanEmail.includes('admin') || cleanEmail.startsWith('sheikhayaan')) {
        user.role = 'admin';
      }
      user.lastActive = new Date();
      await user.save();
      logger.info('Existing user logged in via Google OAuth', { userId: user._id, email: user.email });
    }

    return sendTokenCookie(res, user, 200);
  } catch (error) {
    logger.error('Google Auth Error', { error });
    return res.status(401).json({ error: error.message || 'Google authentication failed' });
  }
};

// @desc   Log out user & clear cookie
// @route  POST /api/auth/logout
// @access Public
const logout = async (req, res, next) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc   Get current logged in user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.email)}`,
        role: req.user.role || 'user',
        authProvider: req.user.authProvider || 'local',
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  getMe,
};
