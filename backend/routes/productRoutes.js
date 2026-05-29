const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, isAdmin, isOrganization } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/categories', productController.getCategories);
router.get('/stats', productController.getMarketplaceStats);
router.get('/public', productController.getPublicProducts);
router.get('/pending', auth, isAdmin, productController.getPendingProducts);
router.get('/my-products', auth, productController.getMyProducts);
router.get('/member-stats', auth, productController.getMemberStats);
router.get('/campaign/:campaignId', productController.getCampaignProducts);
router.get('/organization-donation-sales', auth, isOrganization, productController.getOrganizationDonationSales);
router.get('/organization-seller-payouts', auth, isOrganization, productController.getOrganizationSellerPayouts);
router.get('/:id/purchase-detail', auth, productController.getPurchaseDetail);

router.post('/create', auth, upload.single('anh'), productController.createProduct);
router.post('/:id/purchase', auth, upload.single('receipt'), productController.createPurchase);
router.put('/organization-donation-sales/:paymentId/confirm', auth, isOrganization, productController.confirmOrganizationDonationSale);
router.put('/organization-seller-payouts/:paymentId/confirm', auth, isOrganization, productController.confirmOrganizationSellerPayout);
router.put('/purchases/:paymentId/confirm', auth, productController.confirmPurchase);
router.put('/purchases/:paymentId/reject', auth, productController.rejectPurchase);
router.put('/:id/approve', auth, isAdmin, productController.approveProduct);
router.put('/:id/reject', auth, isAdmin, productController.rejectProduct);
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
