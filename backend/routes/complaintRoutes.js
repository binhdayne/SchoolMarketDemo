const router = require("express").Router();
const complaint = require("../controllers/complaintController");
const upload = require("../middleware/upload");
const { auth, isAdmin } = require("../middleware/authMiddleware");

router.post("/", auth, upload.single("image"), complaint.createComplaint);
router.get("/", auth, isAdmin, complaint.getComplaints);
router.delete("/:id", auth, isAdmin, complaint.deleteComplaint);

module.exports = router;
