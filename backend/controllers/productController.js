const db = require('../config/db');
const promiseDb = db.promise();

// Xử lý lấy thống kê Dashboard
exports.getMemberStats = async (req, res) => {
    const ma_thanh_vien = req.user.id; // Lấy từ token sau khi xác thực
    try {
        const [rows] = await promiseDb.execute(`
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ?) as spDaDang,
                (SELECT COUNT(*) FROM thanh_toan WHERE ma_thanh_vien_nhan = ? AND trang_thai = 'da_ban') as daBan,
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ? AND so_phan_tram_quyen_gop > 0) as quyenGop
        `, [ma_thanh_vien, ma_thanh_vien, ma_thanh_vien]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy danh sách danh mục
exports.getCategories = (req, res) => {
    db.query("SELECT ma_danh_muc, ten_danh_muc FROM danh_muc", (err, result) => {
        if (err) {
            console.error("LỖI SQL KHI LẤY DANH MỤC:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
};

exports.createProduct = async (req, res) => {
    // 1. CHỐT CHẶN BÁO CÁO: In toàn bộ những gì Backend nhận được ra Terminal
    console.log("\n=== KIỂM TRA LUỒNG DỮ LIỆU ĐẦU VÀO ===");
    console.log("Headers Content-Type:", req.headers['content-type']);
    console.log("Dữ liệu dạng Text (req.body):", req.body);
    console.log("Dữ liệu File (req.file):", req.file);
    console.log("======================================\n");

    try {
        // 2. CHỐT CHẶN LOGIC: Chặn đứng request nếu Multer không bóc tách được dữ liệu
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                error: "Lỗi Hệ Thống: req.body rỗng. Middleware Multer chưa được kích hoạt hoặc cấu hình sai ở Route!"
            });
        }

        if (!req.body.ten_san_pham) {
            return res.status(400).json({
                error: "Lỗi Hệ Thống: Có nhận được Form nhưng trường ten_san_pham bị thiếu!"
            });
        }

        // 3. XỬ LÝ DỮ LIỆU CHÍNH
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
            VALUES (?, ?, ?, ?, ?, 'cho_duyet', ?, ?, ?, ?, ?)`;

        await promiseDb.execute(sql, [
            ten_san_pham, anh, mo_ta || null, finalGia, tinh_trang || 'Như mới',
            finalSoLuong, ma_thanh_vien, finalMaDanhMuc, finalPhanTram, finalMaHoatDong
        ]);

        res.status(201).json({ message: "Đăng sản phẩm thành công!" });
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
