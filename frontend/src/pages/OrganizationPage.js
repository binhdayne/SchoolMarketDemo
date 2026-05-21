import React from "react";

function OrganizationPage({ user }) {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Khu vực tổ chức</p>
          <h2 style={styles.title}>{user?.ten_to_chuc || "Tổ chức"}</h2>
          <p style={styles.subtitle}>
            Quản lý hoạt động quyên góp, sản phẩm nhận hỗ trợ và các khoản phí thành viên.
          </p>
        </div>
        <div style={styles.contactBox}>
          <span style={styles.contactLabel}>Liên hệ</span>
          <strong style={styles.contactValue}>{user?.sdt || "-"}</strong>
        </div>
      </section>

      <section style={styles.grid}>
        <ActionPanel
          title="Hoạt động quyên góp"
          description="Tạo và theo dõi các chiến dịch, thời hạn kết thúc và trạng thái tổ chức."
          action="Quản lý hoạt động"
        />
        <ActionPanel
          title="Sản phẩm nhận hỗ trợ"
          description="Xem sản phẩm gắn với tổ chức và phần trăm quyên góp tương ứng."
          action="Xem sản phẩm"
        />
        <ActionPanel
          title="Phí thành viên"
          description="Theo dõi khoản phí, ảnh xác nhận và trạng thái duyệt phí."
          action="Xem phí"
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
    color: "#047857",
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
  contactBox: {
    alignSelf: "flex-start",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 8,
    minWidth: 140,
    padding: 14,
  },
  contactLabel: {
    color: "#047857",
    display: "block",
    fontSize: 13,
    marginBottom: 4,
  },
  contactValue: {
    color: "#111827",
    fontSize: 18,
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
    backgroundColor: "#047857",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 12px",
  },
};

export default OrganizationPage;
