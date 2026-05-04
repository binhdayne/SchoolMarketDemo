const router = require("express").Router();
const campaign = require("../controllers/campaignController");

router.post("/", campaign.createCampaign);
router.get("/", campaign.getCampaigns);

module.exports = router;