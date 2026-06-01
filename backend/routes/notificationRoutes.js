const router = require("express").Router();
const notifications = require("../controllers/notificationController");
const { auth } = require("../middleware/authMiddleware");

router.get("/", auth, notifications.getNotifications);
router.get("/unread-count", auth, notifications.getUnreadCount);
router.put("/read-all", auth, notifications.markAllNotificationsRead);
router.put("/:id/read", auth, notifications.markNotificationRead);

module.exports = router;
