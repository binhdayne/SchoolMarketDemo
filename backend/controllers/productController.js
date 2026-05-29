const db = require('../config/db');
const promiseDb = db.promise();

const PRODUCT_STATUS = {
    PENDING: 'cho_duyet',
    APPROVED: 'da_duyet',
    REJECTED: 'tu_choi',
    IN_TRANSACTION: 'dang_giao_dich'
};

const PAYMENT_STATUS = {
    PENDING_SELLER: 'cho_nguoi_ban_xac_nhan',
    PENDING_ORGANIZATION: 'cho_to_chuc_xac_nhan',
    COMPLETED: 'hoan_tat',
    REJECTED: 'tu_choi'
};

const SELLER_PAYOUT_STATUS = {
    NONE: 'khong_can_chi_tra',
    PENDING: 'cho_to_chuc_thanh_toan',
    PAID: 'da_thanh_toan_nguoi_ban'
};

const DONATION_PRODUCT_TYPE = 'ban_do_quyen_gop';

const DEFAULT_CATEGORIES = [
    'Đồ dùng học tập',
    'Điện tử',
    'Quần áo',
    'Sách vở',
    'Đồ ăn',
    'Khác'
];

let productImageColumnReady = false;
let defaultCategoriesReady = false;
let paymentQuantityColumnReady = false;

async function ensureProductImageColumn() {
    if (productImageColumnReady) return;

    await promiseDb.query("ALTER TABLE san_pham MODIFY COLUMN anh LONGTEXT NULL");
    productImageColumnReady = true;
}

async function ensureDefaultCategories() {
    if (defaultCategoriesReady) return;

    for (const category of DEFAULT_CATEGORIES) {
        await promiseDb.query(
            `INSERT INTO danh_muc (ten_danh_muc, mo_ta)
             SELECT ?, ?
             WHERE NOT EXISTS (
                SELECT 1 FROM danh_muc WHERE ten_danh_muc = ? LIMIT 1
             )`,
            [category, `Danh mục ${category}`, category]
        );
    }

    defaultCategoriesReady = true;
}

