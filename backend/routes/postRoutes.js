const router = require("express").Router();
const post = require("../controllers/postController");
const { auth, isAdmin } = require("../middleware/authMiddleware");

router.post("/", auth, post.createPost);
router.get("/", post.getApprovedPosts);
router.get("/pending", auth, isAdmin, post.getPendingPosts);
router.put("/approve/:id", auth, isAdmin, post.approvePost);
router.put("/reject/:id", auth, isAdmin, post.rejectPost);

module.exports = router;