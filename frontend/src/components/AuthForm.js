import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AuthForm.css";

const API = "http://localhost:5000/api";

const initialForm = {
  loai_tai_khoan: "thanh_vien",
  ho_ten: "",
  ten_to_chuc: "",
  sdt: "",
  email: "",
  lop: "",
  ngay_sinh: "",
  identifier: "",
  password: "",
};

function AuthForm({ onLoginSuccess, initialMode, onHomeClick }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bannedNotice, setBannedNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const isLogin = mode === "login";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMessage("");
    setBannedNotice(null);
  };

  const setAccountType = (loai_tai_khoan) => {
    setForm({ ...initialForm, loai_tai_khoan });
    setError("");
    setMessage("");
    setBannedNotice(null);
  };

  const resetForm = (nextMode) => {
    setMode(nextMode);
    setForm(initialForm);
    setError("");
    setMessage("");
    setBannedNotice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setBannedNotice(null);

    try {
      if (mode === "register") {
        const payload = {
          loai_tai_khoan: form.loai_tai_khoan,
          sdt: form.sdt,
          email: form.email,
          password: form.password,
        };

        if (form.loai_tai_khoan === "to_chuc") {
          payload.ten_to_chuc = form.ten_to_chuc;
        } else {
          payload.ho_ten = form.ho_ten;
          payload.lop = form.lop;
          payload.ngay_sinh = form.ngay_sinh;
        }

        const res = await axios.post(`${API}/auth/register`, payload);

        setMessage(
          res.data.message || "Đăng ký thành công. Vui lòng chờ admin duyệt tài khoản."
        );
        setMode("login");
        setForm(initialForm);
      } else {
        const res = await axios.post(`${API}/auth/login`, {
          identifier: form.identifier,
          password: form.password,
        });

        localStorage.setItem("token", res.data.token);
        onLoginSuccess(res.data.token, res.data.user);
      }
    } catch (err) {
      const data = err.response?.data;
      const errorMessage = data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.";

      if (data?.trang_thai === "bi_cam" || errorMessage.includes("bị quản trị viên cấm")) {
        setBannedNotice({
          message: errorMessage,
          reason: data?.ly_do_cam || getReasonFromBannedMessage(errorMessage),
          accountType: data?.loai_tai_khoan,
        });
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="School Market authentication">
        <BrandPanel onHomeClick={onHomeClick} />

        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-header">
              <button type="button" className="auth-mobile-brand brand-logo-button" onClick={onHomeClick}>
                <img className="brand-logo" src="/images/school-market-icon-v2.png" alt="" />
                <span>School Market</span>
              </button>
              <h1>{isLogin ? "Đăng nhập vào School Market" : "Tạo tài khoản School Market"}</h1>
              <p>
                {isLogin
                  ? "Tiếp tục mua bán, trao đổi và theo dõi hoạt động trong trường."
                  : "Đăng ký tài khoản để tham gia cộng đồng School Market."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <>
                  <div className="auth-role-group">
                    <span className="auth-label">Vai trò</span>
                    <div className="auth-segmented" role="group" aria-label="Chọn vai trò">
                      <button
                        type="button"
                        onClick={() => setAccountType("thanh_vien")}
                        className={form.loai_tai_khoan === "thanh_vien" ? "active" : ""}
                      >
                        Thành viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType("to_chuc")}
                        className={form.loai_tai_khoan === "to_chuc" ? "active" : ""}
                      >
                        Tổ chức
                      </button>
                    </div>
                  </div>

                  {form.loai_tai_khoan === "to_chuc" ? (
                    <Field
                      label="Tên tổ chức"
                      name="ten_to_chuc"
                      value={form.ten_to_chuc}
                      onChange={handleChange}
                      placeholder="Câu lạc bộ Sách Xanh"
                    />
                  ) : (
                    <>
                      <Field
                        label="Họ tên"
                        name="ho_ten"
                        value={form.ho_ten}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                      />
                      <div className="auth-two-columns">
                        <Field
                          label="Lớp"
                          name="lop"
                          value={form.lop}
                          onChange={handleChange}
                          placeholder="12A1"
                        />
                        <Field
                          label="Ngày sinh"
                          name="ngay_sinh"
                          type="date"
                          value={form.ngay_sinh}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  )}

                  <div className="auth-two-columns">
                    <Field
                      label="Số điện thoại"
                      name="sdt"
                      value={form.sdt}
                      onChange={handleChange}
                      placeholder="0901234567"
                    />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                    />
                  </div>
                </>
              )}

              {isLogin && (
                <Field
                  label="Email hoặc số điện thoại"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="email@example.com hoặc 0901234567"
                />
              )}

              <Field
                label="Mật khẩu"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
              />

              {message && <p className="auth-alert success">{message}</p>}
              {error && <p className="auth-alert error">{error}</p>}

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
              </button>
            </form>

            <div className="auth-divider" aria-hidden="true" />

            <button
              type="button"
              onClick={() => resetForm(isLogin ? "register" : "login")}
              className="auth-create"
            >
              {isLogin ? "Tạo tài khoản mới" : "Quay lại đăng nhập"}
            </button>
          </div>
        </section>
      </section>

      {bannedNotice && (
        <BannedAccountModal
          notice={bannedNotice}
          onClose={() => setBannedNotice(null)}
        />
      )}
    </main>
  );
}

