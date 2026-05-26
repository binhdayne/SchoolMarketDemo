/*const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// 1. Dùng authMiddleware.auth vì file middleware của bạn xuất khẩu object
// 2. Kiểm tra kỹ tên hàm 'createProduct' trong controller
router.get('/member-stats', authMiddleware.auth, productController.getMemberStats);
router.post('/create', authMiddleware.auth, productController.createProduct);
 // Giả sử bạn tạo file này
router.post('/create', authMiddleware.auth, upload.single('anh'), productController.createProduct);
// Thêm vào productRoutes.js
router.get('/categories', productController.getCategories);

module.exports = router;
*/

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// ❌ BẠN CẦN XÓA DÒNG NÀY: Vì ở dưới bạn đã khai báo 'const upload' bằng multer rồi.
// Trong JavaScript, khai báo 'const' 2 lần cùng một tên sẽ làm sập server ngay lập tức.

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/member-stats', authMiddleware.auth, productController.getMemberStats);

// ❌ BẠN CẦN XÓA DÒNG NÀY: Bạn đang có 2 API cùng tên là '/create'.
// Express sẽ luôn chạy cái đầu tiên (không có multer) và bỏ qua cái thứ hai, khiến lỗi "null" quay trở lại.

// ✅ CHỈ GIỮ LẠI DÒNG NÀY: Đây mới là route đúng vì nó có upload.single('anh')
router.post('/create', authMiddleware.auth, upload.single('anh'), productController.createProduct);

router.get('/categories', productController.getCategories);
router.get('/my-products', authMiddleware.auth, productController.getMyProducts);

// Đăng ký đường dẫn xóa sản phẩm (dùng phương thức DELETE)
router.delete('/:id', authMiddleware.auth, productController.deleteProduct);

module.exports = router;