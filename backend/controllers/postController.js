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
            anh_minh_hoa LONGTEXT NULL,
            loai_bai_dang VARCHAR(50),
            trang_thai VARCHAR(50),
            ngay_dang DATETIME DEFAULT CURRENT_TIMESTAMP,
            ma_thanh_vien INT,
            ma_to_chuc INT
        )
    `);

    try {
        await promiseDb.query("ALTER TABLE bai_dang ADD COLUMN anh_minh_hoa LONGTEXT NULL AFTER noi_dung");
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    try {
        await promiseDb.query("ALTER TABLE bai_dang ADD COLUMN ma_to_chuc INT NULL AFTER ma_thanh_vien");
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }
}

function getPostSelectSql(whereClause = "") {
    return `
        SELECT
            bd.ma_bai_dang,
            bd.tieu_de,
            bd.noi_dung,
            bd.anh_minh_hoa,
            bd.loai_bai_dang,
            bd.trang_thai,
            bd.ngay_dang,
            bd.ma_thanh_vien,
            bd.ma_to_chuc,
            COALESCE(tv.ho_ten, tc.ten_to_chuc) AS ho_ten,
            CASE
                WHEN bd.ma_to_chuc IS NOT NULL THEN 'to_chuc'
                ELSE 'thanh_vien'
            END AS loai_nguoi_dang
        FROM bai_dang bd
        LEFT JOIN thanh_vien tv ON tv.ma_thanh_vien = bd.ma_thanh_vien
        LEFT JOIN to_chuc tc ON tc.ma_to_chuc = bd.ma_to_chuc
        ${whereClause}
        ORDER BY bd.ngay_dang DESC, bd.ma_bai_dang DESC
    `;
}

exports.createPost = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;
    const ma_thanh_vien = accountType === "thanh_vien" ? userId : null;
    const ma_to_chuc = accountType === "to_chuc" ? userId : null;
    const tieu_de = String(req.body.tieu_de || req.body.title || "").trim();
    const noi_dung = String(req.body.noi_dung || req.body.description || "").trim();
    const loai_bai_dang = String(req.body.loai_bai_dang || req.body.type || "trao_doi_chia_se").trim();
    const anh_minh_hoa = req.file ? `/uploads/${req.file.filename}` : null;

    if (!["thanh_vien", "to_chuc"].includes(accountType)) {
        return res.status(403).json({ message: "Tài khoản này không có quyền tạo bài đăng hoạt động." });
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
                (tieu_de, noi_dung, anh_minh_hoa, loai_bai_dang, trang_thai, ma_thanh_vien, ma_to_chuc)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tieu_de, noi_dung, anh_minh_hoa, loai_bai_dang, POST_STATUS.PENDING, ma_thanh_vien, ma_to_chuc]
        );

        res.status(201).json({
            message: "Đã gửi bài đăng hoạt động cho admin duyệt.",
            post: {
                ma_bai_dang: result.insertId,
                tieu_de,
                noi_dung,
                anh_minh_hoa,
                loai_bai_dang,
                trang_thai: POST_STATUS.PENDING,
                ma_thanh_vien,
                ma_to_chuc
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

exports.getMyPosts = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;

    if (!["thanh_vien", "to_chuc"].includes(accountType)) {
        return res.status(403).json({ message: "Tài khoản này không có quyền xem bài đăng hoạt động." });
    }

    try {
        await ensureActivityPostTable();

        const whereClause = accountType === "to_chuc"
            ? "WHERE bd.ma_to_chuc = ?"
            : "WHERE bd.ma_thanh_vien = ?";

        const [posts] = await promiseDb.query(
            getPostSelectSql(whereClause),
            [userId]
        );

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy bài đăng hoạt động của bạn.", error: err.message });
    }
};

exports.updatePost = async (req, res) => {
    const { id } = req.params;
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;
    const tieu_de = String(req.body.tieu_de || req.body.title || "").trim();
    const noi_dung = String(req.body.noi_dung || req.body.description || "").trim();
    const loai_bai_dang = String(req.body.loai_bai_dang || req.body.type || "trao_doi_chia_se").trim();
    const shouldRemoveImage = String(req.body.remove_anh_minh_hoa || "") === "1";

    if (!["thanh_vien", "to_chuc"].includes(accountType)) {
        return res.status(403).json({ message: "Tài khoản này không có quyền chỉnh sửa bài đăng hoạt động." });
    }

    if (!tieu_de || !noi_dung) {
        return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung bài đăng." });
    }

    if (!POST_TYPES.includes(loai_bai_dang)) {
        return res.status(400).json({ message: "Loại bài đăng không hợp lệ." });
    }

    try {
        await ensureActivityPostTable();

        const [posts] = await promiseDb.query(
            "SELECT ma_bai_dang, ma_thanh_vien, ma_to_chuc, anh_minh_hoa FROM bai_dang WHERE ma_bai_dang = ? LIMIT 1",
            [id]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài đăng." });
        }

        const post = posts[0];
        const isOwner = accountType === "to_chuc"
            ? Number(post.ma_to_chuc) === Number(userId)
            : Number(post.ma_thanh_vien) === Number(userId);

        if (!isOwner) {
            return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa bài đăng này." });
        }

        let anh_minh_hoa = post.anh_minh_hoa || null;
        if (req.file) {
            anh_minh_hoa = `/uploads/${req.file.filename}`;
        } else if (shouldRemoveImage) {
            anh_minh_hoa = null;
        }

        await promiseDb.query(
            `UPDATE bai_dang
             SET tieu_de = ?,
                 noi_dung = ?,
                 anh_minh_hoa = ?,
                 loai_bai_dang = ?,
                 trang_thai = ?
             WHERE ma_bai_dang = ?`,
            [tieu_de, noi_dung, anh_minh_hoa, loai_bai_dang, POST_STATUS.PENDING, id]
        );

        res.json({
            message: "Đã gửi chỉnh sửa bài đăng hoạt động cho admin duyệt.",
            post: {
                ma_bai_dang: Number(id),
                tieu_de,
                noi_dung,
                anh_minh_hoa,
                loai_bai_dang,
                trang_thai: POST_STATUS.PENDING
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể chỉnh sửa bài đăng hoạt động.", error: err.message });
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
