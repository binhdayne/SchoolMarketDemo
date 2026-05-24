const router = require("express").Router();
const auth = require("../controllers/authController");
const { auth: authMiddleware, isAdmin } = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/pending-accounts", authMiddleware, isAdmin, auth.getPendingAccounts);
router.get("/members", authMiddleware, isAdmin, auth.getMembers);
router.get("/organizations", authMiddleware, isAdmin, auth.getOrganizations);
router.put("/approve-account/:type/:id", authMiddleware, isAdmin, auth.approveAccount);
router.put("/reject-account/:type/:id", authMiddleware, isAdmin, auth.rejectAccount);
router.get("/pending-users", authMiddleware, isAdmin, auth.getPendingUsers);
router.put("/approve-user/:id", authMiddleware, isAdmin, auth.approveUser);
router.put("/reject-user/:id", authMiddleware, isAdmin, auth.rejectUser);

module.exports = router;
