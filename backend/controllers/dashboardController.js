const db = require('../config/db');
const promiseDb = db.promise();

exports.getMemberStats = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Lỗi xác thực: Không tìm thấy ID người dùng!" });
        }

        const ma_thanh_vien = req.user.id;

        const [rows] = await promiseDb.execute(`
            SELECT
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ?) as spDaDang,
                (SELECT COUNT(DISTINCT ma_san_pham) FROM thanh_toan WHERE ma_thanh_vien_nhan = ? AND trang_thai IN ('da_ban', 'da_thanh_toan', 'hoan_tat')) as daBan,
                (SELECT COUNT(*) FROM san_pham WHERE ma_thanh_vien = ? AND so_phan_tram_quyen_gop > 0) as quyenGop
        `, [ma_thanh_vien, ma_thanh_vien, ma_thanh_vien]);

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Lỗi Database: " + err.message });
    }
};
