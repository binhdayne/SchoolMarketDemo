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
    COMPLETED: 'hoan_tat',
    REJECTED: 'tu_choi'
};

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

    await promiseDb.query("UPDATE thanh_toan SET so_luong = 1 WHERE so_luong IS NULL OR so_luong < 1");
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

        const finalMaDanhMuc = (ma_danh_muc && ma_danh_muc !== "") ? parseInt(ma_danh_muc) : null;
        const finalMaHoatDong = (ma_hoat_dong && ma_hoat_dong !== "") ? parseInt(ma_hoat_dong) : null;
        const finalGia = gia ? parseFloat(gia) : 0;
        const finalSoLuong = so_luong ? parseInt(so_luong) : 1;
        const finalPhanTram = so_phan_tram_quyen_gop ? parseInt(so_phan_tram_quyen_gop) : 0;

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
                dm.ten_danh_muc,
                seller.ma_thanh_vien AS ma_nguoi_ban,
                seller.ho_ten AS ten_nguoi_ban,
                seller.ma_ngan_hang,
                seller.so_tai_khoan,
                seller.ten_ngan_hang
             FROM san_pham sp
             LEFT JOIN danh_muc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = sp.ma_thanh_vien
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

        if (!String(product.ma_ngan_hang || "").trim()) {
            return res.status(409).json({ error: "Người bán chưa cập nhật QR nhận tiền." });
        }

        res.json(product);
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
                seller.ma_ngan_hang
             FROM san_pham sp
             LEFT JOIN thanh_vien seller ON seller.ma_thanh_vien = sp.ma_thanh_vien
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

        const [paymentResult] = await promiseDb.execute(
            `INSERT INTO thanh_toan
                (ma_thanh_vien_gui, ma_thanh_vien_nhan, ma_san_pham, so_tien_giao_dich,
                 so_luong, anh_xac_nhan_giao_dich, ghi_chu, trang_thai)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                buyerId,
                product.ma_thanh_vien,
                product.ma_san_pham,
                totalAmount,
                requestedQuantity,
                receiptPath,
                req.body?.ghi_chu || null,
                PAYMENT_STATUS.PENDING_SELLER
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
            trang_thai: PAYMENT_STATUS.PENDING_SELLER
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
