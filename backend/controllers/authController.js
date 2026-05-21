const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "secret";
const USER_STATUS = {
    PENDING: "cho_duyet",
    APPROVED: "da_duyet",
    REJECTED: "tu_choi"
};

const publicUserColumns = `
    ma_thanh_vien,
    ho_ten,
    sdt,
    email,
    lop,
    ngay_sinh,
    vai_tro,
    trang_thai
`;

exports.register = (req, res) => {
    const { ho_ten, sdt, email, lop, ngay_sinh } = req.body;
    const mat_khau = req.body.mat_khau || req.body.password;

    if (!ho_ten || !sdt || !email || !lop || !ngay_sinh || !mat_khau) {
        return res.status(400).json({
            message: "Vui lòng nhập đầy đủ họ tên, số điện thoại, email, lớp, ngày sinh và mật khẩu"
        });
    }

    const hashed = bcrypt.hashSync(mat_khau, 10);

    db.query(
        `INSERT INTO thanh_vien
            (ho_ten, sdt, email, lop, ngay_sinh, mat_khau, vai_tro, trang_thai)
         VALUES (?, ?, ?, ?, ?, ?, 'user', ?)`,
        [ho_ten, sdt, email, lop, ngay_sinh, hashed, USER_STATUS.PENDING],
        (err) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký" });
                }
                return res.status(500).json({ message: "Không thể đăng ký tài khoản", error: err.message });
            }

            res.status(201).json({
                message: "Đăng ký thành công. Vui lòng chờ admin duyệt tài khoản"
            });
        }
    );
};

exports.login = (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.sdt;
    const mat_khau = req.body.mat_khau || req.body.password;

    if (!identifier || !mat_khau) {
        return res.status(400).json({ message: "Vui lòng nhập email/số điện thoại và mật khẩu" });
    }

    db.query(
        "SELECT * FROM nguoi_kiem_duyet WHERE email = ? LIMIT 1",
        [identifier],
        (adminErr, adminResult) => {
            if (adminErr) {
                return res.status(500).json({ message: "Không thể đăng nhập", error: adminErr.message });
            }

            if (adminResult.length > 0) {
                const admin = adminResult[0];
                const isMatch = bcrypt.compareSync(mat_khau, admin.mat_khau);

                if (!isMatch) {
                    return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
                }

                const token = jwt.sign(
                    {
                        id: admin.ma_kiem_duyet,
                        role: "admin",
                        name: admin.ho_ten
                    },
                    JWT_SECRET,
                    { expiresIn: "1d" }
                );

                return res.json({
                    token,
                    user: {
                        id: admin.ma_kiem_duyet,
                        ho_ten: admin.ho_ten,
                        email: admin.email,
                        vai_tro: "admin"
                    }
                });
            }

            db.query(
                "SELECT * FROM thanh_vien WHERE email = ? OR sdt = ? LIMIT 1",
                [identifier, identifier],
                (userErr, userResult) => {
                    if (userErr) {
                        return res.status(500).json({ message: "Không thể đăng nhập", error: userErr.message });
                    }

                    if (userResult.length === 0) {
                        return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
                    }

                    const user = userResult[0];
                    const isMatch = bcrypt.compareSync(mat_khau, user.mat_khau);

                    if (!isMatch) {
                        return res.status(401).json({ message: "Sai email/số điện thoại hoặc mật khẩu" });
                    }

                    if (user.trang_thai !== USER_STATUS.APPROVED) {
                        return res.status(403).json({ message: "Tài khoản chưa được duyệt" });
                    }

                    const token = jwt.sign(
                        {
                            id: user.ma_thanh_vien,
                            role: user.vai_tro || "user",
                            name: user.ho_ten
                        },
                        JWT_SECRET,
                        { expiresIn: "1d" }
                    );

                    res.json({
                        token,
                        user: {
                            id: user.ma_thanh_vien,
                            ho_ten: user.ho_ten,
                            email: user.email,
                            sdt: user.sdt,
                            lop: user.lop,
                            ngay_sinh: user.ngay_sinh,
                            vai_tro: user.vai_tro || "user",
                            trang_thai: user.trang_thai
                        }
                    });
                }
            );
        }
    );
};

exports.getPendingUsers = (req, res) => {
    db.query(
        `SELECT ${publicUserColumns}
         FROM thanh_vien
         WHERE trang_thai = ?
         ORDER BY ma_thanh_vien DESC`,
        [USER_STATUS.PENDING],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Không thể lấy danh sách chờ duyệt", error: err.message });
            }

            res.json(result);
        }
    );
};

exports.approveUser = (req, res) => {
    db.query(
        "UPDATE thanh_vien SET trang_thai = ? WHERE ma_thanh_vien = ?",
        [USER_STATUS.APPROVED, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Không thể duyệt tài khoản", error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy tài khoản" });
            }

            res.json({ message: "Đã duyệt tài khoản" });
        }
    );
};

exports.rejectUser = (req, res) => {
    db.query(
        "UPDATE thanh_vien SET trang_thai = ? WHERE ma_thanh_vien = ?",
        [USER_STATUS.REJECTED, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Không thể từ chối tài khoản", error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Không tìm thấy tài khoản" });
            }

            res.json({ message: "Đã từ chối tài khoản" });
        }
    );
};
