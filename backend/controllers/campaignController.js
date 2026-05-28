const db = require("../config/db");

const promiseDb = db.promise();

const CAMPAIGN_STATUS = {
    PENDING: "cho_duyet",
    APPROVED: "da_duyet",
    REJECTED: "tu_choi"
};

const CONTRIBUTION_STATUS = {
    PENDING: "cho_xac_nhan",
    CONFIRMED: "da_xac_nhan"
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

    try {
        await promiseDb.query(
            "ALTER TABLE hoat_dong_quyen_gop ADD COLUMN ma_qr_quyen_gop LONGTEXT NULL AFTER hinh_thuc_quyen_gop"
        );
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    try {
        await promiseDb.query(
            "ALTER TABLE hoat_dong_quyen_gop ADD COLUMN so_tien_toi_thieu DECIMAL(12,2) DEFAULT 0 AFTER ma_qr_quyen_gop"
        );
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    await promiseDb.query(`
        CREATE TABLE IF NOT EXISTS dong_gop_su_kien (
            ma_dong_gop INT AUTO_INCREMENT PRIMARY KEY,
            ma_hoat_dong INT NOT NULL,
            ma_thanh_vien INT NOT NULL,
            so_tien DECIMAL(12,2) NOT NULL,
            anh_bien_lai LONGTEXT NOT NULL,
            ghi_chu TEXT,
            trang_thai VARCHAR(50) DEFAULT 'cho_xac_nhan',
            ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
            ngay_xac_nhan DATETIME,
            FOREIGN KEY (ma_hoat_dong) REFERENCES hoat_dong_quyen_gop(ma_hoat_dong)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            FOREIGN KEY (ma_thanh_vien) REFERENCES thanh_vien(ma_thanh_vien)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )
    `);

    await promiseDb.query("ALTER TABLE hoat_dong_quyen_gop MODIFY COLUMN anh_minh_hoa LONGTEXT NULL");
    await promiseDb.query("ALTER TABLE hoat_dong_quyen_gop MODIFY COLUMN ma_qr_quyen_gop LONGTEXT NULL");
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
            hd.ma_qr_quyen_gop,
            hd.so_tien_toi_thieu,
            tc.ten_to_chuc
        FROM hoat_dong_quyen_gop hd
        LEFT JOIN to_chuc tc ON tc.ma_to_chuc = hd.ma_to_chuc
        ${whereClause}
        ORDER BY hd.ma_hoat_dong DESC
    `;
}

async function attachConfirmedDonors(campaigns) {
    if (!Array.isArray(campaigns) || campaigns.length === 0) return campaigns;

    const campaignIds = campaigns.map((campaign) => campaign.ma_hoat_dong);
    const placeholders = campaignIds.map(() => "?").join(",");
    const [donors] = await promiseDb.query(
        `SELECT
            dg.ma_hoat_dong,
            dg.so_tien,
            dg.ngay_xac_nhan,
            tv.ho_ten,
            tv.lop
         FROM dong_gop_su_kien dg
         INNER JOIN thanh_vien tv ON tv.ma_thanh_vien = dg.ma_thanh_vien
         WHERE dg.trang_thai = ? AND dg.ma_hoat_dong IN (${placeholders})
         ORDER BY dg.ngay_xac_nhan DESC, dg.ma_dong_gop DESC`,
        [CONTRIBUTION_STATUS.CONFIRMED, ...campaignIds]
    );

    const donorsByCampaign = donors.reduce((map, donor) => {
        const campaignId = Number(donor.ma_hoat_dong);
        if (!map.has(campaignId)) map.set(campaignId, []);
        map.get(campaignId).push({
            ho_ten: donor.ho_ten,
            lop: donor.lop,
            so_tien: donor.so_tien,
            ngay_xac_nhan: donor.ngay_xac_nhan
        });
        return map;
    }, new Map());

    return campaigns.map((campaign) => ({
        ...campaign,
        nguoi_quyen_gop: donorsByCampaign.get(Number(campaign.ma_hoat_dong)) || []
    }));
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
    const ma_qr_quyen_gop = String(req.body.ma_qr_quyen_gop || "").trim();
    const so_tien_toi_thieu = Number(req.body.so_tien_toi_thieu || 0);

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
        !hinh_thuc_quyen_gop ||
        !ma_qr_quyen_gop
    ) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin sự kiện quyên góp" });
    }

    if (!DONATION_TYPES.includes(hinh_thuc_quyen_gop)) {
        return res.status(400).json({ message: "Hình thức quyên góp không hợp lệ" });
    }

    if (hinh_thuc_quyen_gop === "nhan_tien_chuyen_khoan" && (!Number.isFinite(so_tien_toi_thieu) || so_tien_toi_thieu <= 0)) {
        return res.status(400).json({ message: "Vui lòng nhập số tiền tối thiểu khi nhận tiền chuyển khoản" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [result] = await promiseDb.query(
            `INSERT INTO hoat_dong_quyen_gop
                (ten_hoat_dong, mo_ta, ngay_to_chuc, dia_diem, trang_thai, ma_to_chuc, han_ket_thuc, anh_minh_hoa, hinh_thuc_quyen_gop, ma_qr_quyen_gop, so_tien_toi_thieu)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ten_hoat_dong,
                mo_ta,
                ngay_to_chuc,
                dia_diem,
                CAMPAIGN_STATUS.PENDING,
                ma_to_chuc,
                han_ket_thuc,
                anh_minh_hoa,
                hinh_thuc_quyen_gop,
                ma_qr_quyen_gop,
                so_tien_toi_thieu
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
                hinh_thuc_quyen_gop,
                ma_qr_quyen_gop,
                so_tien_toi_thieu
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

        res.json(await attachConfirmedDonors(campaigns));
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

        res.json(await attachConfirmedDonors(campaigns));
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy sự kiện của tổ chức", error: err.message });
    }
};

exports.createCampaignContribution = async (req, res) => {
    const campaignId = req.params.id;
    const memberId = req.user?.id;
    const accountType = req.user?.accountType || req.user?.role;
    const so_tien = Number(req.body?.so_tien || 0);
    const ghi_chu = String(req.body?.ghi_chu || "").trim();

    if (accountType !== "thanh_vien") {
        return res.status(403).json({ message: "Chỉ thành viên mới có thể tham gia quyên góp" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "Vui lòng tải lên biên lai chuyển khoản" });
    }

    if (!Number.isFinite(so_tien) || so_tien <= 0) {
        return res.status(400).json({ message: "Vui lòng nhập số tiền đã chuyển" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [campaigns] = await promiseDb.query(
            `SELECT ma_hoat_dong, hinh_thuc_quyen_gop, ma_qr_quyen_gop, so_tien_toi_thieu, trang_thai
             FROM hoat_dong_quyen_gop
             WHERE ma_hoat_dong = ?
             LIMIT 1`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện quyên góp" });
        }

        const campaign = campaigns[0];

        if (campaign.trang_thai !== CAMPAIGN_STATUS.APPROVED) {
            return res.status(409).json({ message: "Sự kiện này chưa sẵn sàng để tham gia" });
        }

        if (campaign.hinh_thuc_quyen_gop !== "nhan_tien_chuyen_khoan") {
            return res.status(409).json({ message: "Hình thức quyên góp này chưa được hỗ trợ" });
        }

        const minimumAmount = Number(campaign.so_tien_toi_thieu || 0);
        if (!String(campaign.ma_qr_quyen_gop || "").trim() || minimumAmount <= 0) {
            return res.status(409).json({ message: "Sự kiện này chưa có QR hoặc số tiền tối thiểu để nhận chuyển khoản" });
        }

        if (so_tien < minimumAmount) {
            return res.status(400).json({ message: `Số tiền tối thiểu là ${minimumAmount.toLocaleString("vi-VN")} đ` });
        }

        const receiptPath = `/uploads/${req.file.filename}`;
        const [result] = await promiseDb.query(
            `INSERT INTO dong_gop_su_kien
                (ma_hoat_dong, ma_thanh_vien, so_tien, anh_bien_lai, ghi_chu, trang_thai)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [campaignId, memberId, so_tien, receiptPath, ghi_chu || null, CONTRIBUTION_STATUS.PENDING]
        );

        res.status(201).json({
            message: "Đã gửi biên lai cho tổ chức xác nhận",
            ma_dong_gop: result.insertId,
            trang_thai: CONTRIBUTION_STATUS.PENDING
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể gửi biên lai quyên góp", error: err.message });
    }
};

exports.getPendingContributions = async (req, res) => {
    const organizationId = req.user?.id;

    if (!organizationId) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [contributions] = await promiseDb.query(
            `SELECT
                dg.ma_dong_gop,
                dg.ma_hoat_dong,
                dg.ma_thanh_vien,
                dg.so_tien,
                dg.anh_bien_lai,
                dg.ghi_chu,
                dg.trang_thai,
                dg.ngay_gui,
                hd.ten_hoat_dong,
                tv.ho_ten,
                tv.lop
             FROM dong_gop_su_kien dg
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = dg.ma_hoat_dong
             INNER JOIN thanh_vien tv ON tv.ma_thanh_vien = dg.ma_thanh_vien
             WHERE hd.ma_to_chuc = ? AND dg.trang_thai = ?
             ORDER BY dg.ngay_gui DESC, dg.ma_dong_gop DESC`,
            [organizationId, CONTRIBUTION_STATUS.PENDING]
        );

        res.json(contributions);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách biên lai chờ xác nhận", error: err.message });
    }
};

exports.confirmContribution = async (req, res) => {
    const organizationId = req.user?.id;
    const { contributionId } = req.params;

    if (!organizationId) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [contributions] = await promiseDb.query(
            `SELECT dg.ma_dong_gop, dg.trang_thai
             FROM dong_gop_su_kien dg
             INNER JOIN hoat_dong_quyen_gop hd ON hd.ma_hoat_dong = dg.ma_hoat_dong
             WHERE dg.ma_dong_gop = ? AND hd.ma_to_chuc = ?
             LIMIT 1`,
            [contributionId, organizationId]
        );

        if (contributions.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy biên lai của sự kiện thuộc tổ chức" });
        }

        if (contributions[0].trang_thai !== CONTRIBUTION_STATUS.PENDING) {
            return res.status(409).json({ message: "Biên lai này đã được xử lý" });
        }

        await promiseDb.query(
            "UPDATE dong_gop_su_kien SET trang_thai = ?, ngay_xac_nhan = NOW() WHERE ma_dong_gop = ?",
            [CONTRIBUTION_STATUS.CONFIRMED, contributionId]
        );

        res.json({ message: "Đã xác nhận biên lai quyên góp", trang_thai: CONTRIBUTION_STATUS.CONFIRMED });
    } catch (err) {
        res.status(500).json({ message: "Không thể xác nhận biên lai", error: err.message });
    }
};

exports.deleteOwnCampaign = async (req, res) => {
    const ma_to_chuc = req.user?.id;
    const { id } = req.params;

    if (!ma_to_chuc) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    try {
        await ensureCampaignExtraColumns();

        const [campaigns] = await promiseDb.query(
            "SELECT ma_hoat_dong FROM hoat_dong_quyen_gop WHERE ma_hoat_dong = ? AND ma_to_chuc = ? LIMIT 1",
            [id, ma_to_chuc]
        );

        if (campaigns.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện của tổ chức" });
        }

        await promiseDb.query(
            "DELETE FROM hoat_dong_quyen_gop WHERE ma_hoat_dong = ? AND ma_to_chuc = ?",
            [id, ma_to_chuc]
        );

        res.json({ message: "Đã xóa sự kiện của tổ chức" });
    } catch (err) {
        res.status(500).json({ message: "Không thể xóa sự kiện", error: err.message });
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
