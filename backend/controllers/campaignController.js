const db = require('../config/db');

// Lấy danh sách hoạt động
exports.getCampaigns = (req, res) => {
    // Sửa tên bảng từ 'campaigns' thành 'hoat_dong_quyen_gop'
    db.query("SELECT ma_hoat_dong, ten_hoat_dong FROM hoat_dong_quyen_gop", (err, result) => {
        if (err) {
            console.error("Lỗi lấy hoạt động:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
};

// Tạo hoạt động mới
exports.createCampaign = (req, res) => {
    const { ten_hoat_dong, mo_ta, ngay_to_chuc, dia_diem, trang_thai, ma_to_chuc, han_ket_thuc } = req.body;

    // Sửa tên bảng và danh sách cột cho khớp với hình ảnh bạn gửi
    const sql = `INSERT INTO hoat_dong_quyen_gop 
        (ten_hoat_dong, mo_ta, ngay_to_chuc, dia_diem, trang_thai, ma_to_chuc, han_ket_thuc) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [ten_hoat_dong, mo_ta, ngay_to_chuc, dia_diem, trang_thai, ma_to_chuc, han_ket_thuc], (err) => {
        if (err) {
            console.error("Lỗi tạo hoạt động:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Hoạt động đã được tạo thành công!" });
    });
};