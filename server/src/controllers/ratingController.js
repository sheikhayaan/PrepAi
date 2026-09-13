const Rating = require('../models/Rating');
const InterviewSession = require('../models/InterviewSession');

// POST /api/ratings
const submitRating = async (req, res) => {
  try {
    const { rating, feedback, featureUsed, categories, sessionId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    let companyTier = 'faang';
    let seniorityLevel = 'L5 (Senior)';

    // Verify session belongs to user if sessionId is provided
    if (sessionId) {
      const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
      if (!session) {
        return res.status(400).json({ error: 'Interview session not found or does not belong to user' });
      }
      companyTier = session.companyTier || 'faang';
      seniorityLevel = session.seniorityLevel || 'L5 (Senior)';
    }

    const newRating = new Rating({
      userId: req.user._id,
      userName: req.user.name || 'Candidate',
      userEmail: req.user.email || '',
      userAvatar: req.user.avatar || '',
      sessionId: sessionId || null,
      rating: parseInt(rating),
      feedback: feedback ? String(feedback).trim().slice(0, 1000) : '',
      featureUsed: featureUsed || 'faang_mock_interview',
      companyTier,
      seniorityLevel,
      categories: {
        ai_voice_quality: categories?.ai_voice_quality || 5,
        question_depth: categories?.question_depth || 5,
        scoring_accuracy: categories?.scoring_accuracy || 5,
        latency_speed: categories?.latency_speed || 5
      }
    });

    await newRating.save();

    return res.status(201).json({
      message: 'Thank you for your feedback! Your review helps us continuously improve the AI interviewer.',
      rating: newRating
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    return res.status(500).json({ error: 'Failed to submit rating' });
  }
};

// GET /api/ratings (User's own ratings)
const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ ratings });
  } catch (error) {
    console.error('Get user ratings error:', error);
    return res.status(500).json({ error: 'Failed to fetch your ratings' });
  }
};

module.exports = {
  submitRating,
  getUserRatings
};