async function ensurePaymentQuantityColumn() {
    if (paymentQuantityColumnReady) return;

    try {
        await promiseDb.query("ALTER TABLE thanh_toan ADD COLUMN so_luong INT DEFAULT 1 AFTER so_tien_giao_dich");
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    const paymentColumnStatements = [
        "ALTER TABLE thanh_toan ADD COLUMN so_tien_quyen_gop DECIMAL(12,2) DEFAULT 0 AFTER so_luong",
        "ALTER TABLE thanh_toan ADD COLUMN so_tien_tra_nguoi_ban DECIMAL(12,2) DEFAULT 0 AFTER so_tien_quyen_gop",
        "ALTER TABLE thanh_toan ADD COLUMN trang_thai_chi_tra_nguoi_ban VARCHAR(50) DEFAULT 'khong_can_chi_tra' AFTER trang_thai",
        "ALTER TABLE thanh_toan ADD COLUMN ngay_xac_nhan_to_chuc DATETIME NULL AFTER ngay_gui",
        "ALTER TABLE thanh_toan ADD COLUMN ngay_chi_tra_nguoi_ban DATETIME NULL AFTER ngay_xac_nhan_to_chuc"
    ];

    for (const statement of paymentColumnStatements) {
        try {
            await promiseDb.query(statement);
        } catch (err) {
            if (err.code !== "ER_DUP_FIELDNAME") {
                throw err;
            }
        }
    }

    await promiseDb.query("UPDATE thanh_toan SET so_luong = 1 WHERE so_luong IS NULL OR so_luong < 1");
    await promiseDb.query("UPDATE thanh_toan SET so_tien_quyen_gop = 0 WHERE so_tien_quyen_gop IS NULL");
    await promiseDb.query("UPDATE thanh_toan SET so_tien_tra_nguoi_ban = 0 WHERE so_tien_tra_nguoi_ban IS NULL");
    await promiseDb.query(
        "UPDATE thanh_toan SET trang_thai_chi_tra_nguoi_ban = ? WHERE trang_thai_chi_tra_nguoi_ban IS NULL OR trang_thai_chi_tra_nguoi_ban = ''",
        [SELLER_PAYOUT_STATUS.NONE]
    );
    paymentQuantityColumnReady = true;
}

// Xử lý lấy thống kê Dashboard
exports.getMemberStats = async (req, res) => {
    const ma_thanh_vien = req.user.id; // Lấy từ token sau khi xác thực
    try {
        const [rows] = await promiseDb.execute(`
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ?) as spDaDang,
                (SELECT COUNT(*) FROM thanh_toan WHERE ma_thanh_vien_nhan = ? AND trang_thai IN ('da_ban', 'da_thanh_toan', 'hoan_tat')) as daBan,
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ? AND so_phan_tram_quyen_gop > 0) as quyenGop
        `, [ma_thanh_vien, ma_thanh_vien, ma_thanh_vien]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy danh sách danh mục
exports.getCategories = async (req, res) => {
    try {
        await ensureDefaultCategories();

        const [categories] = await promiseDb.query(
            "SELECT ma_danh_muc, ten_danh_muc FROM danh_muc ORDER BY ma_danh_muc"
        );
        res.json(categories);
    } catch (err) {
        console.error("LỖI SQL KHI LẤY DANH MỤC:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getMarketplaceStats = async (req, res) => {
    try {
        const [rows] = await promiseDb.query(`
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE trang_thai = ? AND COALESCE(so_luong, 0) > 0) AS products,
                (SELECT COUNT(*) FROM hoat_dong_quyen_gop) AS campaigns,
                (SELECT COUNT(*) FROM thanh_vien) AS members
        `, [PRODUCT_STATUS.APPROVED]);

        res.json({
            products: Number(rows[0]?.products || 0),
            campaigns: Number(rows[0]?.campaigns || 0),
            members: Number(rows[0]?.members || 0),
            satisfaction: 95
        });
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy thống kê trang chủ: " + err.message });
    }
};

exports.getPublicProducts = async (req, res) => {
    try {
        await ensureProductImageColumn();

        const [products] = await promiseDb.query(
            `SELECT
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.anh,
                sp.mo_ta,
                sp.gia,
                sp.tinh_trang,
                sp.trang_thai,
                sp.so_luong,
                sp.ngay_dang,
                sp.ma_danh_muc,
                sp.ma_hoat_dong,
                sp.so_phan_tram_quyen_gop,
                dm.ten_danh_muc
             FROM san_pham sp
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             WHERE sp.trang_thai = ? AND COALESCE(sp.so_luong, 0) > 0
             ORDER BY sp.ngay_dang DESC, sp.ma_san_pham DESC`,
            [PRODUCT_STATUS.APPROVED]
        );

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy sản phẩm trang chủ: " + err.message });
    }
};

exports.getCampaignProducts = async (req, res) => {
    const campaignId = req.params.campaignId;

    try {
        await ensureProductImageColumn();

        const [products] = await promiseDb.query(
            `SELECT
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.anh,
                sp.mo_ta,
                sp.gia,
                sp.tinh_trang,
                sp.trang_thai,
                sp.so_luong,
                sp.ngay_dang,
                sp.ma_danh_muc,
                sp.ma_hoat_dong,
                sp.so_phan_tram_quyen_gop,
                dm.ten_danh_muc,
                seller.ho_ten AS ten_nguoi_ban,
                hd.ten_hoat_dong
             FROM san_pham sp
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = sp.ma_thanh_vien
             WHERE sp.ma_hoat_dong = ?
                AND sp.trang_thai = ?
                AND COALESCE(sp.so_luong, 0) > 0
                AND hd.trang_thai = ?
                AND hd.hinh_thuc_quyen_gop = ?
             ORDER BY sp.ngay_dang DESC, sp.ma_san_pham DESC`,
            [campaignId, PRODUCT_STATUS.APPROVED, PRODUCT_STATUS.APPROVED, DONATION_PRODUCT_TYPE]
        );

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "KhĂ´ng thá»ƒ láº¥y sáº£n pháº©m quyĂªn gĂ³p cá»§a sá»± kiá»‡n: " + err.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        await ensureProductImageColumn();
        await ensureDefaultCategories();

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                error: "Không nhận được dữ liệu sản phẩm. Vui lòng thử lại."
            });
        }

        if (!req.body.ten_san_pham) {
            return res.status(400).json({
                error: "Vui lòng nhập tên sản phẩm."
            });
        }

        const anh = req.file ? `/uploads/${req.file.filename}` : null;
        const {
            ten_san_pham, mo_ta, gia, ma_danh_muc,
            tinh_trang, so_luong, so_phan_tram_quyen_gop, ma_hoat_dong
        } = req.body;

        const ma_thanh_vien = req.user.id;
        const accountType = req.user?.accountType || req.user?.role;

        if (accountType !== 'thanh_vien') {
            return res.status(403).json({
                error: "Chỉ thành viên mới có thể đăng bán sản phẩm."
            });
        }

        const [members] = await promiseDb.query(
            "SELECT ma_ngan_hang FROM thanh_vien WHERE ma_thanh_vien = ? LIMIT 1",
            [ma_thanh_vien]
        );

        if (!String(members[0]?.ma_ngan_hang || "").trim()) {
            return res.status(400).json({
                error: "Bạn cần cập nhật mã ngân hàng/QR nhận tiền trước khi đăng bán sản phẩm."
            });
        }

        const finalMaDanhMuc = (ma_danh_muc && ma_danh_muc !== "") ? parseInt(ma_danh_muc, 10) : null;
        const finalMaHoatDong = (ma_hoat_dong && ma_hoat_dong !== "") ? parseInt(ma_hoat_dong, 10) : null;
        const finalGia = gia ? parseFloat(gia) : 0;
        const finalSoLuong = so_luong ? parseInt(so_luong, 10) : 1;
        let finalPhanTram = so_phan_tram_quyen_gop ? parseInt(so_phan_tram_quyen_gop, 10) : 0;

        if (!Number.isInteger(finalSoLuong) || finalSoLuong < 1) {
            return res.status(400).json({ error: "Sá»‘ lÆ°á»£ng sáº£n pháº©m khĂ´ng há»£p lá»‡." });
        }

        if (finalMaHoatDong) {
            if (!Number.isInteger(finalPhanTram) || finalPhanTram < 40 || finalPhanTram > 100) {
                return res.status(400).json({ error: "Pháº§n trÄƒm quyĂªn gĂ³p pháº£i tá»« 40% Ä‘áº¿n 100%." });
            }

            const [campaigns] = await promiseDb.query(
                `SELECT ma_hoat_dong, hinh_thuc_quyen_gop, trang_thai
                 FROM hoat_dong_quyen_gop
                 WHERE ma_hoat_dong = ?
                 LIMIT 1`,
                [finalMaHoatDong]
            );

            if (campaigns.length === 0) {
                return res.status(404).json({ error: "KhĂ´ng tĂ¬m tháº¥y sá»± kiá»‡n quyĂªn gĂ³p." });
            }

            const campaign = campaigns[0];
            if (campaign.trang_thai !== PRODUCT_STATUS.APPROVED || campaign.hinh_thuc_quyen_gop !== DONATION_PRODUCT_TYPE) {
                return res.status(409).json({ error: "Sá»± kiá»‡n nĂ y khĂ´ng há»— trá»£ Ä‘Äƒng sáº£n pháº©m quyĂªn gĂ³p." });
            }
        } else {
            finalPhanTram = 0;
        }

        const sql = `INSERT INTO san_pham
            (ten_san_pham, anh, mo_ta, gia, tinh_trang, trang_thai,
             so_luong, ma_thanh_vien, ma_danh_muc, so_phan_tram_quyen_gop, ma_hoat_dong)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await promiseDb.execute(sql, [
            ten_san_pham, anh, mo_ta || null, finalGia, tinh_trang || 'Như mới', PRODUCT_STATUS.PENDING,
            finalSoLuong, ma_thanh_vien, finalMaDanhMuc, finalPhanTram, finalMaHoatDong
        ]);

        res.status(201).json({
            message: "Đã gửi bài đăng sản phẩm cho admin duyệt.",
            trang_thai: PRODUCT_STATUS.PENDING
        });
    } catch (err) {
        console.error("LỖI SQL:", err);
        res.status(500).json({ error: "Lỗi Database: " + err.message });
    }
};

exports.getMyProducts = async (req, res) => {
    try {
        await ensurePaymentQuantityColumn();

        const ma_thanh_vien = req.user.id;

        const [products] = await promiseDb.query(
            `SELECT
                sp.*,
                dm.ten_danh_muc,
                tt.ma_thanh_toan,
                tt.anh_xac_nhan_giao_dich,
                tt.so_luong AS so_luong_mua,
                tt.so_tien_giao_dich,
                tt.trang_thai AS trang_thai_thanh_toan,
                tt.ngay_gui AS ngay_gui_bien_lai,
                buyer.ho_ten AS ten_nguoi_mua,
                buyer.sdt AS sdt_nguoi_mua,
                buyer.email AS email_nguoi_mua
             FROM san_pham sp
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             LEFT JOIN thanh_toan tt
                ON tt.ma_san_pham = sp.ma_san_pham
                AND tt.trang_thai = ?
             LEFT JOIN thanh_vien buyer ON buyer.ma_thanh_vien = tt.ma_thanh_vien_gui
             WHERE sp.ma_thanh_vien = ?
             ORDER BY sp.ma_san_pham DESC`,
            [PAYMENT_STATUS.PENDING_SELLER, ma_thanh_vien]
        );

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy danh sách sản phẩm của bạn: " + err.message });
    }
};

exports.getPurchaseDetail = async (req, res) => {
    const productId = req.params.id;
    const buyerId = req.user?.id;
    const accountType = req.user?.accountType || req.user?.role;

    if (accountType !== 'thanh_vien') {
        return res.status(403).json({ error: "Chỉ thành viên mới có thể mua sản phẩm." });
    }

    try {
        await ensureProductImageColumn();

        const [products] = await promiseDb.query(
            `SELECT
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.anh,
                sp.mo_ta,
                sp.gia,
                sp.tinh_trang,
                sp.trang_thai,
                sp.so_luong,
                sp.ngay_dang,
                sp.ma_danh_muc,
                sp.ma_hoat_dong,
                sp.so_phan_tram_quyen_gop,
                dm.ten_danh_muc,
                seller.ma_thanh_vien AS ma_nguoi_ban,
                seller.ho_ten AS ten_nguoi_ban,
                seller.ma_ngan_hang,
                seller.so_tai_khoan,
                seller.ten_ngan_hang,
                hd.ten_hoat_dong,
                hd.hinh_thuc_quyen_gop,
                hd.ma_qr_quyen_gop,
                hd.trang_thai AS trang_thai_hoat_dong,
                hd.ma_to_chuc,
                org.ten_to_chuc
             FROM san_pham sp
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = sp.ma_thanh_vien
             LEFT JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             LEFT JOIN to_chuc org ON org.ma_to_chuc = hd.ma_to_chuc
             WHERE sp.ma_san_pham = ?
             LIMIT 1`,
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
        }

        const product = products[0];

        if (product.trang_thai !== PRODUCT_STATUS.APPROVED) {
            return res.status(409).json({ error: "Sản phẩm này hiện không còn khả dụng để mua." });
        }

        if (Number(product.so_luong || 0) <= 0) {
            return res.status(409).json({ error: "Sản phẩm này đã hết hàng." });
        }

        if (Number(product.ma_nguoi_ban) === Number(buyerId)) {
            return res.status(403).json({ error: "Bạn không thể mua sản phẩm của chính mình." });
        }

        const isDonationProduct = Boolean(
            product.ma_hoat_dong &&
            product.hinh_thuc_quyen_gop === DONATION_PRODUCT_TYPE &&
            Number(product.so_phan_tram_quyen_gop || 0) >= 40
        );

        if (isDonationProduct && product.trang_thai_hoat_dong !== PRODUCT_STATUS.APPROVED) {
            return res.status(409).json({ error: "Sá»± kiá»‡n quyĂªn gĂ³p cá»§a sáº£n pháº©m nĂ y chÆ°a sáºµn sĂ ng." });
        }

        if (isDonationProduct && !String(product.ma_qr_quyen_gop || "").trim()) {
            return res.status(409).json({ error: "Sá»± kiá»‡n nĂ y chÆ°a cĂ³ QR nháº­n chuyá»ƒn khoáº£n." });
        }

        if (!String(product.ma_ngan_hang || "").trim()) {
            return res.status(409).json({ error: "Người bán chưa cập nhật QR nhận tiền." });
        }

        res.json({
            ...product,
            la_san_pham_quyen_gop: Boolean(
                product.ma_hoat_dong &&
                product.hinh_thuc_quyen_gop === DONATION_PRODUCT_TYPE &&
                Number(product.so_phan_tram_quyen_gop || 0) >= 40
            ),
            qr_thanh_toan:
                product.ma_hoat_dong &&
                product.hinh_thuc_quyen_gop === DONATION_PRODUCT_TYPE &&
                Number(product.so_phan_tram_quyen_gop || 0) >= 40
                    ? product.ma_qr_quyen_gop
                    : product.ma_ngan_hang,
            ten_nguoi_nhan:
                product.ma_hoat_dong &&
                product.hinh_thuc_quyen_gop === DONATION_PRODUCT_TYPE &&
                Number(product.so_phan_tram_quyen_gop || 0) >= 40
                    ? (product.ten_to_chuc || product.ten_hoat_dong || "Tá»• chá»©c")
                    : product.ten_nguoi_ban
        });
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy thông tin mua hàng: " + err.message });
    }
};

exports.createPurchase = async (req, res) => {
    const productId = req.params.id;
    const buyerId = req.user?.id;
    const accountType = req.user?.accountType || req.user?.role;
    const requestedQuantity = parseInt(req.body?.so_luong_mua || "1", 10);

    if (accountType !== 'thanh_vien') {
        return res.status(403).json({ error: "Chỉ thành viên mới có thể mua sản phẩm." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "Vui lòng tải lên biên lai chuyển khoản." });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        return res.status(400).json({ error: "Số lượng mua không hợp lệ." });
    }

    try {
        await ensurePaymentQuantityColumn();
        await promiseDb.beginTransaction();

        const [products] = await promiseDb.query(
            `SELECT
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.gia,
                sp.trang_thai,
                sp.so_luong,
                sp.ma_thanh_vien,
                sp.ma_hoat_dong,
                sp.so_phan_tram_quyen_gop,
                seller.ma_ngan_hang,
                hd.hinh_thuc_quyen_gop,
                hd.trang_thai AS trang_thai_hoat_dong,
                hd.ma_qr_quyen_gop,
                hd.ma_to_chuc
             FROM san_pham sp
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = sp.ma_thanh_vien
             LEFT JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             WHERE sp.ma_san_pham = ?
             FOR UPDATE`,
            [productId]
        );

        if (products.length === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
        }

        const product = products[0];

        if (product.trang_thai !== PRODUCT_STATUS.APPROVED) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Sản phẩm này hiện không còn khả dụng để mua." });
        }

        if (Number(product.ma_thanh_vien) === Number(buyerId)) {
            await promiseDb.rollback();
            return res.status(403).json({ error: "Bạn không thể mua sản phẩm của chính mình." });
        }

        if (!String(product.ma_ngan_hang || "").trim()) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Người bán chưa cập nhật QR nhận tiền." });
        }

        const donationPercent = Number(product.so_phan_tram_quyen_gop || 0);
        const isDonationProduct = Boolean(
            product.ma_hoat_dong &&
            product.hinh_thuc_quyen_gop === DONATION_PRODUCT_TYPE &&
            donationPercent >= 40
        );

        if (isDonationProduct && product.trang_thai_hoat_dong !== PRODUCT_STATUS.APPROVED) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Sá»± kiá»‡n quyĂªn gĂ³p cá»§a sáº£n pháº©m nĂ y chÆ°a sáºµn sĂ ng." });
        }

        if (isDonationProduct && (!String(product.ma_qr_quyen_gop || "").trim() || !product.ma_to_chuc)) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Sá»± kiá»‡n nĂ y chÆ°a cĂ³ QR nháº­n chuyá»ƒn khoáº£n." });
        }

        const availableQuantity = Number(product.so_luong || 0);
        if (availableQuantity <= 0) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Sản phẩm này đã hết hàng." });
        }

        if (requestedQuantity > availableQuantity) {
            await promiseDb.rollback();
            return res.status(409).json({
                error: `Sản phẩm chỉ còn ${availableQuantity}. Vui lòng chọn số lượng thấp hơn.`
            });
        }

        const receiptPath = `/uploads/${req.file.filename}`;
        const remainingQuantity = availableQuantity - requestedQuantity;
        const totalAmount = Number(product.gia || 0) * requestedQuantity;
        const nextProductStatus = remainingQuantity > 0 ? PRODUCT_STATUS.APPROVED : PRODUCT_STATUS.IN_TRANSACTION;
        const donationAmount = isDonationProduct ? Math.round(totalAmount * donationPercent / 100) : 0;
        const sellerPayoutAmount = isDonationProduct ? Math.max(0, totalAmount - donationAmount) : 0;
        const paymentStatus = isDonationProduct ? PAYMENT_STATUS.PENDING_ORGANIZATION : PAYMENT_STATUS.PENDING_SELLER;
        const sellerPayoutStatus = isDonationProduct && sellerPayoutAmount > 0
            ? SELLER_PAYOUT_STATUS.PENDING
            : SELLER_PAYOUT_STATUS.NONE;

        const [paymentResult] = await promiseDb.execute(
            `INSERT INTO thanh_toan
                (ma_thanh_vien_gui, ma_thanh_vien_nhan, ma_to_chuc_nhan, ma_san_pham, so_tien_giao_dich,
                 so_luong, so_tien_quyen_gop, so_tien_tra_nguoi_ban, anh_xac_nhan_giao_dich,
                 ghi_chu, trang_thai, trang_thai_chi_tra_nguoi_ban)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                buyerId,
                product.ma_thanh_vien,
                isDonationProduct ? product.ma_to_chuc : null,
                product.ma_san_pham,
                totalAmount,
                requestedQuantity,
                donationAmount,
                sellerPayoutAmount,
                receiptPath,
                req.body?.ghi_chu || null,
                paymentStatus,
                sellerPayoutStatus
            ]
        );

        await promiseDb.execute(
            "UPDATE san_pham SET so_luong = ?, trang_thai = ? WHERE ma_san_pham = ?",
            [remainingQuantity, nextProductStatus, product.ma_san_pham]
        );

        await promiseDb.commit();

        res.status(201).json({
            message: remainingQuantity > 0
                ? "Đã gửi biên lai cho người bán xác nhận. Sản phẩm vẫn hiển thị với số lượng còn lại."
                : "Đã gửi biên lai cho người bán xác nhận. Sản phẩm đã hết hàng và được ẩn khỏi trang chủ.",
            ma_thanh_toan: paymentResult.insertId,
            so_luong_con_lai: remainingQuantity,
            tong_tien: totalAmount,
            so_tien_quyen_gop: donationAmount,
            so_tien_tra_nguoi_ban: sellerPayoutAmount,
            trang_thai: paymentStatus
        });
    } catch (err) {
        try {
            await promiseDb.rollback();
        } catch (rollbackErr) {
            console.error("Không thể rollback giao dịch mua hàng:", rollbackErr);
        }
        res.status(500).json({ error: "Không thể ghi nhận giao dịch mua hàng: " + err.message });
    }
};

exports.confirmPurchase = async (req, res) => {
    const paymentId = req.params.paymentId;
    const sellerId = req.user?.id;
    const accountType = req.user?.accountType || req.user?.role;

    if (accountType !== 'thanh_vien') {
        return res.status(403).json({ error: "Chỉ người bán là thành viên mới có thể xác nhận giao dịch." });
    }

    try {
        await ensurePaymentQuantityColumn();
        await promiseDb.beginTransaction();

        const [payments] = await promiseDb.query(
            `SELECT tt.ma_thanh_toan, tt.ma_san_pham, tt.trang_thai, tt.so_luong, sp.ma_thanh_vien, sp.so_luong AS so_luong_con_lai
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             WHERE tt.ma_thanh_toan = ?
             FOR UPDATE`,
            [paymentId]
        );

        if (payments.length === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ error: "Không tìm thấy giao dịch cần xác nhận." });
        }

        const payment = payments[0];

        if (Number(payment.ma_thanh_vien) !== Number(sellerId)) {
            await promiseDb.rollback();
            return res.status(403).json({ error: "Bạn không có quyền xác nhận giao dịch này." });
        }

        if (payment.trang_thai !== PAYMENT_STATUS.PENDING_SELLER) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Giao dịch này đã được xử lý trước đó." });
        }

        await promiseDb.execute(
            "UPDATE thanh_toan SET trang_thai = ? WHERE ma_thanh_toan = ?",
            [PAYMENT_STATUS.COMPLETED, paymentId]
        );

        await promiseDb.commit();

        res.json({
            message: "Đã xác nhận giao dịch.",
            ma_san_pham: payment.ma_san_pham,
            so_luong_con_lai: Number(payment.so_luong_con_lai || 0)
        });
    } catch (err) {
        try {
            await promiseDb.rollback();
        } catch (rollbackErr) {
            console.error("Không thể rollback xác nhận giao dịch:", rollbackErr);
        }
        res.status(500).json({ error: "Không thể xác nhận giao dịch: " + err.message });
    }
};

