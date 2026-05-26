const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Route lấy số liệu thống kê (yêu cầu phải đăng nhập)
router.get('/member-stats', authMiddleware.auth, dashboardController.getMemberStats);

module.exports = router;