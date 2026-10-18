const mongoose = require('mongoose');
const os = require('os');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Rating = require('../models/Rating');
const AuditLog = require('../models/AuditLog');
const SecurityAlert = require('../models/SecurityAlert');
const telemetryTracker = require('../utils/telemetryTracker');
const logger = require('../utils/logger');

// Helper for admin re-authentication on sensitive actions
async function verifyAdminPassword(adminUser, password) {
  if (!password) return false;
  const adminDoc = await User.findById(adminUser._id);
  if (!adminDoc) return false;
  return adminDoc.matchPassword(password);
}

// GET /api/admin/overview
const getAdminOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ status: { $ne: 'deleted' } });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const totalSessions = await InterviewSession.countDocuments();
    const completedSessions = await InterviewSession.countDocuments({ status: 'completed' });
    const totalRatings = await Rating.countDocuments();
    const activeSecurityAlerts = await SecurityAlert.countDocuments({ status: 'active' });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers24h = await User.countDocuments({
      lastActive: { $gte: oneDayAgo },
      status: 'active',
    });
    const newUsers7d = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Average Score calculation
    const scoreAgg = await InterviewSession.aggregate([
      { $match: { status: 'completed', 'finalScore.overall': { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: '$finalScore.overall' } } },
    ]);
    const averageScore = scoreAgg.length > 0 ? parseFloat(scoreAgg[0].avgScore.toFixed(2)) : 0;

    // Rating Metrics
    const ratingAgg = await Rating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          voiceQuality: { $avg: '$categories.ai_voice_quality' },
          questionDepth: { $avg: '$categories.question_depth' },
          scoringAccuracy: { $avg: '$categories.scoring_accuracy' },
          latencySpeed: { $avg: '$categories.latency_speed' },
        },
      },
    ]);

    const ratingsMetrics =
      ratingAgg.length > 0
        ? {
            overall: parseFloat(ratingAgg[0].avgRating.toFixed(2)),
            voiceQuality: parseFloat((ratingAgg[0].voiceQuality || 5).toFixed(2)),
            questionDepth: parseFloat((ratingAgg[0].questionDepth || 5).toFixed(2)),
            scoringAccuracy: parseFloat((ratingAgg[0].scoringAccuracy || 5).toFixed(2)),
            latencySpeed: parseFloat((ratingAgg[0].latencySpeed || 5).toFixed(2)),
          }
        : { overall: 0, voiceQuality: 0, questionDepth: 0, scoringAccuracy: 0, latencySpeed: 0 };

    // Company Tier Distribution
    const companyDistribution = await InterviewSession.aggregate([
      { $group: { _id: '$companyTier', count: { $sum: 1 } } },
    ]);

    // Live Telemetry Snapshot
    const telemetry = telemetryTracker.getSnapshot();

    return res.json({
      metrics: {
        totalUsers,
        suspendedUsers,
        activeUsers24h,
        newUsers7d,
        totalSessions,
        completedSessions,
        averageScore,
        totalRatings,
        activeSecurityAlerts,
        ratingsMetrics,
      },
      telemetry,
      charts: {
        companyDistribution,
      },
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Admin overview error', { requestId: req.id, error: error.message });
    return res.status(500).json({ error: 'Failed to fetch admin overview', requestId: req.id });
  }
};

// GET /api/admin/users
const getAdminUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -twoFactorSecret -twoFactorRecoveryCodes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    return res.json({
      users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users', requestId: req.id });
  }
};

// GET /api/admin/users/:id
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-passwordHash -twoFactorSecret -twoFactorRecoveryCodes'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found', requestId: req.id });
    }

    const [sessions, ratings, auditLogs] = await Promise.all([
      InterviewSession.find({ userId: user._id }).sort({ startedAt: -1 }).limit(10),
      Rating.find({ userId: user._id }).sort({ createdAt: -1 }),
      AuditLog.find({ $or: [{ userId: user._id }, { targetUserId: user._id }] })
        .sort({ timestamp: -1 })
        .limit(15),
    ]);

    return res.json({
      user,
      sessions,
      ratings,
      auditLogs,
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user details', requestId: req.id });
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role, adminPassword } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be user or admin', requestId: req.id });
    }

    // Require admin password confirmation for role changes
    if (adminPassword) {
      const isAuthValid = await verifyAdminPassword(req.user, adminPassword);
      if (!isAuthValid) {
        return res.status(401).json({ error: 'Admin password confirmation failed.', requestId: req.id });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found', requestId: req.id });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: 'admin',
      action: 'USER_ROLE_UPDATED',
      resource: `User:${user._id}`,
      targetUserId: user._id,
      changes: { previousRole, newRole: role },
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: `Role updated to ${role}`, user, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user role', requestId: req.id });
  }
};

