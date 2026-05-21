const router = require("express").Router();
const auth = require("../controllers/authController");
const { auth: authMiddleware, isAdmin } = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/pending-users", authMiddleware, isAdmin, auth.getPendingUsers);
router.put("/approve-user/:id", authMiddleware, isAdmin, auth.approveUser);
router.put("/reject-user/:id", authMiddleware, isAdmin, auth.rejectUser);

module.exports = router;
