import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AuthForm from "./components/AuthForm";
import MemberPage from "./pages/MemberPage";
import OrganizationPage from "./pages/OrganizationPage";

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
      ? {
          ho_ten: decoded.name,
          ten_to_chuc: decoded.name,
          vai_tro: decoded.role,
          loai_tai_khoan: decoded.accountType,
        }
      : null;
  });
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [adminOrganizations, setAdminOrganizations] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [activeAdminView, setActiveAdminView] = useState("pending");
  const [notice, setNotice] = useState("");
  const decodedToken = token ? decodeToken(token) : null;
  const role = currentUser?.vai_tro || decodedToken?.role;
  const accountType = currentUser?.loai_tai_khoan || decodedToken?.accountType || role;

  const loadAdminData = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pendingRes, membersRes, organizationsRes] = await Promise.all([
        axios.get(`${API}/auth/pending-accounts`, { headers }),
        axios.get(`${API}/auth/members`, { headers }),
        axios.get(`${API}/auth/organizations`, { headers }),
      ]);

      setPendingAccounts(pendingRes.data);
      setAdminMembers(membersRes.data);
      setAdminOrganizations(organizationsRes.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải dữ liệu trang admin.");
    } finally {
      setLoadingAdminData(false);
    }
  }, [role, token]);

  const loadPendingAccounts = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/auth/pending-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingAccounts(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoadingAdminData(false);
    }
  }, [role, token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

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
    setAdminMembers([]);
    setAdminOrganizations([]);
    setActiveAdminView("pending");
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
      const nextStatus = action === "approve" ? "da_duyet" : "tu_choi";
      if (account.loai_tai_khoan === "to_chuc") {
        setAdminOrganizations((prev) =>
          prev.map((item) =>
            item.ma_to_chuc === account.id ? { ...item, trang_thai: nextStatus } : item
          )
        );
      } else {
        setAdminMembers((prev) =>
          prev.map((item) =>
            item.ma_thanh_vien === account.id ? { ...item, trang_thai: nextStatus } : item
          )
        );
      }
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
        <div style={styles.brandHeader}>
          <img src="/images/school-market-icon-v2.png" alt="School Market" style={styles.headerLogo} />
          <div>
            <h1 style={styles.title}>School Market</h1>
            <p style={styles.subtitle}>{getHeaderSubtitle(role, accountType)}</p>
          </div>
        </div>
        <div style={styles.account}>
          <span style={styles.accountName}>{getDisplayName(currentUser)}</span>
          <span style={styles.roleBadge}>{getRoleLabel(accountType)}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Đăng xuất</button>
        </div>
      </header>

      {notice && <p style={styles.notice}>{notice}</p>}

      {role === "admin" ? (
        <AdminDashboard
          pendingAccounts={pendingAccounts}
          members={adminMembers}
          organizations={adminOrganizations}
          activeView={activeAdminView}
          loading={loadingAdminData}
          onSelectView={setActiveAdminView}
          onReload={loadAdminData}
          onReloadPending={loadPendingAccounts}
          onUpdateStatus={updateAccountStatus}
        />
      ) : accountType === "to_chuc" ? (
        <OrganizationPage user={currentUser} />
      ) : (
        <MemberPage user={currentUser} />
      )}
    </div>
  );
}

