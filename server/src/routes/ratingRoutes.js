const express = require('express');
const router = express.Router();
const { submitRating, getUserRatings } = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', submitRating);
router.get('/', getUserRatings);

module.exports = router;