exports.rejectPurchase = async (req, res) => {
    const paymentId = req.params.paymentId;
    const sellerId = req.user?.id;
    const accountType = req.user?.accountType || req.user?.role;

    if (accountType !== 'thanh_vien') {
        return res.status(403).json({ error: "Chỉ người bán là thành viên mới có thể từ chối giao dịch." });
    }

    try {
        await ensurePaymentQuantityColumn();
        await promiseDb.beginTransaction();

        const [payments] = await promiseDb.query(
            `SELECT tt.ma_thanh_toan, tt.ma_san_pham, tt.trang_thai, tt.so_luong, sp.ma_thanh_vien, sp.so_luong AS so_luong_con_lai
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             WHERE tt.ma_thanh_toan = ?
             FOR UPDATE`,
            [paymentId]
        );

        if (payments.length === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ error: "Không tìm thấy giao dịch cần xử lý." });
        }

        const payment = payments[0];

        if (Number(payment.ma_thanh_vien) !== Number(sellerId)) {
            await promiseDb.rollback();
            return res.status(403).json({ error: "Bạn không có quyền xử lý giao dịch này." });
        }

        if (payment.trang_thai !== PAYMENT_STATUS.PENDING_SELLER) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Giao dịch này đã được xử lý trước đó." });
        }

        await promiseDb.execute(
            "UPDATE thanh_toan SET trang_thai = ? WHERE ma_thanh_toan = ?",
            [PAYMENT_STATUS.REJECTED, paymentId]
        );

        const restoredQuantity = Number(payment.so_luong_con_lai || 0) + Number(payment.so_luong || 1);

        await promiseDb.execute(
            "UPDATE san_pham SET so_luong = ?, trang_thai = ? WHERE ma_san_pham = ?",
            [restoredQuantity, PRODUCT_STATUS.APPROVED, payment.ma_san_pham]
        );

        await promiseDb.commit();

        res.json({
            message: "Đã từ chối giao dịch. Sản phẩm đã hiện lại trên trang chủ.",
            ma_san_pham: payment.ma_san_pham,
            so_luong_con_lai: restoredQuantity,
            trang_thai: PRODUCT_STATUS.APPROVED
        });
    } catch (err) {
        try {
            await promiseDb.rollback();
        } catch (rollbackErr) {
            console.error("Không thể rollback từ chối giao dịch:", rollbackErr);
        }
        res.status(500).json({ error: "Không thể từ chối giao dịch: " + err.message });
    }
};

