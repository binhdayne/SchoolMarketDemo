const db = require("../config/db");

const promiseDb = db.promise();

const NOTIFICATION_TARGETS = {
    MEMBER: "thanh_vien",
    ORGANIZATION: "to_chuc"
};

async function ensureNotificationTable() {
    await promiseDb.query(`
        CREATE TABLE IF NOT EXISTS thong_bao (
            ma_thong_bao INT AUTO_INCREMENT PRIMARY KEY,
            tieu_de VARCHAR(150) NOT NULL,
            noi_dung TEXT,
            loai_thong_bao VARCHAR(50),
            duong_dan VARCHAR(100),
            da_doc TINYINT(1) DEFAULT 0,
            ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
            ma_thanh_vien INT NULL,
            ma_to_chuc INT NULL
        )
    `);

    const statements = [
        "ALTER TABLE thong_bao ADD COLUMN loai_thong_bao VARCHAR(50) NULL AFTER noi_dung",
        "ALTER TABLE thong_bao ADD COLUMN duong_dan VARCHAR(100) NULL AFTER loai_thong_bao",
        "ALTER TABLE thong_bao ADD COLUMN da_doc TINYINT(1) DEFAULT 0 AFTER duong_dan",
        "ALTER TABLE thong_bao ADD COLUMN ma_to_chuc INT NULL AFTER ma_thanh_vien"
    ];

    for (const statement of statements) {
        try {
            await promiseDb.query(statement);
        } catch (err) {
            if (err.code !== "ER_DUP_FIELDNAME") {
                throw err;
            }
        }
    }
}

async function createNotification({
    ma_thanh_vien = null,
    ma_to_chuc = null,
    tieu_de,
    noi_dung,
    loai_thong_bao = "he_thong",
    duong_dan = null
}) {
    if (!ma_thanh_vien && !ma_to_chuc) return null;
    if (!String(tieu_de || "").trim()) return null;

    await ensureNotificationTable();

    const [result] = await promiseDb.query(
        `INSERT INTO thong_bao
            (tieu_de, noi_dung, loai_thong_bao, duong_dan, ma_thanh_vien, ma_to_chuc)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            String(tieu_de).trim(),
            String(noi_dung || "").trim() || null,
            loai_thong_bao,
            duong_dan,
            ma_thanh_vien || null,
            ma_to_chuc || null
        ]
    );

    return result.insertId;
}

exports.createNotification = createNotification;
exports.ensureNotificationTable = ensureNotificationTable;

exports.getNotifications = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;

    if (![NOTIFICATION_TARGETS.MEMBER, NOTIFICATION_TARGETS.ORGANIZATION].includes(accountType)) {
        return res.json([]);
    }

    try {
        await ensureNotificationTable();

        const whereClause = accountType === NOTIFICATION_TARGETS.ORGANIZATION
            ? "ma_to_chuc = ?"
            : "ma_thanh_vien = ?";

        const [notifications] = await promiseDb.query(
            `SELECT
                ma_thong_bao,
                tieu_de,
                noi_dung,
                loai_thong_bao,
                duong_dan,
                da_doc,
                ngay_tao
             FROM thong_bao
             WHERE ${whereClause}
             ORDER BY ngay_tao DESC, ma_thong_bao DESC
             LIMIT 50`,
            [userId]
        );

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: "Không thể tải thông báo.", error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;

    if (![NOTIFICATION_TARGETS.MEMBER, NOTIFICATION_TARGETS.ORGANIZATION].includes(accountType)) {
        return res.json({ unread: 0 });
    }

    try {
        await ensureNotificationTable();

        const whereClause = accountType === NOTIFICATION_TARGETS.ORGANIZATION
            ? "ma_to_chuc = ?"
            : "ma_thanh_vien = ?";

        const [rows] = await promiseDb.query(
            `SELECT COUNT(*) AS unread
             FROM thong_bao
             WHERE ${whereClause} AND da_doc = 0`,
            [userId]
        );

        res.json({ unread: Number(rows[0]?.unread || 0) });
    } catch (err) {
        res.status(500).json({ message: "Không thể tải số thông báo.", error: err.message });
    }
};

exports.markNotificationRead = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;
    const notificationId = req.params.id;

    if (![NOTIFICATION_TARGETS.MEMBER, NOTIFICATION_TARGETS.ORGANIZATION].includes(accountType)) {
        return res.status(403).json({ message: "Tài khoản này không có thông báo." });
    }

    try {
        await ensureNotificationTable();

        const ownerColumn = accountType === NOTIFICATION_TARGETS.ORGANIZATION ? "ma_to_chuc" : "ma_thanh_vien";
        const [result] = await promiseDb.query(
            `UPDATE thong_bao
             SET da_doc = 1
             WHERE ma_thong_bao = ? AND ${ownerColumn} = ?`,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy thông báo." });
        }

        res.json({ message: "Đã đánh dấu đã đọc." });
    } catch (err) {
        res.status(500).json({ message: "Không thể cập nhật thông báo.", error: err.message });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    const accountType = req.user?.accountType || req.user?.role;
    const userId = req.user?.id;

    if (![NOTIFICATION_TARGETS.MEMBER, NOTIFICATION_TARGETS.ORGANIZATION].includes(accountType)) {
        return res.status(403).json({ message: "Tài khoản này không có thông báo." });
    }

    try {
        await ensureNotificationTable();

        const ownerColumn = accountType === NOTIFICATION_TARGETS.ORGANIZATION ? "ma_to_chuc" : "ma_thanh_vien";
        await promiseDb.query(
            `UPDATE thong_bao
             SET da_doc = 1
             WHERE ${ownerColumn} = ?`,
            [userId]
        );

        res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc." });
    } catch (err) {
        res.status(500).json({ message: "Không thể cập nhật thông báo.", error: err.message });
    }
};
