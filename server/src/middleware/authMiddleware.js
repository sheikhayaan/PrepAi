const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Optional fallback to Bearer header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Not authorized: No authentication token provided.',
        requestId: req.id,
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        error: 'Not authorized: User account no longer exists.',
        requestId: req.id,
      });
    }

    // Status check
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: `Account suspended: ${user.suspendedReason || 'Please contact support.'}`,
        requestId: req.id,
        suspended: true,
      });
    }

    if (user.status === 'deleted') {
      return res.status(401).json({
        error: 'Account deleted.',
        requestId: req.id,
      });
    }

    // Token version check (Session Revocation / Force Logout)
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion < user.tokenVersion) {
      return res.status(401).json({
        error: 'Session expired: You have been logged out on another device. Please log in again.',
        requestId: req.id,
        sessionRevoked: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Auth token verification failure', {
      requestId: req.id,
      error: error.message,
    });

    return res.status(401).json({
      error: 'Not authorized: Invalid or expired session token.',
      requestId: req.id,
    });
  }
};

const adminProtect = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn('Unauthorized admin access attempt', {
      requestId: req.id,
      userId: req.user?._id,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'Access denied: Superadmin or Admin privileges required.',
      requestId: req.id,
    });
  }
};

module.exports = { protect, adminProtect };