exports.getOrganizationDonationSales = async (req, res) => {
    const organizationId = req.user?.id;

    try {
        await ensurePaymentQuantityColumn();

        const [payments] = await promiseDb.query(
            `SELECT
                tt.ma_thanh_toan,
                tt.ma_san_pham,
                tt.ma_thanh_vien_gui,
                tt.ma_thanh_vien_nhan,
                tt.so_tien_giao_dich,
                tt.so_luong,
                tt.so_tien_quyen_gop,
                tt.so_tien_tra_nguoi_ban,
                tt.anh_xac_nhan_giao_dich,
                tt.ghi_chu,
                tt.trang_thai,
                tt.ngay_gui,
                sp.ten_san_pham,
                sp.anh AS anh_san_pham,
                sp.gia,
                sp.so_phan_tram_quyen_gop,
                hd.ma_hoat_dong,
                hd.ten_hoat_dong,
                buyer.ho_ten AS ten_nguoi_mua,
                buyer.lop AS lop_nguoi_mua,
                buyer.sdt AS sdt_nguoi_mua,
                buyer.email AS email_nguoi_mua,
                seller.ho_ten AS ten_nguoi_ban,
                seller.lop AS lop_nguoi_ban
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             LEFT JOIN thanh_vien buyer ON buyer.ma_thanh_vien = tt.ma_thanh_vien_gui
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = tt.ma_thanh_vien_nhan
             WHERE hd.ma_to_chuc = ?
                AND hd.hinh_thuc_quyen_gop = ?
                AND tt.trang_thai = ?
             ORDER BY tt.ngay_gui DESC, tt.ma_thanh_toan DESC`,
            [organizationId, DONATION_PRODUCT_TYPE, PAYMENT_STATUS.PENDING_ORGANIZATION]
        );

        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: "KhĂ´ng thá»ƒ láº¥y biĂªn lai mua sáº£n pháº©m quyĂªn gĂ³p: " + err.message });
    }
};

