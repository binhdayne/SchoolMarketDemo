const router = require("express").Router();
const campaign = require("../controllers/campaignController");

router.post("/", campaign.createCampaign);
router.get("/", campaign.getCampaigns);
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT ma_hoat_dong, ten_hoat_dong FROM hoat_dong_quyen_gop");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;