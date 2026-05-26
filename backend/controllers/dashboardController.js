const db = require('../config/db');

// Bỏ chữ 'async' đi vì chúng ta dùng Callback
exports.getMemberStats = (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Lỗi xác thực: Không tìm thấy ID người dùng!" });
        }

        const ma_thanh_vien = req.user.id;

        // Câu lệnh SQL tổng hợp
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ?) as spDaDang,
                (SELECT COUNT(*) FROM thanh_toan WHERE ma_thanh_vien_nhan = ? AND trang_thai = 'da_ban') as daBan,
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ? AND so_phan_tram_quyen_gop > 0) as quyenGop
        `;

        // Dùng db.query với Callback giống hệt như getCategories
        db.query(sql, [ma_thanh_vien, ma_thanh_vien, ma_thanh_vien], (err, result) => {
            if (err) {
                console.error("❌ LỖI SQL KHI LẤY THỐNG KÊ DASHBOARD:", err);
                return res.status(500).json({ error: "Lỗi Database: " + err.message });
            }

            // result là một mảng các dòng dữ liệu trả về từ MySQL
            // Vì chúng ta chỉ SELECT 1 dòng tổng hợp, nên dữ liệu nằm ở vị trí [0]
            res.json(result[0]);
        });

    } catch (err) {
        console.error("❌ LỖI SERVER KHI LẤY THỐNG KÊ:", err);
        res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
    }
};