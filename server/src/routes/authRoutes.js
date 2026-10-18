const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { standardApiTimeout } = require('../middleware/timeoutMiddleware');

router.use(standardApiTimeout);

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-email', verifyEmail);

router.get('/me', protect, getMe);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAllSessions);

// 2FA Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
