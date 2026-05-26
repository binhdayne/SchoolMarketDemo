const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const promiseDb = db.promise();
const JWT_SECRET = "secret";
const USER_STATUS = {
    PENDING: "cho_duyet",
    APPROVED: "da_duyet",
    REJECTED: "tu_choi",
    BANNED: "bi_cam"
};
const ACCOUNT_TYPE = {
    MEMBER: "thanh_vien",
    ORGANIZATION: "to_chuc"
};

const memberColumns = `
    ma_thanh_vien,
    ho_ten,
    sdt,
    email,
    dia_chi,
    lop,
    ngay_sinh,
    ma_ngan_hang,
    so_tai_khoan,
    ten_ngan_hang,
    vai_tro,
    trang_thai,
    ly_do_cam,
    so_tien_phi_no
`;

const organizationColumns = `
    ma_to_chuc,
    ten_to_chuc,
    sdt,
    email,
    dia_chi,
    mo_ta,
    trang_thai,
    ly_do_cam
`;

async function isIdentifierTaken(email, sdt) {
    const [members] = await promiseDb.query(
        "SELECT ma_thanh_vien FROM thanh_vien WHERE email = ? OR sdt = ? LIMIT 1",
        [email, sdt]
    );
    const [organizations] = await promiseDb.query(
        "SELECT ma_to_chuc FROM to_chuc WHERE email = ? OR sdt = ? LIMIT 1",
        [email, sdt]
    );

    return members.length > 0 || organizations.length > 0;
}

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

function getBannedMessage(accountType, reason) {
    const label = accountType === ACCOUNT_TYPE.ORGANIZATION ? "tổ chức" : "thành viên";
    const displayReason = reason || "Không có lý do cụ thể.";
    return `Tài khoản ${label} này đã bị quản trị viên cấm với lý do: ${displayReason}`;
}

let organizationAvatarColumnReady = false;

async function ensureOrganizationAvatarColumn() {
    if (organizationAvatarColumnReady) return;

    try {
        await promiseDb.query("ALTER TABLE to_chuc ADD COLUMN avatar LONGTEXT NULL AFTER dia_chi");
    } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") {
            throw err;
        }
    }

    await promiseDb.query("ALTER TABLE to_chuc MODIFY COLUMN avatar LONGTEXT NULL");
    organizationAvatarColumnReady = true;
}

function toOrganizationUser(organization) {
    return {
        id: organization.ma_to_chuc,
        ten_to_chuc: organization.ten_to_chuc,
        email: organization.email,
        sdt: organization.sdt,
        dia_chi: organization.dia_chi,
        avatar: organization.avatar || "",
        mo_ta: organization.mo_ta,
        vai_tro: ACCOUNT_TYPE.ORGANIZATION,
        loai_tai_khoan: ACCOUNT_TYPE.ORGANIZATION,
        trang_thai: organization.trang_thai,
        ly_do_cam: organization.ly_do_cam
    };
}

exports.register = async (req, res) => {
    const loai_tai_khoan = req.body.loai_tai_khoan || ACCOUNT_TYPE.MEMBER;
    const { ho_ten, ten_to_chuc, sdt, email, lop, ngay_sinh } = req.body;
    const mat_khau = req.body.mat_khau || req.body.password;

    if (!sdt || !email || !mat_khau) {
        return res.status(400).json({ message: "Vui lòng nhập email, số điện thoại và mật khẩu" });
    }

    try {
        if (await isIdentifierTaken(email, sdt)) {
            return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký" });
        }

        const hashed = bcrypt.hashSync(mat_khau, 10);

        if (loai_tai_khoan === ACCOUNT_TYPE.ORGANIZATION) {
            if (!ten_to_chuc) {
                return res.status(400).json({ message: "Vui lòng nhập tên tổ chức" });
            }

            await promiseDb.query(
                `INSERT INTO to_chuc
                    (ten_to_chuc, sdt, email, mat_khau, trang_thai)
                 VALUES (?, ?, ?, ?, ?)`,
                [ten_to_chuc, sdt, email, hashed, USER_STATUS.PENDING]
            );

            return res.status(201).json({
                message: "Đăng ký tổ chức thành công. Vui lòng chờ admin duyệt tài khoản"
            });
        }

        if (!ho_ten || !lop || !ngay_sinh) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ họ tên, lớp, ngày sinh"
            });
        }

        await promiseDb.query(
            `INSERT INTO thanh_vien
                (ho_ten, sdt, email, lop, ngay_sinh, mat_khau, vai_tro, trang_thai)
             VALUES (?, ?, ?, ?, ?, ?, 'thanh_vien', ?)`,
            [ho_ten, sdt, email, lop, ngay_sinh, hashed, USER_STATUS.PENDING]
        );

        res.status(201).json({
            message: "Đăng ký thành viên thành công. Vui lòng chờ admin duyệt tài khoản"
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký" });
        }

        res.status(500).json({ message: "Không thể đăng ký tài khoản", error: err.message });
    }
};