// POST /api/admin/users/:id/suspend
const suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found', requestId: req.id });

    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Cannot suspend another admin account.', requestId: req.id });
    }

    user.status = 'suspended';
    user.suspendedReason = reason || 'Administrative suspension';
    user.suspendedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate active sessions immediately
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'USER_SUSPENDED',
      resource: `User:${user._id}`,
      targetUserId: user._id,
      metadata: { reason: user.suspendedReason },
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'User suspended and sessions revoked.', user, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to suspend user', requestId: req.id });
  }
};

// POST /api/admin/users/:id/unsuspend
const unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found', requestId: req.id });

    user.status = 'active';
    user.suspendedReason = '';
    user.suspendedAt = null;
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'USER_UNSUSPENDED',
      resource: `User:${user._id}`,
      targetUserId: user._id,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'User account restored to active.', user, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unsuspend user', requestId: req.id });
  }
};

// POST /api/admin/users/:id/force-logout
const forceLogoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found', requestId: req.id });

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADMIN_FORCE_LOGOUT_USER',
      resource: `User:${user._id}`,
      targetUserId: user._id,
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'User force logged out on all devices.', requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to force logout user', requestId: req.id });
  }
};

// GET /api/admin/alerts
const getSecurityAlerts = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (severity) {
      query.severity = severity;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total, activeCount] = await Promise.all([
      SecurityAlert.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum),
      SecurityAlert.countDocuments(query),
      SecurityAlert.countDocuments({ status: 'active' }),
    ]);

    return res.json({
      alerts,
      pagination: { total, activeCount, page: pageNum, pages: Math.ceil(total / limitNum) },
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch security alerts', requestId: req.id });
  }
};

// PATCH /api/admin/alerts/:id/resolve
const resolveSecurityAlert = async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const alert = await SecurityAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found', requestId: req.id });

    // Immutable update: update status without destroying original event
    alert.status = 'resolved';
    alert.resolvedBy = req.user._id;
    alert.resolvedByName = req.user.name;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = resolutionNotes || 'Resolved by security admin';
    await alert.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'SECURITY_ALERT_RESOLVED',
      resource: `SecurityAlert:${alert._id}`,
      metadata: { alertType: alert.type, notes: alert.resolutionNotes },
      ip: req.ip,
      requestId: req.id,
    });

    return res.json({ success: true, message: 'Security alert resolved.', alert, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve alert', requestId: req.id });
  }
};

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { action, search, page = 1, limit = 30 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ userEmail: regex }, { userName: regex }, { resource: regex }, { action: regex }];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(100, parseInt(limit, 10) || 30);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      logs,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
      requestId: req.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch audit logs', requestId: req.id });
  }
};

// GET /api/admin/audit-logs/export
const exportAuditLogsCsv = async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(1000);

    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Resource', 'IP', 'Status', 'RequestId'];
    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      `"${(log.userName || '').replace(/"/g, '""')}"`,
      `"${(log.userEmail || '').replace(/"/g, '""')}"`,
      log.userRole,
      log.action,
      `"${(log.resource || '').replace(/"/g, '""')}"`,
      log.ip,
      log.status,
      log.requestId,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'AUDIT_LOGS_EXPORTED_CSV',
      resource: 'AuditLogs',
      metadata: { recordsCount: logs.length },
      ip: req.ip,
      requestId: req.id,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="prepai_audit_${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export audit logs', requestId: req.id });
  }
};

// GET /api/admin/ratings
const getAdminRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({}).sort({ createdAt: -1 }).limit(50);
    return res.json({ ratings, requestId: req.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch platform ratings', requestId: req.id });
  }
};

// GET /api/admin/health
const getSystemHealth = async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const stateMap = { 0: 'Disconnected', 1: 'Connected (Healthy)', 2: 'Connecting', 3: 'Disconnecting' };

    const healthData = {
      status: mongoState === 1 ? 'Healthy' : 'Degraded',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memoryUsageMb: {
          rss: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          heapTotal: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
          heapUsed: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
        },
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        loadAverage: os.loadavg(),
      },
      database: {
        name: 'MongoDB',
        status: stateMap[mongoState] || 'Unknown',
        host: mongoose.connection.host || '127.0.0.1',
        port: mongoose.connection.port || 27017,
      },
      telemetry: telemetryTracker.getSnapshot(),
      requestId: req.id,
    };

    return res.json(healthData);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch system health', requestId: req.id });
  }
};

module.exports = {
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
};
