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
      ? { ho_ten: decoded.name, ten_to_chuc: decoded.name, vai_tro: decoded.role }
      : null;
  });
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [notice, setNotice] = useState("");
  const role = currentUser?.vai_tro || decodeToken(token)?.role;

  const loadPendingAccounts = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingPending(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/auth/pending-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingAccounts(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoadingPending(false);
    }
  }, [role, token]);

  useEffect(() => {
    loadPendingAccounts();
  }, [loadPendingAccounts]);

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
    setPendingAccounts([]);
    setNotice("");
  };

  const updateAccountStatus = async (account, action) => {
    try {
      const endpoint = action === "approve" ? "approve-account" : "reject-account";
      const res = await axios.put(
        `${API}/auth/${endpoint}/${account.loai_tai_khoan}/${account.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingAccounts((prev) =>
        prev.filter(
          (item) => !(item.id === account.id && item.loai_tai_khoan === account.loai_tai_khoan)
        )
      );
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
              ? "Trang admin duyệt tài khoản thành viên và tổ chức"
              : "Bạn đã đăng nhập thành công"}
          </p>
        </div>
        <div style={styles.account}>
          <span style={styles.accountName}>{getDisplayName(currentUser)}</span>
          <span style={styles.roleBadge}>{getRoleLabel(role)}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Đăng xuất</button>
        </div>
      </header>

      {notice && <p style={styles.notice}>{notice}</p>}

      {role === "admin" ? (
        <main style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Tài khoản chờ duyệt</h2>
            <button onClick={loadPendingAccounts} style={styles.secondaryButton}>
              Tải lại
            </button>
          </div>

          {loadingPending ? (
            <p style={styles.empty}>Đang tải danh sách...</p>
          ) : pendingAccounts.length === 0 ? (
            <p style={styles.empty}>Không có tài khoản nào đang chờ duyệt.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Loại</th>
                    <th style={styles.th}>Tên</th>
                    <th style={styles.th}>Số điện thoại</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Lớp</th>
                    <th style={styles.th}>Ngày sinh</th>
                    <th style={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAccounts.map((account) => (
                    <tr key={`${account.loai_tai_khoan}-${account.id}`}>
                      <td style={styles.td}>{getRoleLabel(account.loai_tai_khoan)}</td>
                      <td style={styles.td}>{account.ten_hien_thi}</td>
                      <td style={styles.td}>{account.sdt}</td>
                      <td style={styles.td}>{account.email}</td>
                      <td style={styles.td}>{account.lop || "-"}</td>
                      <td style={styles.td}>{account.ngay_sinh ? formatDate(account.ngay_sinh) : "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => updateAccountStatus(account, "approve")}
                            style={styles.approveButton}
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => updateAccountStatus(account, "reject")}
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
            Bạn có thể tiếp tục sử dụng các chức năng dành cho {getRoleLabel(role).toLowerCase()}.
          </p>
        </main>
      )}
    </div>
  );
}

function getDisplayName(user) {
  return user?.ho_ten || user?.ten_to_chuc || "Người dùng";
}

function getRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "to_chuc") return "Tổ chức";
  return "Thành viên";
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
