const router = require("express").Router();
const post = require("../controllers/postController");
const { auth, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/", auth, upload.single("anh_minh_hoa"), post.createPost);
router.get("/", post.getApprovedPosts);
router.get("/pending", auth, isAdmin, post.getPendingPosts);
router.get("/my-posts", auth, post.getMyPosts);
router.put("/:id", auth, upload.single("anh_minh_hoa"), post.updatePost);
router.put("/approve/:id", auth, isAdmin, post.approvePost);
router.put("/reject/:id", auth, isAdmin, post.rejectPost);

module.exports = router;
