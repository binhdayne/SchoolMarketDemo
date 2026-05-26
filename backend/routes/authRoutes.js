const router = require("express").Router();
const auth = require("../controllers/authController");
const { auth: authMiddleware, isAdmin, isOrganization } = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/pending-accounts", authMiddleware, isAdmin, auth.getPendingAccounts);
router.get("/members", authMiddleware, isAdmin, auth.getMembers);
router.get("/organizations", authMiddleware, isAdmin, auth.getOrganizations);
router.get("/member-profile", authMiddleware, auth.getMemberProfile);
router.put("/member-profile", authMiddleware, auth.updateMemberProfile);
router.put("/organization-profile", authMiddleware, isOrganization, auth.updateOrganizationProfile);
router.put("/approve-account/:type/:id", authMiddleware, isAdmin, auth.approveAccount);
router.put("/reject-account/:type/:id", authMiddleware, isAdmin, auth.rejectAccount);
router.put("/ban-account/:type/:id", authMiddleware, isAdmin, auth.banAccount);
router.put("/unban-account/:type/:id", authMiddleware, isAdmin, auth.unbanAccount);
router.get("/pending-users", authMiddleware, isAdmin, auth.getPendingUsers);
router.put("/approve-user/:id", authMiddleware, isAdmin, auth.approveUser);
router.put("/reject-user/:id", authMiddleware, isAdmin, auth.rejectUser);

module.exports = router;
