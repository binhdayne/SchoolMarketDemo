import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CommunityPages.css";

const API = "http://localhost:5000/api";

const initialForm = {
  dia_chi: "",
  ma_ngan_hang: "",
  so_tai_khoan: "",
  ten_ngan_hang: "",
};

export default function MemberAccountPage({ token, onBackHome, onProfileUpdated }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    axios.get(`${API}/auth/member-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!mounted) return;
      setForm({
        dia_chi: res.data.user?.dia_chi || "",
        ma_ngan_hang: res.data.user?.ma_ngan_hang || "",
        so_tai_khoan: res.data.user?.so_tai_khoan || "",
        ten_ngan_hang: res.data.user?.ten_ngan_hang || "",
      });
    }).catch((err) => {
      if (mounted) setError(err.response?.data?.message || "Không thể tải thông tin tài khoản.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
    setMessage("");
    setError("");
  };

  const handleQrChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh QR ngân hàng.");
      event.target.value = "";
      return;
    }

    try {
      const qrDataUrl = await resizeImageFile(file);
      setForm((currentForm) => ({ ...currentForm, ma_ngan_hang: qrDataUrl }));
      setMessage("");
      setError("");
    } catch {
      setError("Không thể đọc ảnh QR này. Vui lòng chọn ảnh khác.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await axios.put(`${API}/auth/member-profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onProfileUpdated?.(res.data.user);
      setMessage(res.data.message || "Đã cập nhật tài khoản thành viên.");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật tài khoản thành viên.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="community-page">
      <section className="community-hero">
        <div>
          <p className="community-kicker">Tài khoản</p>
          <h2 className="community-title">Quản lý tài khoản thành viên</h2>
          <p className="community-subtitle">
            Cập nhật địa chỉ và thông tin ngân hàng để giao dịch thuận tiện hơn.
          </p>
        </div>
        {onBackHome && (
          <button type="button" className="community-secondary-button" onClick={onBackHome}>
            Về trang chủ
          </button>
        )}
      </section>

      <section className="community-panel">
        {loading ? (
          <p className="community-empty">Đang tải thông tin tài khoản...</p>
        ) : (
          <form className="community-form" onSubmit={handleSubmit}>
            <label className="community-field">
              <span className="community-label">Địa chỉ</span>
              <input
                className="community-input"
                name="dia_chi"
                value={form.dia_chi}
                onChange={handleChange}
                placeholder="Nhập địa chỉ liên hệ"
              />
            </label>

            <div className="community-form-grid">
              <label className="community-field">
                <span className="community-label">Tên ngân hàng</span>
                <input
                  className="community-input"
                  name="ten_ngan_hang"
                  value={form.ten_ngan_hang}
                  onChange={handleChange}
                  placeholder="Ví dụ: Vietcombank"
                />
              </label>

              <label className="community-field">
                <span className="community-label">Số tài khoản</span>
                <input
                  className="community-input"
                  name="so_tai_khoan"
                  value={form.so_tai_khoan}
                  onChange={handleChange}
                  placeholder="Nhập số tài khoản"
                />
              </label>
            </div>

            <div className="community-field">
              <span className="community-label">QR ngân hàng</span>
              <div className="member-qr-row">
                <div className="member-qr-preview">
                  {form.ma_ngan_hang ? (
                    <img src={form.ma_ngan_hang} alt="QR ngân hàng" />
                  ) : (
                    <span>Chưa có QR</span>
                  )}
                </div>
                <div className="member-qr-actions">
                  <input className="community-input" type="file" accept="image/*" onChange={handleQrChange} />
                  {form.ma_ngan_hang && (
                    <button
                      type="button"
                      className="community-secondary-button"
                      onClick={() => setForm((currentForm) => ({ ...currentForm, ma_ngan_hang: "" }))}
                    >
                      Bỏ QR
                    </button>
                  )}
                </div>
              </div>
            </div>

            {message && <p className="community-alert success">{message}</p>}
            {error && <p className="community-alert error">{error}</p>}

            <div className="community-actions">
              <button type="submit" className="community-primary-button" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();

      image.onerror = reject;
      image.onload = () => {
        const maxSize = 768;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas is not supported"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
