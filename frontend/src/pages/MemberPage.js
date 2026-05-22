import React from "react";

function MemberPage({ user }) {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Khu vực thành viên</p>
          <h2 style={styles.title}>Xin chào, {user?.ho_ten || "thành viên"}</h2>
          <p style={styles.subtitle}>
            Quản lý thông tin cá nhân, sản phẩm đăng bán/quyên góp và các giao dịch của bạn.
          </p>
        </div>
        <div style={styles.profileBox}>
          <span style={styles.profileLabel}>Lớp</span>
          <strong style={styles.profileValue}>{user?.lop || "-"}</strong>
        </div>
      </section>

      <section style={styles.grid}>
        <ActionPanel
          title="Sản phẩm của tôi"
          description="Theo dõi các sản phẩm đã đăng, trạng thái duyệt và số lượng còn lại."
          action="Quản lý sản phẩm"
        />
        <ActionPanel
          title="Giao dịch"
          description="Xem lịch sử thanh toán, xác nhận giao dịch và ghi chú liên quan."
          action="Xem giao dịch"
        />
        <ActionPanel
          title="Quyên góp"
          description="Theo dõi phần trăm quyên góp và các hoạt động bạn đã tham gia."
          action="Xem quyên góp"
        />
      </section>
    </main>
  );
}

function ActionPanel({ title, description, action }) {
  return (
    <article style={styles.panel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      <p style={styles.panelText}>{description}</p>
      <button type="button" style={styles.panelButton}>{action}</button>
    </article>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  hero: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    padding: 22,
  },
  eyebrow: {
    color: "#008a73",
    fontSize: 13,
    fontWeight: 700,
    margin: "0 0 8px",
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 26,
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#4b5563",
    lineHeight: 1.5,
    margin: 0,
    maxWidth: 680,
  },
  profileBox: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f6f1",
    border: "1px solid #a9ded0",
    borderRadius: 8,
    minWidth: 110,
    padding: 14,
  },
  profileLabel: {
    color: "#006f5c",
    display: "block",
    fontSize: 13,
    marginBottom: 4,
  },
  profileValue: {
    color: "#111827",
    fontSize: 20,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  panel: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 18,
  },
  panelTitle: {
    color: "#111827",
    fontSize: 18,
    margin: "0 0 8px",
  },
  panelText: {
    color: "#4b5563",
    lineHeight: 1.5,
    margin: "0 0 16px",
  },
  panelButton: {
    backgroundColor: "#008a73",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 12px",
  },
};

export default MemberPage;