function AdminDashboard({
  pendingAccounts,
  members,
  organizations,
  activeView,
  loading,
  onSelectView,
  onReload,
  onReloadPending,
  onUpdateStatus,
}) {
  const views = [
    {
      key: "members",
      title: "Thành viên",
      count: members.length,
      description: "Xem danh sách và thông tin tài khoản thành viên.",
    },
    {
      key: "organizations",
      title: "Tổ chức",
      count: organizations.length,
      description: "Xem danh sách và thông tin liên hệ của tổ chức.",
    },
    {
      key: "pending",
      title: "Chờ duyệt",
      count: pendingAccounts.length,
      description: "Duyệt hoặc từ chối tài khoản mới đăng ký.",
    },
  ];

  return (
    <main style={styles.adminPage}>
      <section style={styles.adminCards} aria-label="Lối tắt quản trị">
        {views.map((view) => {
          const isActive = activeView === view.key;

          return (
            <button
              key={view.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectView(view.key)}
              style={{
                ...styles.summaryCard,
                ...(isActive ? styles.summaryCardActive : {}),
              }}
            >
              <span style={styles.summaryLabel}>{view.title}</span>
              <strong style={styles.summaryCount}>{view.count}</strong>
              <span style={styles.summaryText}>{view.description}</span>
            </button>
          );
        })}
      </section>

      {activeView === "members" ? (
        <AdminMembersTable members={members} loading={loading} onReload={onReload} />
      ) : activeView === "organizations" ? (
        <AdminOrganizationsTable
          organizations={organizations}
          loading={loading}
          onReload={onReload}
        />
      ) : (
        <AdminPendingAccounts
          pendingAccounts={pendingAccounts}
          loadingPending={loading}
          onReload={onReloadPending}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </main>
  );
}

function AdminMembersTable({ members, loading, onReload }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Danh sách thành viên</h2>
          <p style={styles.sectionDescription}>Thông tin tài khoản thành viên trong hệ thống.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
          Tải lại
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Đang tải danh sách...</p>
      ) : members.length === 0 ? (
        <p style={styles.empty}>Chưa có thành viên nào.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Mã</th>
                <th style={styles.th}>Họ tên</th>
                <th style={styles.th}>Số điện thoại</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Lớp</th>
                <th style={styles.th}>Ngày sinh</th>
                <th style={styles.th}>Địa chỉ</th>
                <th style={styles.th}>Ngân hàng</th>
                <th style={styles.th}>Phí nợ</th>
                <th style={styles.th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.ma_thanh_vien}>
                  <td style={styles.td}>{member.ma_thanh_vien}</td>
                  <td style={styles.td}>{member.ho_ten}</td>
                  <td style={styles.td}>{member.sdt || "-"}</td>
                  <td style={styles.td}>{member.email}</td>
                  <td style={styles.td}>{member.lop || "-"}</td>
                  <td style={styles.td}>{member.ngay_sinh ? formatDate(member.ngay_sinh) : "-"}</td>
                  <td style={styles.td}>{member.dia_chi || "-"}</td>
                  <td style={styles.td}>{formatBankInfo(member)}</td>
                  <td style={styles.td}>{formatCurrency(member.so_tien_phi_no)}</td>
                  <td style={styles.td}>
                    <span style={getStatusStyle(member.trang_thai)}>{getStatusLabel(member.trang_thai)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminOrganizationsTable({ organizations, loading, onReload }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Danh sách tổ chức</h2>
          <p style={styles.sectionDescription}>Thông tin liên hệ và trạng thái tài khoản tổ chức.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
          Tải lại
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Đang tải danh sách...</p>
      ) : organizations.length === 0 ? (
        <p style={styles.empty}>Chưa có tổ chức nào.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Mã</th>
                <th style={styles.th}>Tên tổ chức</th>
                <th style={styles.th}>Số điện thoại</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Địa chỉ</th>
                <th style={styles.th}>Mô tả</th>
                <th style={styles.th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.ma_to_chuc}>
                  <td style={styles.td}>{organization.ma_to_chuc}</td>
                  <td style={styles.td}>{organization.ten_to_chuc}</td>
                  <td style={styles.td}>{organization.sdt || "-"}</td>
                  <td style={styles.td}>{organization.email}</td>
                  <td style={styles.td}>{organization.dia_chi || "-"}</td>
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{organization.mo_ta || "-"}</td>
                  <td style={styles.td}>
                    <span style={getStatusStyle(organization.trang_thai)}>
                      {getStatusLabel(organization.trang_thai)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminPendingAccounts({ pendingAccounts, loadingPending, onReload, onUpdateStatus }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Tài khoản chờ duyệt</h2>
          <p style={styles.sectionDescription}>Các tài khoản mới cần admin kiểm tra trước khi cho đăng nhập.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
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
                        onClick={() => onUpdateStatus(account, "approve")}
                        style={styles.approveButton}
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => onUpdateStatus(account, "reject")}
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
    </section>
  );
}

function getHeaderSubtitle(role, accountType) {
  if (role === "admin") return "Trang admin duyệt tài khoản thành viên và tổ chức";
  if (accountType === "to_chuc") return "Trang làm việc dành riêng cho tổ chức";
  return "Trang làm việc dành riêng cho thành viên";
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

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function formatBankInfo(member) {
  const parts = [member.ten_ngan_hang, member.so_tai_khoan, member.ma_ngan_hang].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "-";
}

function getStatusLabel(status) {
  if (status === "da_duyet") return "Đã duyệt";
  if (status === "tu_choi") return "Từ chối";
  if (status === "cho_duyet") return "Chờ duyệt";
  return status || "-";
}

function getStatusStyle(status) {
  if (status === "da_duyet") {
    return { ...styles.statusBadge, ...styles.statusApproved };
  }

  if (status === "tu_choi") {
    return { ...styles.statusBadge, ...styles.statusRejected };
  }

  return { ...styles.statusBadge, ...styles.statusPending };
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
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    objectFit: "cover",
    boxShadow: "0 8px 22px rgba(0, 138, 115, 0.18)",
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
    backgroundColor: "#e6f6f1",
    color: "#006f5c",
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
    backgroundColor: "#e6f6f1",
    border: "1px solid #a9ded0",
    borderRadius: 8,
    color: "#006f5c",
    margin: "0 0 16px",
    padding: "12px 14px",
  },
  adminPage: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  adminCards: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  summaryCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    font: "inherit",
    gap: 8,
    minHeight: 132,
    padding: 18,
    textAlign: "left",
  },
  summaryCardActive: {
    borderColor: "#008a73",
    boxShadow: "0 10px 24px rgba(0, 138, 115, 0.12)",
  },
  summaryLabel: {
    color: "#006f5c",
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  summaryCount: {
    fontSize: 34,
    lineHeight: 1,
  },
  summaryText: {
    color: "#4b5563",
    lineHeight: 1.45,
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
  sectionDescription: {
    color: "#4b5563",
    lineHeight: 1.45,
    margin: "6px 0 0",
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
  longTextCell: {
    maxWidth: 280,
    whiteSpace: "normal",
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  approveButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#008a73",
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
  statusBadge: {
    borderRadius: 999,
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 700,
    padding: "5px 9px",
    whiteSpace: "nowrap",
  },
  statusApproved: {
    backgroundColor: "#e6f6f1",
    color: "#006f5c",
  },
  statusPending: {
    backgroundColor: "#fff7ed",
    color: "#9a3412",
  },
  statusRejected: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
};

export default App;
