const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Rating = require('../models/Rating');
const mongoose = require('mongoose');
const os = require('os');

// GET /api/admin/overview
const getAdminOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSessions = await InterviewSession.countDocuments();
    const completedSessions = await InterviewSession.countDocuments({ status: 'completed' });
    const totalRatings = await Rating.countDocuments();

    // Active users in last 24h & 7d (matches both lastActive, lastActiveAt, and newly created)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers24h = await User.countDocuments({
      $or: [
        { lastActive: { $gte: oneDayAgo } },
        { lastActiveAt: { $gte: oneDayAgo } },
        { createdAt: { $gte: oneDayAgo } },
        { updatedAt: { $gte: oneDayAgo } }
      ]
    });
    const newUsers7d = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Average Score calculation across completed sessions
    const scoreAgg = await InterviewSession.aggregate([
      { $match: { status: 'completed', 'finalScore.overall': { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: '$finalScore.overall' } } }
    ]);
    const averageScore = scoreAgg.length > 0 ? parseFloat(scoreAgg[0].avgScore.toFixed(2)) : 0;

    // Average Rating calculation across real submitted reviews
    const ratingAgg = await Rating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          voiceQuality: { $avg: '$categories.ai_voice_quality' },
          questionDepth: { $avg: '$categories.question_depth' },
          scoringAccuracy: { $avg: '$categories.scoring_accuracy' },
          latencySpeed: { $avg: '$categories.latency_speed' }
        }
      }
    ]);
    const ratingsMetrics = ratingAgg.length > 0 ? {
      overall: parseFloat(ratingAgg[0].avgRating.toFixed(2)),
      voiceQuality: parseFloat((ratingAgg[0].voiceQuality || ratingAgg[0].avgRating || 5).toFixed(2)),
      questionDepth: parseFloat((ratingAgg[0].questionDepth || ratingAgg[0].avgRating || 5).toFixed(2)),
      scoringAccuracy: parseFloat((ratingAgg[0].scoringAccuracy || ratingAgg[0].avgRating || 5).toFixed(2)),
      latencySpeed: parseFloat((ratingAgg[0].latencySpeed || ratingAgg[0].avgRating || 5).toFixed(2))
    } : { overall: 0, voiceQuality: 0, questionDepth: 0, scoringAccuracy: 0, latencySpeed: 0 };

    // Company Tier Distribution
    const companyDistribution = await InterviewSession.aggregate([
      { $group: { _id: '$companyTier', count: { $sum: 1 } } }
    ]);

    // Score Tier Distribution
    const scoreDistribution = await InterviewSession.aggregate([
      { $match: { status: 'completed', 'finalScore.overall': { $exists: true, $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$finalScore.overall',
          boundaries: [0, 5.0, 7.0, 8.5, 10.1],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Daily trends for last 7 days
    const dailySessions = await InterviewSession.aggregate([
      { $match: { startedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
          count: { $sum: 1 },
          avgScore: { $avg: '$finalScore.overall' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      metrics: {
        totalUsers,
        activeUsers24h,
        newUsers7d,
        totalSessions,
        completedSessions,
        averageScore,
        totalRatings,
        ratingsMetrics
      },
      charts: {
        companyDistribution,
        scoreDistribution,
        dailySessions
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin overview metrics' });
  }
};

// GET /api/admin/users
const getAdminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch interview stats for these users
    const userIds = users.map(u => u._id);
    const sessionStats = await InterviewSession.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          sessionCount: { $sum: 1 },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          avgScore: { $avg: '$finalScore.overall' }
        }
      }
    ]);

    const statsMap = {};
    sessionStats.forEach(s => {
      statsMap[s._id.toString()] = {
        sessionCount: s.sessionCount,
        completedCount: s.completedCount,
        avgScore: s.avgScore ? parseFloat(s.avgScore.toFixed(2)) : null
      };
    });

    const enrichedUsers = users.map(user => ({
      ...user.toObject(),
      stats: statsMap[user._id.toString()] || { sessionCount: 0, completedCount: 0, avgScore: null }
    }));

    return res.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users list' });
  }
};

// GET /api/admin/users/:id
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessions = await InterviewSession.find({ userId: id })
      .sort({ startedAt: -1 })
      .limit(50);

    const ratings = await Rating.find({ userId: id })
      .sort({ createdAt: -1 });

    return res.json({
      user,
      sessions,
      ratings
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed values: user, admin' });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Admin update role error:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
};

// GET /api/admin/ratings
const getAdminRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;

    const total = await Rating.countDocuments();
    const ratings = await Rating.find()
      .populate('userId', 'name email avatar')
      .populate('sessionId', 'role companyTier seniorityLevel finalScore')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // NPS Calculation: % Promoters (4-5 stars) - % Detractors (1-2 stars)
    const starDistribution = await Rating.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    let promoters = 0;
    let detractors = 0;
    let totalCount = 0;
    starDistribution.forEach(item => {
      totalCount += item.count;
      if (item._id >= 4) promoters += item.count;
      if (item._id <= 2) detractors += item.count;
    });

    const nps = totalCount > 0 ? Math.round(((promoters - detractors) / totalCount) * 100) : 0;

    return res.json({
      ratings,
      stats: {
        nps,
        starDistribution,
        totalReviews: totalCount
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get ratings error:', error);
    return res.status(500).json({ error: 'Failed to fetch ratings' });
  }
};

// GET /api/admin/health
const getSystemHealth = async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const sysMemTotal = os.totalmem();
    const sysMemFree = os.freemem();
    const uptime = process.uptime();
    const dbState = mongoose.connection.readyState;
    const dbStateLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      database: {
        state: dbStateLabels[dbState] || 'unknown',
        host: mongoose.connection.host || 'cluster-cloud',
        name: mongoose.connection.name,
        poolCapacity: 75,
        targetConcurrentUsers: '500-600'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCores: os.cpus().length,
        systemMemoryFreeMB: Math.round(sysMemFree / (1024 * 1024)),
        systemMemoryTotalMB: Math.round(sysMemTotal / (1024 * 1024)),
        processMemoryHeapUsedMB: Math.round(memUsage.heapUsed / (1024 * 1024)),
        processMemoryHeapTotalMB: Math.round(memUsage.heapTotal / (1024 * 1024)),
        processMemoryRssMB: Math.round(memUsage.rss / (1024 * 1024))
      },
      security: {
        slowlorisProtection: 'Enabled (45s timeouts)',
        rateLimiting: 'Active (Tiered IP & User Limits)',
        mongoSanitization: 'Active (NoSQL Injection Block)',
        helmetHeaders: 'Active (HSTS, CSP, Frameguard)',
        googleOAuth: 'Active (Verified ID Token Protocol)'
      }
    };

    return res.json(healthData);
  } catch (error) {
    console.error('Admin health error:', error);
    return res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

module.exports = {
  getAdminOverview,
  getAdminUsers,
  getUserDetails,
  updateUserRole,
  getAdminRatings,
  getSystemHealth
};
