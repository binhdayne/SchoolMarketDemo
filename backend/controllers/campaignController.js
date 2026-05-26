const db = require("../config/db");

const promiseDb = db.promise();

const CAMPAIGN_STATUS = {
    PENDING: "cho_duyet",
    APPROVED: "da_duyet",
    REJECTED: "tu_choi"
};

const DONATION_TYPES = [
    "nhan_tien_chuyen_khoan",
    "ban_do_quyen_gop",
    "nhan_do_vat"
];

let campaignExtraColumnsReady = false;

async function ensureCampaignExtraColumns() {
    if (campaignExtraColumnsReady) return;

    try {
        await promiseDb.query(
            "ALTER TABLE hoat_dong_quyen_gop ADD COLUMN anh_minh_hoa LONGTEXT NULL AFTER han_ket_thuc"
        );
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    try {
        await promiseDb.query(
            "ALTER TABLE hoat_dong_quyen_gop ADD COLUMN hinh_thuc_quyen_gop VARCHAR(50) NULL AFTER anh_minh_hoa"
        );
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    await promiseDb.query("ALTER TABLE hoat_dong_quyen_gop MODIFY COLUMN anh_minh_hoa LONGTEXT NULL");
    campaignExtraColumnsReady = true;
}

function normalizeDateTime(value) {
    return String(value || "").trim().replace("T", " ");
}

function getCampaignSelectSql(whereClause = "") {
    return `
        SELECT
            hd.ma_hoat_dong,
            hd.ten_hoat_dong,
            hd.mo_ta,
            hd.ngay_to_chuc,
            hd.dia_diem,
            hd.trang_thai,
            hd.ma_to_chuc,
            hd.han_ket_thuc,
            hd.anh_minh_hoa,
            hd.hinh_thuc_quyen_gop,
            tc.ten_to_chuc
        FROM hoat_dong_quyen_gop hd
        LEFT JOIN to_chuc tc ON tc.ma_to_chuc = hd.ma_to_chuc
        ${whereClause}
        ORDER BY hd.ma_hoat_dong DESC
    `;
}

exports.createCampaign = async (req, res) => {
    const ma_to_chuc = req.user?.id;
    const ten_hoat_dong = String(req.body.ten_hoat_dong || "").trim();
    const mo_ta = String(req.body.mo_ta || "").trim();
    const ngay_to_chuc = normalizeDateTime(req.body.ngay_to_chuc);
    const dia_diem = String(req.body.dia_diem || "").trim();
    const han_ket_thuc = normalizeDateTime(req.body.han_ket_thuc);
    const anh_minh_hoa = String(req.body.anh_minh_hoa || "").trim();
    const hinh_thuc_quyen_gop = String(req.body.hinh_thuc_quyen_gop || "").trim();

    if (!ma_to_chuc) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    if (
        !ten_hoat_dong ||
        !mo_ta ||
        !ngay_to_chuc ||
        !dia_diem ||
        !han_ket_thuc ||
        !anh_minh_hoa ||
        !hinh_thuc_quyen_gop
    ) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin sự kiện quyên góp" });
    }

    if (!DONATION_TYPES.includes(hinh_thuc_quyen_gop)) {
        return res.status(400).json({ message: "Hình thức quyên góp không hợp lệ" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [result] = await promiseDb.query(
            `INSERT INTO hoat_dong_quyen_gop
                (ten_hoat_dong, mo_ta, ngay_to_chuc, dia_diem, trang_thai, ma_to_chuc, han_ket_thuc, anh_minh_hoa, hinh_thuc_quyen_gop)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ten_hoat_dong,
                mo_ta,
                ngay_to_chuc,
                dia_diem,
                CAMPAIGN_STATUS.PENDING,
                ma_to_chuc,
                han_ket_thuc,
                anh_minh_hoa,
                hinh_thuc_quyen_gop
            ]
        );

        res.status(201).json({
            message: "Đã gửi sự kiện quyên góp cho admin duyệt",
            campaign: {
                ma_hoat_dong: result.insertId,
                ten_hoat_dong,
                mo_ta,
                ngay_to_chuc,
                dia_diem,
                trang_thai: CAMPAIGN_STATUS.PENDING,
                ma_to_chuc,
                han_ket_thuc,
                anh_minh_hoa,
                hinh_thuc_quyen_gop
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể tạo sự kiện quyên góp", error: err.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        await ensureCampaignExtraColumns();

        const [campaigns] = await promiseDb.query(
            getCampaignSelectSql("WHERE hd.trang_thai = ?"),
            [CAMPAIGN_STATUS.APPROVED]
        );

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách sự kiện quyên góp", error: err.message });
    }
};

exports.getPendingCampaigns = async (req, res) => {
    try {
        await ensureCampaignExtraColumns();

        const [campaigns] = await promiseDb.query(
            getCampaignSelectSql("WHERE hd.trang_thai = ?"),
            [CAMPAIGN_STATUS.PENDING]
        );

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách sự kiện chờ duyệt", error: err.message });
    }
};

exports.getMyApprovedCampaigns = async (req, res) => {
    const ma_to_chuc = req.user?.id;

    if (!ma_to_chuc) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [campaigns] = await promiseDb.query(
            getCampaignSelectSql("WHERE hd.ma_to_chuc = ? AND hd.trang_thai = ?"),
            [ma_to_chuc, CAMPAIGN_STATUS.APPROVED]
        );

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy sự kiện của tổ chức", error: err.message });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    const { id } = req.params;
    const nextStatus = req.action === "approve" ? CAMPAIGN_STATUS.APPROVED : CAMPAIGN_STATUS.REJECTED;

    try {
        await ensureCampaignExtraColumns();

        const [result] = await promiseDb.query(
            "UPDATE hoat_dong_quyen_gop SET trang_thai = ? WHERE ma_hoat_dong = ?",
            [nextStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện quyên góp" });
        }

        res.json({
            message: req.action === "approve" ? "Đã duyệt sự kiện quyên góp" : "Đã từ chối sự kiện quyên góp",
            trang_thai: nextStatus
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể cập nhật trạng thái sự kiện", error: err.message });
    }
};

exports.approveCampaign = (req, res, next) => {
    req.action = "approve";
    return exports.updateCampaignStatus(req, res, next);
};

exports.rejectCampaign = (req, res, next) => {
    req.action = "reject";
    return exports.updateCampaignStatus(req, res, next);
};
