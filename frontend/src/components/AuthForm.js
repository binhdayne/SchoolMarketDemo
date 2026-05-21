import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const initialForm = {
  ho_ten: "",
  sdt: "",
  email: "",
  lop: "",
  ngay_sinh: "",
  identifier: "",
  password: "",
};

function AuthForm({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMessage("");
  };

  const resetForm = (nextMode) => {
    setMode(nextMode);
    setForm(initialForm);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        const res = await axios.post(`${API}/auth/register`, {
          ho_ten: form.ho_ten,
          sdt: form.sdt,
          email: form.email,
          lop: form.lop,
          ngay_sinh: form.ngay_sinh,
          password: form.password,
        });

        setMessage(res.data.message || "Đăng ký thành công. Vui lòng chờ admin duyệt tài khoản.");
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
      setError(err.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "register" && (
            <>
              <Field
                label="Họ tên"
                name="ho_ten"
                value={form.ho_ten}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
              />
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
            </>
          )}

          {mode === "login" && (
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

          {message && <p style={styles.success}>{message}</p>}
          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <button
            type="button"
            onClick={() => resetForm(mode === "login" ? "register" : "login")}
            style={styles.switchButton}
          >
            {mode === "login" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        style={styles.input}
      />
    </label>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f8",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 28,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  title: {
    margin: "0 0 22px",
    color: "#111827",
    fontSize: 26,
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: 600,
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 15,
    padding: "11px 12px",
    outline: "none",
  },
  submitButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    padding: "12px 14px",
    marginTop: 4,
  },
  success: {
    color: "#047857",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 6,
    padding: "10px 12px",
    margin: 0,
    fontSize: 14,
  },
  error: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "10px 12px",
    margin: 0,
    fontSize: 14,
  },
  switchText: {
    color: "#4b5563",
    fontSize: 14,
    margin: "18px 0 0",
    textAlign: "center",
  },
  switchButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: 0,
  },
};

export default AuthForm;
