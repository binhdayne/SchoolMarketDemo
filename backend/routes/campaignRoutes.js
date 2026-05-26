const router = require("express").Router();
const campaign = require("../controllers/campaignController");
const { auth, isAdmin, isOrganization } = require("../middleware/authMiddleware");

router.post("/", auth, isOrganization, campaign.createCampaign);
router.get("/pending", auth, isAdmin, campaign.getPendingCampaigns);
router.get("/my-approved", auth, isOrganization, campaign.getMyApprovedCampaigns);
router.put("/:id/approve", auth, isAdmin, campaign.approveCampaign);
router.put("/:id/reject", auth, isAdmin, campaign.rejectCampaign);
router.get("/", campaign.getCampaigns);

module.exports = router;
