const db = require('../config/db');
const promiseDb = db.promise();

const PRODUCT_STATUS = {
    PENDING: 'cho_duyet',
    APPROVED: 'da_duyet',
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

// Xử lý lấy thống kê Dashboard
exports.getMemberStats = async (req, res) => {
    const ma_thanh_vien = req.user.id; // Lấy từ token sau khi xác thực
    try {
        const [rows] = await promiseDb.execute(`
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ?) as spDaDang,
                (SELECT COUNT(DISTINCT ma_san_pham) FROM thanh_toan WHERE ma_thanh_vien_nhan = ? AND trang_thai IN ('da_ban', 'da_thanh_toan', 'hoan_tat')) as daBan,
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
                (SELECT COUNT(*) FROM san_pham) AS products,
                (SELECT COUNT(*) FROM hoat_dong_quyen_gop) AS campaigns,
                (SELECT COUNT(*) FROM thanh_vien) AS members
        `);

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
             WHERE sp.trang_thai = ?
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

exports.getMyProducts = (req, res) => {
    try {
        const ma_thanh_vien = req.user.id;

        // Lấy sản phẩm, sắp xếp mới nhất lên đầu
        const sql = "SELECT * FROM san_pham WHERE ma_thanh_vien = ? ORDER BY ma_san_pham DESC";

        db.query(sql, [ma_thanh_vien], (err, results) => {
            if (err) {
                console.error("Lỗi khi lấy danh sách sản phẩm:", err);
                return res.status(500).json({ error: "Lỗi Database" });
            }
            res.json(results);
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi hệ thống" });
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