function BrandPanel({ onHomeClick }) {
  return (
    <section className="brand-panel" aria-label="School Market">
      <div className="brand-copy">
        <button type="button" className="brand-logo-row brand-logo-button" onClick={onHomeClick}>
          <img className="brand-logo" src="/images/school-market-icon-v2.png" alt="" />
          <span className="brand-name">School Market</span>
        </button>
        <h2>
          Chợ học đường cho mọi món đồ <span>bạn cần.</span>
        </h2>
        <p>
          Kết nối học sinh, câu lạc bộ và tổ chức để mua bán, trao đổi, gây quỹ
          nhanh hơn trong cùng một không gian.
        </p>
      </div>

      <div className="market-visual" aria-hidden="true">
        <div
          className="visual-photo visual-photo-main"
          style={{ backgroundImage: "url('/images/school-exchange-supplies.jpg')" }}
        />
        <div
          className="visual-photo visual-photo-secondary"
          style={{ backgroundImage: "url('/images/school-exchange-backpacks.jpg')" }}
        />
        <div
          className="visual-photo visual-photo-tertiary"
          style={{
            backgroundImage: "url('/images/school-exchange-supplies.jpg')",
            backgroundPosition: "left center",
          }}
        />
        <div className="visual-card-small">
          <span className="badge-icon">₫</span>
          <strong>Sách lớp 12</strong>
          <span>Còn mới 90%</span>
          <b>45.000đ</b>
        </div>
        <div className="visual-chat">Đã duyệt</div>
        <div className="visual-heart">♡</div>
      </div>
    </section>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function BannedAccountModal({ notice, onClose }) {
  return (
    <div className="banned-modal-overlay" role="presentation">
      <section className="banned-modal" role="dialog" aria-modal="true" aria-labelledby="banned-title">
        <div className="banned-modal-header">
          <h2 id="banned-title">Tài khoản đã bị cấm</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            x
          </button>
        </div>
        <p className="banned-modal-message">{notice.message}</p>
        <div className="banned-reason-box">
          <span>Lý do</span>
          <strong>{notice.reason || "Không có lý do cụ thể."}</strong>
        </div>
        <button type="button" onClick={onClose} className="banned-confirm">
          Đã hiểu
        </button>
      </section>
    </div>
  );
}

function getReasonFromBannedMessage(message) {
  const marker = "lý do:";
  const index = message.indexOf(marker);
  return index >= 0 ? message.slice(index + marker.length).trim() : "";
}

export default AuthForm;