exports.confirmOrganizationDonationSale = async (req, res) => {
    const organizationId = req.user?.id;
    const paymentId = req.params.paymentId;

    try {
        await ensurePaymentQuantityColumn();
        await promiseDb.beginTransaction();

        const [payments] = await promiseDb.query(
            `SELECT
                tt.ma_thanh_toan,
                tt.trang_thai,
                tt.so_tien_tra_nguoi_ban,
                hd.ma_to_chuc
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             WHERE tt.ma_thanh_toan = ? AND hd.ma_to_chuc = ? AND hd.hinh_thuc_quyen_gop = ?
             FOR UPDATE`,
            [paymentId, organizationId, DONATION_PRODUCT_TYPE]
        );

        if (payments.length === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ error: "KhĂ´ng tĂ¬m tháº¥y giao dá»‹ch thuá»™c sá»± kiá»‡n cá»§a tá»• chá»©c." });
        }

        const payment = payments[0];
        if (payment.trang_thai !== PAYMENT_STATUS.PENDING_ORGANIZATION) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Giao dá»‹ch nĂ y Ä‘Ă£ Ä‘Æ°á»£c xá»­ lĂ½." });
        }

        const nextPayoutStatus = Number(payment.so_tien_tra_nguoi_ban || 0) > 0
            ? SELLER_PAYOUT_STATUS.PENDING
            : SELLER_PAYOUT_STATUS.NONE;

        await promiseDb.execute(
            `UPDATE thanh_toan
             SET trang_thai = ?,
                 ngay_xac_nhan_to_chuc = NOW(),
                 trang_thai_chi_tra_nguoi_ban = ?
             WHERE ma_thanh_toan = ?`,
            [PAYMENT_STATUS.COMPLETED, nextPayoutStatus, paymentId]
        );

        await promiseDb.commit();

        res.json({
            message: "ÄĂ£ xĂ¡c nháº­n biĂªn lai mua sáº£n pháº©m quyĂªn gĂ³p.",
            trang_thai: PAYMENT_STATUS.COMPLETED,
            trang_thai_chi_tra_nguoi_ban: nextPayoutStatus
        });
    } catch (err) {
        try {
            await promiseDb.rollback();
        } catch (rollbackErr) {
            console.error("KhĂ´ng thá»ƒ rollback xĂ¡c nháº­n giao dá»‹ch quyĂªn gĂ³p:", rollbackErr);
        }
        res.status(500).json({ error: "KhĂ´ng thá»ƒ xĂ¡c nháº­n biĂªn lai mua sáº£n pháº©m quyĂªn gĂ³p: " + err.message });
    }
};

