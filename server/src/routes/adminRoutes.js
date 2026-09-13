const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAdminUsers,
  getUserDetails,
  updateUserRole,
  getAdminRatings,
  getSystemHealth
} = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// All admin routes require authenticated session with admin role
router.use(protect);
router.use(adminProtect);

router.get('/overview', getAdminOverview);
router.get('/users', getAdminUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/role', updateUserRole);
router.get('/ratings', getAdminRatings);
router.get('/health', getSystemHealth);

module.exports = router;
