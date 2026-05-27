import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AuthForm from "./components/AuthForm";
import MemberPage from "./pages/MemberPage";
import OrganizationPage from "./pages/OrganizationPage";
import LandingPage from "./LandingPage";
import PostProductPage from "./pages/PostProductPage";
import DonationEventsPage from "./pages/DonationEventsPage";
import ActivityPostsPage from "./pages/ActivityPostsPage";
import MemberAccountPage from "./pages/MemberAccountPage";
import ProductPurchasePage from "./pages/ProductPurchasePage";

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
  const [view, setView] = useState("dashboard");
  const navigate = (page) => {
    setView(page);
  };
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authMode, setAuthMode] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

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
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [adminOrganizations, setAdminOrganizations] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [activeAdminView, setActiveAdminView] = useState("pending");
  const [banDialog, setBanDialog] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [organizationManagerOpen, setOrganizationManagerOpen] = useState(false);
  const [organizationEventCreatorOpen, setOrganizationEventCreatorOpen] = useState(false);
  const decodedToken = token ? decodeToken(token) : null;
  const role = currentUser?.vai_tro || decodedToken?.role;
  const accountType = currentUser?.loai_tai_khoan || decodedToken?.accountType || role;

  const loadAdminData = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pendingRes, membersRes, organizationsRes, pendingCampaignsRes, pendingProductsRes, pendingPostsRes] = await Promise.all([
        axios.get(`${API}/auth/pending-accounts`, { headers }),
        axios.get(`${API}/auth/members`, { headers }),
        axios.get(`${API}/auth/organizations`, { headers }),
        axios.get(`${API}/campaigns/pending`, { headers }),
        axios.get(`${API}/products/pending`, { headers }),
        axios.get(`${API}/posts/pending`, { headers }),
      ]);

      setPendingAccounts(pendingRes.data);
      setAdminMembers(membersRes.data);
      setAdminOrganizations(organizationsRes.data);
      setPendingCampaigns(pendingCampaignsRes.data);
      setPendingProducts(pendingProductsRes.data);
      setPendingPosts(pendingPostsRes.data);
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

  const loadPendingCampaigns = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/campaigns/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingCampaigns(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải danh sách sự kiện chờ duyệt.");
    } finally {
      setLoadingAdminData(false);
    }
  }, [role, token]);

  const loadPendingProducts = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/products/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingProducts(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || err.response?.data?.error || "Không thể tải danh sách sản phẩm chờ duyệt.");
    } finally {
      setLoadingAdminData(false);
    }
  }, [role, token]);

  const loadPendingActivityPosts = useCallback(async () => {
    if (!token || role !== "admin") return;

    setLoadingAdminData(true);
    setNotice("");

    try {
      const res = await axios.get(`${API}/posts/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingPosts(res.data);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể tải danh sách bài đăng chờ duyệt.");
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
    setOrganizationManagerOpen(false);
    setOrganizationEventCreatorOpen(false);
    setAuthMode(null);
    setView("dashboard");
  };

  const handleOrganizationProfileUpdate = (updatedUser) => {
    const nextUser = { ...currentUser, ...updatedUser };

    localStorage.setItem("user", JSON.stringify(nextUser));
    setCurrentUser(nextUser);
  };

  const handleMemberProfileUpdate = (updatedUser) => {
    const nextUser = { ...currentUser, ...updatedUser };

    localStorage.setItem("user", JSON.stringify(nextUser));
    setCurrentUser(nextUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setCurrentUser(null);
    setPendingAccounts([]);
    setPendingCampaigns([]);
    setPendingProducts([]);
    setPendingPosts([]);
    setAdminMembers([]);
    setAdminOrganizations([]);
    setActiveAdminView("pending");
    setBanDialog(null);
    setBanReason("");
    setNotice("");
    setOrganizationManagerOpen(false);
    setOrganizationEventCreatorOpen(false);
    setAuthMode(null);
    setView("dashboard");
  };

  const goHome = () => {
    setAuthMode(null);
    setNotice("");
    setOrganizationManagerOpen(false);
    setOrganizationEventCreatorOpen(false);
    setSelectedProductId(null);
    setView(accountType === "thanh_vien" ? "home" : "dashboard");
  };

  const openProductPurchase = (productId) => {
    if (accountType !== "thanh_vien") {
      setView("dashboard");
      return;
    }

    setSelectedProductId(productId);
    setView("product-purchase");
  };

  const openPostProduct = () => {
    if (accountType !== "thanh_vien") {
      setView("dashboard");
      return;
    }

    if (!String(currentUser?.ma_ngan_hang || "").trim()) {
      setNotice("Bạn cần cập nhật mã ngân hàng/QR nhận tiền trước khi đăng bán sản phẩm.");
      setView("dashboard");
      return;
    }

    setNotice("");
    setView("post-product");
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

  const updateCampaignStatus = async (campaign, action) => {
    try {
      const endpoint = action === "approve" ? "approve" : "reject";
      const res = await axios.put(
        `${API}/campaigns/${campaign.ma_hoat_dong}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingCampaigns((prev) =>
        prev.filter((item) => item.ma_hoat_dong !== campaign.ma_hoat_dong)
      );
      setNotice(res.data.message);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể cập nhật sự kiện quyên góp.");
    }
  };

  const updateProductStatus = async (product, action) => {
    try {
      const endpoint = action === "approve" ? "approve" : "reject";
      const res = await axios.put(
        `${API}/products/${product.ma_san_pham}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingProducts((prev) =>
        prev.filter((item) => item.ma_san_pham !== product.ma_san_pham)
      );
      setNotice(res.data.message);
    } catch (err) {
      setNotice(err.response?.data?.message || err.response?.data?.error || "Không thể cập nhật sản phẩm.");
    }
  };

  const updatePostStatus = async (post, action) => {
    try {
      const endpoint = action === "approve" ? "approve" : "reject";
      const res = await axios.put(
        `${API}/posts/${endpoint}/${post.ma_bai_dang}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingPosts((prev) =>
        prev.filter((item) => item.ma_bai_dang !== post.ma_bai_dang)
      );
      setNotice(res.data.message);
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể cập nhật bài đăng hoạt động.");
    }
  };

  const openBanDialog = (account) => {
    setBanDialog(account);
    setBanReason(account.ly_do_cam || "");
    setNotice("");
  };

  const closeBanDialog = () => {
    if (banSubmitting) return;
    setBanDialog(null);
    setBanReason("");
  };

  const submitBanAccount = async (e) => {
    e.preventDefault();

    if (!banDialog) return;

    const reason = banReason.trim();
    if (!reason) {
      setNotice("Vui lòng nhập lý do cấm tài khoản.");
      return;
    }

    setBanSubmitting(true);
    setNotice("");

    try {
      const res = await axios.put(
        `${API}/auth/ban-account/${banDialog.loai_tai_khoan}/${banDialog.id}`,
        { ly_do_cam: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const bannedData = { trang_thai: "bi_cam", ly_do_cam: reason };

      setPendingAccounts((prev) =>
        prev.filter(
          (item) => !(item.id === banDialog.id && item.loai_tai_khoan === banDialog.loai_tai_khoan)
        )
      );

      if (banDialog.loai_tai_khoan === "to_chuc") {
        setAdminOrganizations((prev) =>
          prev.map((item) =>
            item.ma_to_chuc === banDialog.id ? { ...item, ...bannedData } : item
          )
        );
      } else {
        setAdminMembers((prev) =>
          prev.map((item) =>
            item.ma_thanh_vien === banDialog.id ? { ...item, ...bannedData } : item
          )
        );
      }

      setNotice(res.data.message || "Đã cấm tài khoản.");
      setBanDialog(null);
      setBanReason("");
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể cấm tài khoản.");
    } finally {
      setBanSubmitting(false);
    }
  };

  const unbanAccount = async (account) => {
    setNotice("");

    try {
      const res = await axios.put(
        `${API}/auth/unban-account/${account.loai_tai_khoan}/${account.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const approvedData = { trang_thai: "da_duyet", ly_do_cam: null };

      if (account.loai_tai_khoan === "to_chuc") {
        setAdminOrganizations((prev) =>
          prev.map((item) =>
            item.ma_to_chuc === account.id ? { ...item, ...approvedData } : item
          )
        );
      } else {
        setAdminMembers((prev) =>
          prev.map((item) =>
            item.ma_thanh_vien === account.id ? { ...item, ...approvedData } : item
          )
        );
      }

      setNotice(res.data.message || "Đã bỏ cấm tài khoản.");
    } catch (err) {
      setNotice(err.response?.data?.message || "Không thể bỏ cấm tài khoản.");
    }
  };

  if (!token) {
    if (view === "donations") {
      return (
        <div style={styles.page}>
          <PublicHeader
            onHomeClick={() => setView("dashboard")}
            onLoginClick={() => {
              setView("dashboard");
              setAuthMode("login");
            }}
            onRegisterClick={() => {
              setView("dashboard");
              setAuthMode("register");
            }}
          />
          <DonationEventsPage onBackHome={() => setView("dashboard")} />
        </div>
      );
    }

    if (authMode) {
      return (
        <div style={{ position: 'relative' }}>
          <AuthForm
            initialMode={authMode}
            onLoginSuccess={handleLoginSuccess}
            onHomeClick={() => setAuthMode(null)}
          />
        </div>
      );
    }
    return (
      <LandingPage
        onLoginClick={() => setAuthMode('login')}
        onRegisterClick={() => setAuthMode('register')}
        onHomeClick={() => setAuthMode(null)}
        onDonationClick={() => setView("donations")}
        onActivityClick={() => setAuthMode("login")}
      />
    );
  }

  if (view === "home" && accountType === "thanh_vien") {
    return (
      <LandingPage
        isAuthenticated
        user={currentUser}
        accountType={accountType}
        onHomeClick={goHome}
        onDashboardClick={() => setView("dashboard")}
        onDonationClick={() => setView("donations")}
        onActivityClick={() => setView("activities")}
        onAccountClick={() => setView(accountType === "thanh_vien" ? "member-account" : "dashboard")}
        onPostProductClick={openPostProduct}
        onBuyProductClick={openProductPurchase}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={goHome}
          style={{ ...styles.brandHeader, ...styles.brandHeaderButton }}
          aria-label="Về trang chủ School Market"
        >
          <img src="/images/school-market-icon-v2.png" alt="School Market" style={styles.headerLogo} />
          <div>
            <h1 style={styles.title}>School Market</h1>
            <p style={styles.subtitle}>{getHeaderSubtitle(role, accountType)}</p>
          </div>
        </button>
        <div style={styles.headerCenter}>
          {accountType === "to_chuc" ? (
            <button
              type="button"
              onClick={() => {
                if (organizationEventCreatorOpen) {
                  setOrganizationEventCreatorOpen(false);
                  setOrganizationManagerOpen(false);
                } else {
                  setOrganizationManagerOpen(false);
                  setOrganizationEventCreatorOpen(true);
                }
              }}
              style={styles.createEventButton}
            >
              {organizationEventCreatorOpen ? "Đóng tạo sự kiện" : "Tạo sự kiện quyên góp"}
            </button>
          ) : null}
        </div>
        <div style={styles.account}>
          {accountType === "to_chuc" && (
            <img
              src={currentUser?.avatar || "/images/school-market-icon-v2.png"}
              alt="Avatar tổ chức"
              style={styles.organizationAvatar}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/images/school-market-icon-v2.png";
              }}
            />
          )}
          {accountType === "thanh_vien" ? (
            <button
              type="button"
              onClick={() => setView("member-account")}
              style={styles.accountNameButton}
            >
              {getDisplayName(currentUser)}
            </button>
          ) : (
            <span style={styles.accountName}>{getDisplayName(currentUser)}</span>
          )}
          {accountType === "to_chuc" && (
            <button
              type="button"
              onClick={() => {
                setOrganizationEventCreatorOpen(false);
                setOrganizationManagerOpen((isOpen) => !isOpen);
              }}
              style={styles.manageOrgButton}
            >
              {organizationManagerOpen ? "Đóng quản lý" : "Quản lý tài khoản"}
            </button>
          )}
          <span style={styles.roleBadge}>{getRoleLabel(accountType)}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Đăng xuất</button>
        </div>
      </header>

      {notice && <p style={styles.notice}>{notice}</p>}

      {role === "admin" ? (
        <AdminDashboard
          pendingAccounts={pendingAccounts}
          pendingCampaigns={pendingCampaigns}
          pendingProducts={pendingProducts}
          pendingPosts={pendingPosts}
          members={adminMembers}
          organizations={adminOrganizations}
          activeView={activeAdminView}
          loading={loadingAdminData}
          onSelectView={setActiveAdminView}
          onReload={loadAdminData}
          onReloadPending={loadPendingAccounts}
          onReloadCampaigns={loadPendingCampaigns}
          onReloadProducts={loadPendingProducts}
          onReloadPosts={loadPendingActivityPosts}
          onOpenBanDialog={openBanDialog}
          onUnbanAccount={unbanAccount}
          onUpdateStatus={updateAccountStatus}
          onUpdateCampaignStatus={updateCampaignStatus}
          onUpdateProductStatus={updateProductStatus}
          onUpdatePostStatus={updatePostStatus}
        />
      ) : view === "donations" ? (
        <DonationEventsPage onBackHome={goHome} />
      ) : view === "activities" ? (
        <ActivityPostsPage
          token={token}
          accountType={accountType}
          onBackHome={goHome}
        />
      ) : accountType === "to_chuc" ? (
        <OrganizationPage
          user={currentUser}
          token={token}
          managerOpen={organizationManagerOpen}
          eventCreatorOpen={organizationEventCreatorOpen}
          onCloseManager={() => setOrganizationManagerOpen(false)}
          onCloseEventCreator={() => setOrganizationEventCreatorOpen(false)}
          onProfileUpdated={handleOrganizationProfileUpdate}
        />
      ) : view === "member-account" ? (
        <MemberAccountPage
          token={token}
          onBackHome={goHome}
          onProfileUpdated={handleMemberProfileUpdate}
        />
      ) : view === "product-purchase" ? (
        <ProductPurchasePage
          productId={selectedProductId}
          token={token}
          navigate={navigate}
          onBackHome={goHome}
        />
      ) : view === "dashboard" ? (
        <MemberPage
          user={currentUser}
          token={token}
          navigate={navigate}
          onLogout={handleLogout}
        />
      ) : view === "post-product" ? (
        <PostProductPage
          navigate={navigate}
          token={token}
        />
      ) : (
        <MemberPage
          user={currentUser}
          token={token}
          navigate={navigate}
          onLogout={handleLogout}
        />
      )}

      {banDialog && (
        <BanAccountDialog
          account={banDialog}
          reason={banReason}
          submitting={banSubmitting}
          onChangeReason={setBanReason}
          onClose={closeBanDialog}
          onSubmit={submitBanAccount}
        />
      )}
    </div>
  );
}

function PublicHeader({ onHomeClick, onLoginClick, onRegisterClick }) {
  return (
    <header style={styles.publicHeader}>
      <button
        type="button"
        onClick={onHomeClick}
        style={{ ...styles.brandHeader, ...styles.brandHeaderButton }}
        aria-label="Về trang chủ School Market"
      >
        <img src="/images/school-market-icon-v2.png" alt="School Market" style={styles.publicLogo} />
        <strong style={styles.publicBrand}>School Market</strong>
      </button>
      <div style={styles.publicActions}>
        <button type="button" onClick={onLoginClick} style={styles.publicLoginButton}>
          Đăng nhập
        </button>
        <button type="button" onClick={onRegisterClick} style={styles.publicRegisterButton}>
          Đăng ký
        </button>
      </div>
    </header>
  );
}

function AdminDashboard({
  pendingAccounts,
  pendingCampaigns,
  pendingProducts,
  pendingPosts,
  members,
  organizations,
  activeView,
  loading,
  onSelectView,
  onReload,
  onReloadPending,
  onReloadCampaigns,
  onReloadProducts,
  onReloadPosts,
  onOpenBanDialog,
  onUnbanAccount,
  onUpdateStatus,
  onUpdateCampaignStatus,
  onUpdateProductStatus,
  onUpdatePostStatus,
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
    {
      key: "campaigns",
      title: "Sự kiện",
      count: pendingCampaigns.length,
      description: "Duyệt hoặc từ chối sự kiện quyên góp của tổ chức.",
    },
    {
      key: "products",
      title: "Sản phẩm",
      count: pendingProducts.length,
      description: "Duyệt hoặc từ chối bài đăng sản phẩm của thành viên.",
    },
    {
      key: "posts",
      title: "Bài đăng",
      count: pendingPosts.length,
      description: "Duyệt hoặc từ chối bài đăng hoạt động của thành viên.",
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
        <AdminMembersTable
          members={members}
          loading={loading}
          onReload={onReload}
          onOpenBanDialog={onOpenBanDialog}
          onUnbanAccount={onUnbanAccount}
        />
      ) : activeView === "organizations" ? (
        <AdminOrganizationsTable
          organizations={organizations}
          loading={loading}
          onReload={onReload}
          onOpenBanDialog={onOpenBanDialog}
          onUnbanAccount={onUnbanAccount}
        />
      ) : activeView === "campaigns" ? (
        <AdminPendingCampaigns
          campaigns={pendingCampaigns}
          loading={loading}
          onReload={onReloadCampaigns}
          onUpdateStatus={onUpdateCampaignStatus}
        />
      ) : activeView === "products" ? (
        <AdminPendingProducts
          products={pendingProducts}
          loading={loading}
          onReload={onReloadProducts}
          onUpdateStatus={onUpdateProductStatus}
        />
      ) : activeView === "posts" ? (
        <AdminPendingPosts
          posts={pendingPosts}
          loading={loading}
          onReload={onReloadPosts}
          onUpdateStatus={onUpdatePostStatus}
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

function AdminMembersTable({ members, loading, onReload, onOpenBanDialog, onUnbanAccount }) {
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
                <th style={styles.th}>Lý do cấm</th>
                <th style={styles.th}>Thao tác</th>
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
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{member.ly_do_cam || "-"}</td>
                  <td style={styles.td}>
                    {member.trang_thai === "bi_cam" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUnbanAccount({
                            id: member.ma_thanh_vien,
                            loai_tai_khoan: "thanh_vien",
                          })
                        }
                        style={styles.unbanButton}
                      >
                        Bỏ cấm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenBanDialog({
                            id: member.ma_thanh_vien,
                            ten_hien_thi: member.ho_ten,
                            loai_tai_khoan: "thanh_vien",
                            ly_do_cam: member.ly_do_cam,
                          })
                        }
                        style={styles.banButton}
                      >
                        Cấm
                      </button>
                    )}
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

function AdminOrganizationsTable({ organizations, loading, onReload, onOpenBanDialog, onUnbanAccount }) {
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
                <th style={styles.th}>Lý do cấm</th>
                <th style={styles.th}>Thao tác</th>
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
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{organization.ly_do_cam || "-"}</td>
                  <td style={styles.td}>
                    {organization.trang_thai === "bi_cam" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUnbanAccount({
                            id: organization.ma_to_chuc,
                            loai_tai_khoan: "to_chuc",
                          })
                        }
                        style={styles.unbanButton}
                      >
                        Bỏ cấm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenBanDialog({
                            id: organization.ma_to_chuc,
                            ten_hien_thi: organization.ten_to_chuc,
                            loai_tai_khoan: "to_chuc",
                            ly_do_cam: organization.ly_do_cam,
                          })
                        }
                        style={styles.banButton}
                      >
                        Cấm
                      </button>
                    )}
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

function AdminPendingCampaigns({ campaigns, loading, onReload, onUpdateStatus }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Sự kiện quyên góp chờ duyệt</h2>
          <p style={styles.sectionDescription}>Các sự kiện tổ chức tạo cần admin kiểm tra trước khi hiển thị.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
          Tải lại
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Đang tải danh sách...</p>
      ) : campaigns.length === 0 ? (
        <p style={styles.empty}>Không có sự kiện nào đang chờ duyệt.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ảnh</th>
                <th style={styles.th}>Tên sự kiện</th>
                <th style={styles.th}>Tổ chức</th>
                <th style={styles.th}>Mô tả</th>
                <th style={styles.th}>Ngày tổ chức</th>
                <th style={styles.th}>Hạn kết thúc</th>
                <th style={styles.th}>Hình thức</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.ma_hoat_dong}>
                  <td style={styles.td}>
                    <img
                      src={campaign.anh_minh_hoa || "/images/school-market-icon-v2.png"}
                      alt=""
                      style={styles.campaignThumb}
                    />
                  </td>
                  <td style={styles.td}>{campaign.ten_hoat_dong}</td>
                  <td style={styles.td}>{campaign.ten_to_chuc || "-"}</td>
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{campaign.mo_ta || "-"}</td>
                  <td style={styles.td}>{campaign.ngay_to_chuc ? formatDate(campaign.ngay_to_chuc) : "-"}</td>
                  <td style={styles.td}>{campaign.han_ket_thuc ? formatDate(campaign.han_ket_thuc) : "-"}</td>
                  <td style={styles.td}>{getDonationTypeLabel(campaign.hinh_thuc_quyen_gop)}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(campaign, "approve")}
                        style={styles.approveButton}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(campaign, "reject")}
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

function AdminPendingProducts({ products, loading, onReload, onUpdateStatus }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Sản phẩm chờ duyệt</h2>
          <p style={styles.sectionDescription}>Bài đăng của thành viên chỉ hiển thị sau khi admin duyệt.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
          Tải lại
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Đang tải danh sách...</p>
      ) : products.length === 0 ? (
        <p style={styles.empty}>Không có sản phẩm nào đang chờ duyệt.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ảnh</th>
                <th style={styles.th}>Tên sản phẩm</th>
                <th style={styles.th}>Thành viên</th>
                <th style={styles.th}>Danh mục</th>
                <th style={styles.th}>Giá</th>
                <th style={styles.th}>Tình trạng</th>
                <th style={styles.th}>Quyên góp</th>
                <th style={styles.th}>Mô tả</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.ma_san_pham}>
                  <td style={styles.td}>
                    <img
                      src={getAssetUrl(product.anh)}
                      alt=""
                      style={styles.campaignThumb}
                    />
                  </td>
                  <td style={styles.td}>{product.ten_san_pham}</td>
                  <td style={styles.td}>{product.ho_ten || "-"}</td>
                  <td style={styles.td}>{product.ten_danh_muc || "-"}</td>
                  <td style={styles.td}>{formatCurrency(product.gia)}</td>
                  <td style={styles.td}>{product.tinh_trang || "-"}</td>
                  <td style={styles.td}>
                    {Number(product.so_phan_tram_quyen_gop || 0) > 0
                      ? `${product.so_phan_tram_quyen_gop}%${product.ten_hoat_dong ? ` - ${product.ten_hoat_dong}` : ""}`
                      : "-"}
                  </td>
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{product.mo_ta || "-"}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(product, "approve")}
                        style={styles.approveButton}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(product, "reject")}
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

function AdminPendingPosts({ posts, loading, onReload, onUpdateStatus }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Bài đăng hoạt động chờ duyệt</h2>
          <p style={styles.sectionDescription}>Bài đăng của thành viên chỉ hiện trên web sau khi admin duyệt.</p>
        </div>
        <button onClick={onReload} style={styles.secondaryButton}>
          Tải lại
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Đang tải danh sách...</p>
      ) : posts.length === 0 ? (
        <p style={styles.empty}>Không có bài đăng hoạt động nào đang chờ duyệt.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tiêu đề</th>
                <th style={styles.th}>Thành viên</th>
                <th style={styles.th}>Loại</th>
                <th style={styles.th}>Nội dung</th>
                <th style={styles.th}>Ngày đăng</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.ma_bai_dang}>
                  <td style={styles.td}>{post.tieu_de}</td>
                  <td style={styles.td}>{post.ho_ten || "-"}</td>
                  <td style={styles.td}>{getActivityPostTypeLabel(post.loai_bai_dang)}</td>
                  <td style={{ ...styles.td, ...styles.longTextCell }}>{post.noi_dung || "-"}</td>
                  <td style={styles.td}>{post.ngay_dang ? formatDate(post.ngay_dang) : "-"}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(post, "approve")}
                        style={styles.approveButton}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(post, "reject")}
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

function BanAccountDialog({ account, reason, submitting, onChangeReason, onClose, onSubmit }) {
  return (
    <div style={styles.modalOverlay} role="presentation">
      <form style={styles.modal} onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="ban-title">
        <div style={styles.modalHeader}>
          <h2 id="ban-title" style={styles.modalTitle}>
            Cấm tài khoản {getRoleLabel(account.loai_tai_khoan).toLowerCase()}
          </h2>
          <button type="button" onClick={onClose} style={styles.closeButton} aria-label="Đóng">
            ×
          </button>
        </div>

        <p style={styles.modalDescription}>
          Nhập lý do cấm tài khoản <strong>{account.ten_hien_thi}</strong>. Người dùng sẽ thấy lý do này khi đăng nhập.
        </p>

        <label style={styles.reasonField}>
          <span style={styles.reasonLabel}>Lý do cấm</span>
          <textarea
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            style={styles.reasonInput}
            placeholder="Ví dụ: Vi phạm quy định đăng bán sản phẩm..."
            rows={5}
            required
            autoFocus
          />
        </label>

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton} disabled={submitting}>
            Hủy
          </button>
          <button type="submit" style={styles.confirmBanButton} disabled={submitting}>
            {submitting ? "Đang cấm..." : "Cấm tài khoản"}
          </button>
        </div>
      </form>
    </div>
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

function getAssetUrl(path) {
  if (!path) return "/images/school-market-icon-v2.png";
  if (/^https?:\/\//i.test(path)) return path;
  return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`;
}

function formatBankInfo(member) {
  const parts = [member.ten_ngan_hang, member.so_tai_khoan].filter(Boolean);
  if (member.ma_ngan_hang) parts.push("Có QR");
  return parts.length > 0 ? parts.join(" - ") : "-";
}

function getDonationTypeLabel(type) {
  if (type === "nhan_tien_chuyen_khoan") return "Nhận tiền chuyển khoản";
  if (type === "ban_do_quyen_gop") return "Bán đồ quyên góp";
  if (type === "nhan_do_vat") return "Nhận đồ vật";
  return type || "-";
}

function getActivityPostTypeLabel(type) {
  if (type === "keu_goi_tinh_nguyen") return "Kêu gọi tình nguyện";
  if (type === "trao_doi_chia_se") return "Trao đổi chia sẻ";
  if (type === "hoi_dap") return "Hỏi đáp";
  return "Khác";
}

function getStatusLabel(status) {
  if (status === "da_duyet") return "Đã duyệt";
  if (status === "tu_choi") return "Từ chối";
  if (status === "cho_duyet") return "Chờ duyệt";
  if (status === "bi_cam") return "Bị cấm";
  return status || "-";
}

function getStatusStyle(status) {
  if (status === "da_duyet") {
    return { ...styles.statusBadge, ...styles.statusApproved };
  }

  if (status === "tu_choi") {
    return { ...styles.statusBadge, ...styles.statusRejected };
  }

  if (status === "bi_cam") {
    return { ...styles.statusBadge, ...styles.statusBanned };
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
  publicHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: "14px 18px",
  },
  publicLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    objectFit: "cover",
  },
  publicBrand: {
    color: "#52a774",
    fontSize: 20,
  },
  publicActions: {
    alignItems: "center",
    display: "flex",
    gap: 10,
  },
  publicLoginButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
    padding: "9px 10px",
  },
  publicRegisterButton: {
    backgroundColor: "#52a774",
    border: "none",
    borderRadius: 999,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 16px",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) auto minmax(280px, 1fr)",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandHeaderButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    padding: 0,
    textAlign: "left",
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
  headerCenter: {
    display: "flex",
    justifyContent: "center",
  },
  createEventButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#047857",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  organizationAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "2px solid #d1fae5",
    objectFit: "cover",
    backgroundColor: "#ecfdf5",
  },
  accountName: {
    fontWeight: 600,
  },
  accountNameButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 700,
    padding: 0,
  },
  manageOrgButton: {
    border: "1px solid #008a73",
    borderRadius: 6,
    backgroundColor: "#fff",
    color: "#006f5c",
    cursor: "pointer",
    fontWeight: 700,
    padding: "8px 12px",
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
  campaignThumb: {
    borderRadius: 6,
    height: 54,
    objectFit: "cover",
    width: 76,
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
  banButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#b91c1c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "8px 10px",
    whiteSpace: "nowrap",
  },
  unbanButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#008a73",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "8px 10px",
    whiteSpace: "nowrap",
  },
  confirmBanButton: {
    border: "none",
    borderRadius: 6,
    backgroundColor: "#b91c1c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 12px",
  },
  empty: {
    color: "#4b5563",
    margin: 0,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 24,
    position: "fixed",
    zIndex: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
    maxWidth: 520,
    padding: 22,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 22,
    margin: 0,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    color: "#111827",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 22,
    height: 34,
    justifyContent: "center",
    lineHeight: 1,
    width: 34,
  },
  modalDescription: {
    color: "#4b5563",
    lineHeight: 1.5,
    margin: "12px 0 16px",
  },
  reasonField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  reasonLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: 700,
  },
  reasonInput: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#111827",
    font: "inherit",
    lineHeight: 1.45,
    minHeight: 118,
    outline: "none",
    padding: 12,
    resize: "vertical",
    width: "100%",
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 18,
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
  statusBanned: {
    backgroundColor: "#111827",
    color: "#fff",
  },
};

export default App;