exports.getOrganizationSellerPayouts = async (req, res) => {
    const organizationId = req.user?.id;

    try {
        await ensurePaymentQuantityColumn();

        const [payments] = await promiseDb.query(
            `SELECT
                tt.ma_thanh_toan,
                tt.ma_san_pham,
                tt.so_tien_giao_dich,
                tt.so_luong,
                tt.so_tien_quyen_gop,
                tt.so_tien_tra_nguoi_ban,
                tt.trang_thai_chi_tra_nguoi_ban,
                tt.ngay_xac_nhan_to_chuc,
                sp.ten_san_pham,
                sp.anh AS anh_san_pham,
                sp.so_phan_tram_quyen_gop,
                hd.ma_hoat_dong,
                hd.ten_hoat_dong,
                seller.ma_thanh_vien AS ma_nguoi_ban,
                seller.ho_ten AS ten_nguoi_ban,
                seller.lop AS lop_nguoi_ban,
                seller.ma_ngan_hang,
                seller.so_tai_khoan,
                seller.ten_ngan_hang
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = tt.ma_thanh_vien_nhan
             WHERE hd.ma_to_chuc = ?
                AND hd.hinh_thuc_quyen_gop = ?
                AND tt.trang_thai = ?
                AND tt.trang_thai_chi_tra_nguoi_ban = ?
             ORDER BY tt.ngay_xac_nhan_to_chuc DESC, tt.ma_thanh_toan DESC`,
            [organizationId, DONATION_PRODUCT_TYPE, PAYMENT_STATUS.COMPLETED, SELLER_PAYOUT_STATUS.PENDING]
        );

        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: "KhĂ´ng thá»ƒ láº¥y khoáº£n cáº§n thanh toĂ¡n cho ngÆ°á»i bĂ¡n: " + err.message });
    }
};

