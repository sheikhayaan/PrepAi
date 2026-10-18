const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAdminUsers,
  getUserDetails,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  forceLogoutUser,
  getSecurityAlerts,
  resolveSecurityAlert,
  getAuditLogs,
  exportAuditLogsCsv,
  getAdminRatings,
  getSystemHealth,
} = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/authMiddleware');
const { adminLimiter } = require('../middleware/rateLimiter');
const { heavyQueryTimeout } = require('../middleware/timeoutMiddleware');

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(adminProtect);
// Isolated, tighter bucket keyed by admin user (never the standard user budget).
router.use(adminLimiter);
router.use(heavyQueryTimeout);

router.get('/overview', getAdminOverview);
router.get('/users', getAdminUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/unsuspend', unsuspendUser);
router.post('/users/:id/force-logout', forceLogoutUser);

router.get('/alerts', getSecurityAlerts);
router.patch('/alerts/:id/resolve', resolveSecurityAlert);

router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogsCsv);

router.get('/ratings', getAdminRatings);
router.get('/health', getSystemHealth);

// Learning-loop control plane (versioned, human-gated artifacts).
router.use('/learning', require('./learningRoutes'));

module.exports = router;
