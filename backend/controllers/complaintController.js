const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const promiseDb = db.promise();

const COMPLAINT_STATUS = {
    SENT: "da_gui"
};

async function ensureComplaintTable() {
    await promiseDb.query(`
        CREATE TABLE IF NOT EXISTS to_cao_khieu_nai (
            ma_to_cao INT AUTO_INCREMENT PRIMARY KEY,
            noi_dung TEXT NOT NULL,
            loai_to_cao VARCHAR(50),
            anh_minh_chung VARCHAR(255),
            trang_thai VARCHAR(50),
            ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
            ma_thanh_vien INT,
            ma_to_chuc INT,
            ma_bai_dang INT,
            ma_san_pham INT
        )
    `);

    try {
        await promiseDb.query("ALTER TABLE to_cao_khieu_nai ADD COLUMN anh_minh_chung VARCHAR(255) NULL AFTER loai_to_cao");
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }
}

function getUploadedImagePath(file) {
    return file ? `/uploads/${file.filename}` : "";
}

async function removeUploadedFile(file) {
    if (!file?.path) return;

    try {
        await fs.promises.unlink(file.path);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("Không thể xóa file upload không dùng:", err);
        }
    }
}

async function removeComplaintImage(imagePath) {
    if (!imagePath || !imagePath.startsWith("/uploads/")) return;

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const absolutePath = path.join(uploadsDir, path.basename(imagePath));

    try {
        await fs.promises.unlink(absolutePath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("Không thể xóa ảnh minh chứng khiếu nại:", err);
        }
    }
}

function getComplaintSelectSql(whereClause = "") {
    return `
        SELECT
            tc.ma_to_cao,
            tc.noi_dung,
            tc.loai_to_cao,
            tc.anh_minh_chung,
            tc.trang_thai,
            tc.ngay_gui,
            tc.ma_thanh_vien,
            tc.ma_to_chuc,
            CASE
                WHEN tc.ma_to_chuc IS NOT NULL THEN 'to_chuc'
                ELSE 'thanh_vien'
            END AS loai_tai_khoan,
            COALESCE(tv.ho_ten, org.ten_to_chuc, 'Người dùng') AS ten_nguoi_gui,
            COALESCE(tv.email, org.email) AS email_nguoi_gui,
            COALESCE(tv.sdt, org.sdt) AS sdt_nguoi_gui
        FROM to_cao_khieu_nai tc
        LEFT JOIN thanh_vien tv ON tv.ma_thanh_vien = tc.ma_thanh_vien
        LEFT JOIN to_chuc org ON org.ma_to_chuc = tc.ma_to_chuc
        ${whereClause}
        ORDER BY tc.ngay_gui DESC, tc.ma_to_cao DESC
    `;
}

exports.createComplaint = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;
    const noiDung = String(req.body.noi_dung || req.body.content || "").trim();
    const imagePath = getUploadedImagePath(req.file);

    if (!["thanh_vien", "to_chuc"].includes(accountType)) {
        await removeUploadedFile(req.file);
        return res.status(403).json({ message: "Chỉ thành viên hoặc tổ chức mới có thể gửi tố cáo khiếu nại." });
    }

    if (!noiDung) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ message: "Vui lòng nhập nội dung tố cáo khiếu nại." });
    }

    if (req.file && !String(req.file.mimetype || "").startsWith("image/")) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ message: "Vui lòng tải lên đúng file ảnh." });
    }

    if (!imagePath) {
        return res.status(400).json({ message: "Vui lòng tải lên ảnh minh chứng." });
    }

    try {
        await ensureComplaintTable();

        const [result] = await promiseDb.query(
            `INSERT INTO to_cao_khieu_nai
                (noi_dung, loai_to_cao, anh_minh_chung, trang_thai, ma_thanh_vien, ma_to_chuc)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                noiDung,
                "to_cao_khieu_nai",
                imagePath,
                COMPLAINT_STATUS.SENT,
                accountType === "thanh_vien" ? userId : null,
                accountType === "to_chuc" ? userId : null
            ]
        );

        res.status(201).json({
            message: "Đã gửi tố cáo khiếu nại tới admin.",
            complaint: {
                ma_to_cao: result.insertId,
                noi_dung: noiDung,
                anh_minh_chung: imagePath,
                trang_thai: COMPLAINT_STATUS.SENT
            }
        });
    } catch (err) {
        await removeUploadedFile(req.file);
        res.status(500).json({ message: "Không thể gửi tố cáo khiếu nại.", error: err.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        await ensureComplaintTable();

        const [complaints] = await promiseDb.query(getComplaintSelectSql());
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ message: "Không thể tải danh sách tố cáo khiếu nại.", error: err.message });
    }
};

exports.deleteComplaint = async (req, res) => {
    const complaintId = req.params.id;

    try {
        await ensureComplaintTable();

        const [rows] = await promiseDb.query(
            "SELECT ma_to_cao, anh_minh_chung FROM to_cao_khieu_nai WHERE ma_to_cao = ? LIMIT 1",
            [complaintId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tố cáo khiếu nại." });
        }

        await promiseDb.query("DELETE FROM to_cao_khieu_nai WHERE ma_to_cao = ?", [complaintId]);
        await removeComplaintImage(rows[0].anh_minh_chung);

        res.json({ message: "Đã xóa tố cáo khiếu nại." });
    } catch (err) {
        res.status(500).json({ message: "Không thể xóa tố cáo khiếu nại.", error: err.message });
    }
};
