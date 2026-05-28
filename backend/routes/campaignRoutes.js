const router = require("express").Router();
const campaign = require("../controllers/campaignController");
const { auth, isAdmin, isOrganization } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/", auth, isOrganization, campaign.createCampaign);
router.get("/pending", auth, isAdmin, campaign.getPendingCampaigns);
router.get("/my-approved", auth, isOrganization, campaign.getMyApprovedCampaigns);
router.get("/contributions/pending", auth, isOrganization, campaign.getPendingContributions);
router.put("/contributions/:contributionId/confirm", auth, isOrganization, campaign.confirmContribution);
router.post("/:id/contributions", auth, upload.single("receipt"), campaign.createCampaignContribution);
router.delete("/:id", auth, isOrganization, campaign.deleteOwnCampaign);
router.put("/:id/approve", auth, isAdmin, campaign.approveCampaign);
router.put("/:id/reject", auth, isAdmin, campaign.rejectCampaign);
router.get("/", campaign.getCampaigns);

module.exports = router;