exports.login = async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.sdt;
    const mat_khau = req.body.mat_khau || req.body.password;

    if (!identifier || !mat_khau) {
        return res.status(400).json({ message: "Vui lòng nhập email/số điện thoại và mật khẩu" });
    }

    try {
        const [admins] = await promiseDb.query(
            "SELECT * FROM nguoi_kiem_duyet WHERE email = ? LIMIT 1",
            [identifier]
        );

        if (admins.length > 0) {
            const admin = admins[0];
            const isMatch = bcrypt.compareSync(mat_khau, admin.mat_khau);

            if (!isMatch) {
                return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
            }

            const token = signToken({
                id: admin.ma_kiem_duyet,
                role: "admin",
                accountType: "admin",
                name: admin.ho_ten
            });

            return res.json({
                token,
                user: {
                    id: admin.ma_kiem_duyet,
                    ho_ten: admin.ho_ten,
                    email: admin.email,
                    vai_tro: "admin",
                    loai_tai_khoan: "admin"
                }
            });
        }

        const [members] = await promiseDb.query(
            "SELECT * FROM thanh_vien WHERE email = ? OR sdt = ? LIMIT 1",
            [identifier, identifier]
        );

        if (members.length > 0) {
            const member = members[0];
            const isMatch = bcrypt.compareSync(mat_khau, member.mat_khau);

            if (!isMatch) {
                return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
            }

            if (member.trang_thai === USER_STATUS.BANNED) {
                return res.status(403).json({
                    message: getBannedMessage(ACCOUNT_TYPE.MEMBER, member.ly_do_cam),
                    trang_thai: USER_STATUS.BANNED,
                    ly_do_cam: member.ly_do_cam,
                    loai_tai_khoan: ACCOUNT_TYPE.MEMBER
                });
            }

            if (member.trang_thai !== USER_STATUS.APPROVED) {
                return res.status(403).json({ message: "Tài khoản chưa được duyệt" });
            }

            const token = signToken({
                id: member.ma_thanh_vien,
                role: member.vai_tro || ACCOUNT_TYPE.MEMBER,
                accountType: ACCOUNT_TYPE.MEMBER,
                name: member.ho_ten
            });

            return res.json({
                token,
                user: {
                    id: member.ma_thanh_vien,
                    ho_ten: member.ho_ten,
                    email: member.email,
                    sdt: member.sdt,
                    lop: member.lop,
                    ngay_sinh: member.ngay_sinh,
                    vai_tro: member.vai_tro || ACCOUNT_TYPE.MEMBER,
                    loai_tai_khoan: ACCOUNT_TYPE.MEMBER,
                    trang_thai: member.trang_thai
                }
            });
        }

        await ensureOrganizationAvatarColumn();

        const [organizations] = await promiseDb.query(
            "SELECT * FROM to_chuc WHERE email = ? OR sdt = ? LIMIT 1",
            [identifier, identifier]
        );

        if (organizations.length === 0) {
            return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
        }

        const organization = organizations[0];
        const isMatch = bcrypt.compareSync(mat_khau, organization.mat_khau);

        if (!isMatch) {
            return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
        }

        if (organization.trang_thai === USER_STATUS.BANNED) {
            return res.status(403).json({
                message: getBannedMessage(ACCOUNT_TYPE.ORGANIZATION, organization.ly_do_cam),
                trang_thai: USER_STATUS.BANNED,
                ly_do_cam: organization.ly_do_cam,
                loai_tai_khoan: ACCOUNT_TYPE.ORGANIZATION
            });
        }

        if (organization.trang_thai !== USER_STATUS.APPROVED) {
            return res.status(403).json({ message: "Tài khoản chưa được duyệt" });
        }

        const token = signToken({
            id: organization.ma_to_chuc,
            role: ACCOUNT_TYPE.ORGANIZATION,
            accountType: ACCOUNT_TYPE.ORGANIZATION,
            name: organization.ten_to_chuc
        });

        res.json({
            token,
            user: toOrganizationUser(organization)
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể đăng nhập", error: err.message });
    }
};

exports.getPendingAccounts = async (req, res) => {
    try {
        const [members] = await promiseDb.query(
            `SELECT ${memberColumns}
             FROM thanh_vien
             WHERE trang_thai = ?
             ORDER BY ma_thanh_vien DESC`,
            [USER_STATUS.PENDING]
        );
        const [organizations] = await promiseDb.query(
            `SELECT ${organizationColumns}
             FROM to_chuc
             WHERE trang_thai = ?
             ORDER BY ma_to_chuc DESC`,
            [USER_STATUS.PENDING]
        );

        res.json([
            ...members.map((member) => ({
                ...member,
                id: member.ma_thanh_vien,
                ten_hien_thi: member.ho_ten,
                loai_tai_khoan: ACCOUNT_TYPE.MEMBER
            })),
            ...organizations.map((organization) => ({
                ...organization,
                id: organization.ma_to_chuc,
                ten_hien_thi: organization.ten_to_chuc,
                loai_tai_khoan: ACCOUNT_TYPE.ORGANIZATION
            }))
        ]);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách chờ duyệt", error: err.message });
    }
};

exports.getPendingUsers = async (req, res) => {
    try {
        const [members] = await promiseDb.query(
            `SELECT ${memberColumns}
             FROM thanh_vien
             WHERE trang_thai = ?
             ORDER BY ma_thanh_vien DESC`,
            [USER_STATUS.PENDING]
        );

        res.json(members);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách chờ duyệt", error: err.message });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const [members] = await promiseDb.query(
            `SELECT ${memberColumns}
             FROM thanh_vien
             ORDER BY ma_thanh_vien DESC`
        );

        res.json(members);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách thành viên", error: err.message });
    }
};

