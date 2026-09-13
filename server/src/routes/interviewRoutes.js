const express = require('express');
const router = express.Router();
const {
  startInterview,
  submitAnswer,
  getInterview,
  completeInterview,
  getUserInterviews,
  getQuestions,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const { interviewStartLimiter, interviewAnswerLimiter } = require('../middleware/rateLimiter');

router.get('/questions', getQuestions); // Question Bank browsing

router.use(protect); // All session execution routes are protected

router.post('/start', interviewStartLimiter, startInterview);
router.get('/', getUserInterviews);
router.get('/:id', getInterview);
router.post('/:id/answer', interviewAnswerLimiter, submitAnswer);
router.post('/:id/complete', completeInterview);

module.exports = router;

