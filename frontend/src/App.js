import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AuthForm from "./components/AuthForm";

const API = "http://localhost:5000/api";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) return JSON.parse(savedUser);

    const savedToken = localStorage.getItem("token");
    const decoded = savedToken ? decodeToken(savedToken) : null;
    return decoded
      ? { ho_ten: decoded.name, vai_tro: decoded.role }
      : null;
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [notice, setNotice] = useState("");
  const role = currentUser?.vai_tro || decodeToken(token)?.role;

  const loadPendingUsers = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingPending(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/auth/pending-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoadingPending(false);
    }
  }, [role, token]);

  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  const handleLoginSuccess = (newToken, user) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setCurrentUser(null);
    setPendingUsers([]);
    setNotice("");
  };

  const updateUserStatus = async (id, action) => {
    try {
      const endpoint = action === "approve" ? "approve-user" : "reject-user";
      const res = await axios.put(`${API}/auth/${endpoint}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPendingUsers((prev) => prev.filter((user) => user.ma_thanh_vien !== id));
      setNotice(res.data.message);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể cập nhật tài khoản.");
    }
  };

  if (!token) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>School Market</h1>
          <p style={styles.subtitle}>
            {role === "admin"
              ? "Trang admin duyệt tài khoản thành viên"
              : "Bạn đã đăng nhập thành công"}
          </p>
        </div>
        <div style={styles.account}>
          <span style={styles.accountName}>{currentUser?.ho_ten || "Người dùng"}</span>
          <span style={styles.roleBadge}>{role === "admin" ? "Admin" : "Thành viên"}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Đăng xuất</button>
        </div>
      </header>

      {notice && <p style={styles.notice}>{notice}</p>}

      {role === "admin" ? (
        <main style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Tài khoản chờ duyệt</h2>
            <button onClick={loadPendingUsers} style={styles.secondaryButton}>
              Tải lại
            </button>
          </div>

          {loadingPending ? (
            <p style={styles.empty}>Đang tải danh sách...</p>
          ) : pendingUsers.length === 0 ? (
            <p style={styles.empty}>Không có tài khoản nào đang chờ duyệt.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Họ tên</th>
                    <th style={styles.th}>Số điện thoại</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Lớp</th>
                    <th style={styles.th}>Ngày sinh</th>
                    <th style={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.ma_thanh_vien}>
                      <td style={styles.td}>{user.ho_ten}</td>
                      <td style={styles.td}>{user.sdt}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>{user.lop}</td>
                      <td style={styles.td}>{formatDate(user.ngay_sinh)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => updateUserStatus(user.ma_thanh_vien, "approve")}
                            style={styles.approveButton}
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => updateUserStatus(user.ma_thanh_vien, "reject")}
                            style={styles.rejectButton}
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      ) : (
        <main style={styles.section}>
          <h2 style={styles.sectionTitle}>Tài khoản đã được duyệt</h2>
          <p style={styles.empty}>
            Bạn có thể tiếp tục sử dụng các chức năng dành cho thành viên.
          </p>
        </main>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN");
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f8",
    color: "#111827",
    padding: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 30,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#4b5563",
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  accountName: {
    fontWeight: 600,
  },
  roleBadge: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 13,
    fontWeight: 700,
  },
  logoutButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "9px 12px",
  },
  notice: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    color: "#1e40af",
    margin: "0 0 16px",
    padding: "12px 14px",
  },
  section: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 20,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    backgroundColor: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
    padding: "8px 12px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    borderBottom: "1px solid #e5e7eb",
    color: "#4b5563",
    fontSize: 13,
    padding: "10px 8px",
    textAlign: "left",
  },
  td: {
    borderBottom: "1px solid #f3f4f6",
    padding: "12px 8px",
    verticalAlign: "middle",
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  approveButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#16a34a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "8px 10px",
  },
  rejectButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "8px 10px",
  },
  empty: {
    color: "#4b5563",
    margin: 0,
  },
};

export default App;
