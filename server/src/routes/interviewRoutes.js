const express = require('express');
const router = express.Router();
const {
  startInterview,
  submitAnswer,
  getInterview,
  completeInterview,
  getUserInterviews,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const { interviewStartLimiter, interviewAnswerLimiter } = require('../middleware/rateLimiter');

router.use(protect); // All interview routes are protected

router.post('/start', interviewStartLimiter, startInterview);
router.get('/', getUserInterviews);
router.get('/:id', getInterview);
router.post('/:id/answer', interviewAnswerLimiter, submitAnswer);
router.post('/:id/complete', completeInterview);

module.exports = router;

