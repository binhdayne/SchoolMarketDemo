const db = require("../config/db");

const promiseDb = db.promise();

const POST_STATUS = {
    PENDING: "cho_duyet",
    APPROVED: "da_duyet",
    REJECTED: "tu_choi"
};

const POST_TYPES = [
    "keu_goi_tinh_nguyen",
    "trao_doi_chia_se",
    "hoi_dap",
    "khac"
];

async function ensureActivityPostTable() {
    await promiseDb.query(`
        CREATE TABLE IF NOT EXISTS bai_dang (
            ma_bai_dang INT AUTO_INCREMENT PRIMARY KEY,
            tieu_de VARCHAR(150) NOT NULL,
            noi_dung TEXT,
            loai_bai_dang VARCHAR(50),
            trang_thai VARCHAR(50),
            ngay_dang DATETIME DEFAULT CURRENT_TIMESTAMP,
            ma_thanh_vien INT,
            ma_to_chuc INT
        )
    `);
}

function getPostSelectSql(whereClause = "") {
    return `
        SELECT
            bd.ma_bai_dang,
            bd.tieu_de,
            bd.noi_dung,
            bd.loai_bai_dang,
            bd.trang_thai,
            bd.ngay_dang,
            bd.ma_thanh_vien,
            tv.ho_ten
        FROM bai_dang bd
        LEFT JOIN thanh_vien tv ON tv.ma_thanh_vien = bd.ma_thanh_vien
        ${whereClause}
        ORDER BY bd.ngay_dang DESC, bd.ma_bai_dang DESC
    `;
}

exports.createPost = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const ma_thanh_vien = req.user?.id;
    const tieu_de = String(req.body.tieu_de || req.body.title || "").trim();
    const noi_dung = String(req.body.noi_dung || req.body.description || "").trim();
    const loai_bai_dang = String(req.body.loai_bai_dang || req.body.type || "trao_doi_chia_se").trim();

    if (accountType !== "thanh_vien") {
        return res.status(403).json({ message: "Chỉ thành viên mới có thể tạo bài đăng hoạt động." });
    }

    if (!tieu_de || !noi_dung) {
        return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung bài đăng." });
    }

    if (!POST_TYPES.includes(loai_bai_dang)) {
        return res.status(400).json({ message: "Loại bài đăng không hợp lệ." });
    }

    try {
        await ensureActivityPostTable();

        const [result] = await promiseDb.query(
            `INSERT INTO bai_dang
                (tieu_de, noi_dung, loai_bai_dang, trang_thai, ma_thanh_vien)
             VALUES (?, ?, ?, ?, ?)`,
            [tieu_de, noi_dung, loai_bai_dang, POST_STATUS.PENDING, ma_thanh_vien]
        );

        res.status(201).json({
            message: "Đã gửi bài đăng hoạt động cho admin duyệt.",
            post: {
                ma_bai_dang: result.insertId,
                tieu_de,
                noi_dung,
                loai_bai_dang,
                trang_thai: POST_STATUS.PENDING,
                ma_thanh_vien
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể tạo bài đăng hoạt động.", error: err.message });
    }
};

exports.getApprovedPosts = async (req, res) => {
    try {
        await ensureActivityPostTable();

        const [posts] = await promiseDb.query(
            getPostSelectSql("WHERE bd.trang_thai IN (?, ?)"),
            [POST_STATUS.APPROVED, "approved"]
        );

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách bài đăng hoạt động.", error: err.message });
    }
};

exports.getPendingPosts = async (req, res) => {
    try {
        await ensureActivityPostTable();

        const [posts] = await promiseDb.query(
            getPostSelectSql("WHERE bd.trang_thai IN (?, ?)"),
            [POST_STATUS.PENDING, "pending"]
        );

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy bài đăng chờ duyệt.", error: err.message });
    }
};

exports.approvePost = async (req, res) => {
    const { id } = req.params;

    try {
        await ensureActivityPostTable();

        const [result] = await promiseDb.query(
            "UPDATE bai_dang SET trang_thai = ? WHERE ma_bai_dang = ?",
            [POST_STATUS.APPROVED, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài đăng." });
        }

        res.json({ message: "Đã duyệt bài đăng." });
    } catch (err) {
        res.status(500).json({ message: "Không thể duyệt bài đăng.", error: err.message });
    }
};

exports.rejectPost = async (req, res) => {
    const { id } = req.params;

    try {
        await ensureActivityPostTable();

        const [result] = await promiseDb.query(
            "UPDATE bai_dang SET trang_thai = ? WHERE ma_bai_dang = ?",
            [POST_STATUS.REJECTED, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài đăng." });
        }

        res.json({ message: "Đã từ chối bài đăng." });
    } catch (err) {
        res.status(500).json({ message: "Không thể từ chối bài đăng.", error: err.message });
    }
};
