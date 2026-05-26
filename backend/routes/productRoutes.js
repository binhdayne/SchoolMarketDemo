const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/categories', productController.getCategories);
router.get('/stats', productController.getMarketplaceStats);
router.get('/public', productController.getPublicProducts);
router.get('/pending', auth, isAdmin, productController.getPendingProducts);
router.get('/my-products', auth, productController.getMyProducts);
router.get('/member-stats', auth, productController.getMemberStats);

router.post('/create', auth, upload.single('anh'), productController.createProduct);
router.put('/:id/approve', auth, isAdmin, productController.approveProduct);
router.put('/:id/reject', auth, isAdmin, productController.rejectProduct);
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