exports.confirmOrganizationSellerPayout = async (req, res) => {
    const organizationId = req.user?.id;
    const paymentId = req.params.paymentId;

    try {
        await ensurePaymentQuantityColumn();
        await promiseDb.beginTransaction();

        const [payments] = await promiseDb.query(
            `SELECT
                tt.ma_thanh_toan,
                tt.trang_thai,
                tt.trang_thai_chi_tra_nguoi_ban
             FROM thanh_toan tt
             INNER JOIN san_pham sp ON sp.ma_san_pham = tt.ma_san_pham
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             WHERE tt.ma_thanh_toan = ? AND hd.ma_to_chuc = ? AND hd.hinh_thuc_quyen_gop = ?
             FOR UPDATE`,
            [paymentId, organizationId, DONATION_PRODUCT_TYPE]
        );

        if (payments.length === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ error: "KhĂ´ng tĂ¬m tháº¥y khoáº£n thanh toĂ¡n thuá»™c tá»• chá»©c." });
        }

        const payment = payments[0];
        if (
            payment.trang_thai !== PAYMENT_STATUS.COMPLETED ||
            payment.trang_thai_chi_tra_nguoi_ban !== SELLER_PAYOUT_STATUS.PENDING
        ) {
            await promiseDb.rollback();
            return res.status(409).json({ error: "Khoáº£n thanh toĂ¡n nĂ y khĂ´ng cĂ²n chá» chi tráº£." });
        }

        await promiseDb.execute(
            `UPDATE thanh_toan
             SET trang_thai_chi_tra_nguoi_ban = ?,
                 ngay_chi_tra_nguoi_ban = NOW()
             WHERE ma_thanh_toan = ?`,
            [SELLER_PAYOUT_STATUS.PAID, paymentId]
        );

        await promiseDb.commit();

        res.json({
            message: "ÄĂ£ xĂ¡c nháº­n thanh toĂ¡n cho ngÆ°á»i bĂ¡n.",
            trang_thai_chi_tra_nguoi_ban: SELLER_PAYOUT_STATUS.PAID
        });
    } catch (err) {
        try {
            await promiseDb.rollback();
        } catch (rollbackErr) {
            console.error("KhĂ´ng thá»ƒ rollback chi tráº£ ngÆ°á»i bĂ¡n:", rollbackErr);
        }
        res.status(500).json({ error: "KhĂ´ng thá»ƒ xĂ¡c nháº­n thanh toĂ¡n cho ngÆ°á»i bĂ¡n: " + err.message });
    }
};