exports.getOrganizations = async (req, res) => {
    try {
        const [organizations] = await promiseDb.query(
            `SELECT ${organizationColumns}
             FROM to_chuc
             ORDER BY ma_to_chuc DESC`
        );

        res.json(organizations);
    } catch (err) {
        res.status(500).json({ message: "Không thể lấy danh sách tổ chức", error: err.message });
    }
};

exports.updateOrganizationProfile = async (req, res) => {
    const organizationId = req.user?.id;
    const ten_to_chuc = String(req.body.ten_to_chuc || "").trim();
    const avatar = String(req.body.avatar || "").trim();
    const dia_chi = String(req.body.dia_chi || "").trim();
    const mo_ta = String(req.body.mo_ta || "").trim();

    if (!organizationId) {
        return res.status(401).json({ message: "Không xác định được tài khoản tổ chức" });
    }

    if (!ten_to_chuc) {
        return res.status(400).json({ message: "Vui lòng nhập tên tổ chức" });
    }

    try {
        await ensureOrganizationAvatarColumn();

        const [result] = await promiseDb.query(
            `UPDATE to_chuc
             SET ten_to_chuc = ?, avatar = ?, dia_chi = ?, mo_ta = ?
             WHERE ma_to_chuc = ?`,
            [ten_to_chuc, avatar || null, dia_chi || null, mo_ta || null, organizationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản tổ chức" });
        }

        const [organizations] = await promiseDb.query(
            "SELECT * FROM to_chuc WHERE ma_to_chuc = ? LIMIT 1",
            [organizationId]
        );

        res.json({
            message: "Đã cập nhật tài khoản tổ chức",
            user: toOrganizationUser(organizations[0])
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể cập nhật tài khoản tổ chức", error: err.message });
    }
};

exports.updateAccountStatus = async (req, res) => {
    const { type, id } = req.params;
    const nextStatus = req.action === "approve" ? USER_STATUS.APPROVED : USER_STATUS.REJECTED;
    const table = type === ACCOUNT_TYPE.ORGANIZATION ? "to_chuc" : "thanh_vien";
    const idColumn = type === ACCOUNT_TYPE.ORGANIZATION ? "ma_to_chuc" : "ma_thanh_vien";

    if (![ACCOUNT_TYPE.MEMBER, ACCOUNT_TYPE.ORGANIZATION].includes(type)) {
        return res.status(400).json({ message: "Loại tài khoản không hợp lệ" });
    }

    try {
        const [result] = await promiseDb.query(
            `UPDATE ${table} SET trang_thai = ?, ly_do_cam = NULL WHERE ${idColumn} = ?`,
            [nextStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản" });
        }

        res.json({
            message: req.action === "approve" ? "Đã duyệt tài khoản" : "Đã từ chối tài khoản"
        });
    } catch (err) {
        res.status(500).json({ message: "Không thể cập nhật tài khoản", error: err.message });
    }
};

exports.banAccount = async (req, res) => {
    const { type, id } = req.params;
    const ly_do_cam = (req.body.ly_do_cam || req.body.reason || "").trim();
    const table = type === ACCOUNT_TYPE.ORGANIZATION ? "to_chuc" : "thanh_vien";
    const idColumn = type === ACCOUNT_TYPE.ORGANIZATION ? "ma_to_chuc" : "ma_thanh_vien";

    if (![ACCOUNT_TYPE.MEMBER, ACCOUNT_TYPE.ORGANIZATION].includes(type)) {
        return res.status(400).json({ message: "Loại tài khoản không hợp lệ" });
    }

    if (!ly_do_cam) {
        return res.status(400).json({ message: "Vui lòng nhập lý do cấm tài khoản" });
    }

    try {
        const [result] = await promiseDb.query(
            `UPDATE ${table} SET trang_thai = ?, ly_do_cam = ? WHERE ${idColumn} = ?`,
            [USER_STATUS.BANNED, ly_do_cam, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản" });
        }

        res.json({ message: "Đã cấm tài khoản", trang_thai: USER_STATUS.BANNED, ly_do_cam });
    } catch (err) {
        res.status(500).json({ message: "Không thể cấm tài khoản", error: err.message });
    }
};

exports.unbanAccount = async (req, res) => {
    const { type, id } = req.params;
    const table = type === ACCOUNT_TYPE.ORGANIZATION ? "to_chuc" : "thanh_vien";
    const idColumn = type === ACCOUNT_TYPE.ORGANIZATION ? "ma_to_chuc" : "ma_thanh_vien";

    if (![ACCOUNT_TYPE.MEMBER, ACCOUNT_TYPE.ORGANIZATION].includes(type)) {
        return res.status(400).json({ message: "Loại tài khoản không hợp lệ" });
    }

    try {
        const [result] = await promiseDb.query(
            `UPDATE ${table} SET trang_thai = ?, ly_do_cam = NULL WHERE ${idColumn} = ?`,
            [USER_STATUS.APPROVED, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản" });
        }

        res.json({ message: "Đã bỏ cấm tài khoản", trang_thai: USER_STATUS.APPROVED, ly_do_cam: null });
    } catch (err) {
        res.status(500).json({ message: "Không thể bỏ cấm tài khoản", error: err.message });
    }
};

exports.approveAccount = (req, res, next) => {
    req.action = "approve";
    return exports.updateAccountStatus(req, res, next);
};

exports.rejectAccount = (req, res, next) => {
    req.action = "reject";
    return exports.updateAccountStatus(req, res, next);
};

exports.approveUser = async (req, res, next) => {
    req.params.type = ACCOUNT_TYPE.MEMBER;
    req.action = "approve";
    return exports.updateAccountStatus(req, res, next);
};

exports.rejectUser = async (req, res, next) => {
    req.params.type = ACCOUNT_TYPE.MEMBER;
    req.action = "reject";
    return exports.updateAccountStatus(req, res, next);
};