exports.getPendingProducts = async (req, res) => {
    try {
        const [products] = await promiseDb.execute(
            `SELECT
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.anh,
                sp.mo_ta,
                sp.gia,
                sp.tinh_trang,
                sp.trang_thai,
                sp.so_luong,
                sp.ngay_dang,
                sp.so_phan_tram_quyen_gop,
                tv.ho_ten,
                dm.ten_danh_muc,
                hd.ten_hoat_dong
             FROM san_pham sp
             LEFT JOIN thanh_vien tv ON tv.ma_thanh_vien = sp.ma_thanh_vien
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             LEFT JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = sp.ma_hoat_dong
             WHERE sp.trang_thai = ?
             ORDER BY sp.ngay_dang DESC, sp.ma_san_pham DESC`,
            [PRODUCT_STATUS.PENDING]
        );

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy danh sách sản phẩm chờ duyệt: " + err.message });
    }
};

exports.updateProductStatus = async (req, res) => {
    const { id } = req.params;
    const nextStatus = req.action === 'approve' ? PRODUCT_STATUS.APPROVED : PRODUCT_STATUS.REJECTED;

    try {
        const [result] = await promiseDb.execute(
            'UPDATE san_pham SET trang_thai = ? WHERE ma_san_pham = ?',
            [nextStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
        }

        res.json({
            message: req.action === 'approve' ? "Đã duyệt sản phẩm." : "Đã từ chối sản phẩm.",
            trang_thai: nextStatus
        });
    } catch (err) {
        res.status(500).json({ error: "Không thể cập nhật trạng thái sản phẩm: " + err.message });
    }
};

exports.approveProduct = (req, res, next) => {
    req.action = 'approve';
    return exports.updateProductStatus(req, res, next);
};

exports.rejectProduct = (req, res, next) => {
    req.action = 'reject';
    return exports.updateProductStatus(req, res, next);
};

// Xóa sản phẩm
exports.deleteProduct = (req, res) => {
    try {
        const ma_san_pham = req.params.id;
        const ma_thanh_vien = req.user.id; // Lấy ID của user đang đăng nhập

        // 1. Kiểm tra xem sản phẩm này có đúng là của user đang đăng nhập không
        const checkSql = "SELECT * FROM san_pham WHERE ma_san_pham = ? AND ma_thanh_vien = ?";
        db.query(checkSql, [ma_san_pham, ma_thanh_vien], (err, results) => {
            if (err) return res.status(500).json({ error: "Lỗi kiểm tra Database" });

            if (results.length === 0) {
                return res.status(403).json({ error: "Bạn không có quyền xóa sản phẩm này!" });
            }

            if (results[0].trang_thai === PRODUCT_STATUS.IN_TRANSACTION) {
                return res.status(409).json({ error: "Sản phẩm đang có người mua, vui lòng xác nhận hoặc từ chối giao dịch trước." });
            }

            // 2. Nếu hợp lệ, tiến hành xóa
            const deleteSql = "DELETE FROM san_pham WHERE ma_san_pham = ?";
            db.query(deleteSql, [ma_san_pham], (err, result) => {
                if (err) return res.status(500).json({ error: "Lỗi khi xóa sản phẩm trong Database" });
                res.json({ message: "Xóa sản phẩm thành công!" });
            });
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
};
