import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const DEFAULT_ORGANIZATION_AVATAR = "/images/school-market-icon-v2.png";

const defaultDescription =
  "Quản lý hoạt động quyên góp, sản phẩm nhận hỗ trợ và các khoản phí thành viên.";

const initialEventForm = {
  ten_hoat_dong: "",
  mo_ta: "",
  ngay_to_chuc: "",
  dia_diem: "",
  han_ket_thuc: "",
  anh_minh_hoa: "",
  hinh_thuc_quyen_gop: "nhan_tien_chuyen_khoan",
};

const donationTypeOptions = [
  { value: "nhan_tien_chuyen_khoan", label: "Nhận tiền chuyển khoản" },
  { value: "ban_do_quyen_gop", label: "Bán đồ quyên góp" },
  { value: "nhan_do_vat", label: "Nhận đồ vật" },
];

function OrganizationPage({
  user,
  token,
  managerOpen,
  eventCreatorOpen,
  onCloseManager,
  onCloseEventCreator,
  onProfileUpdated,
}) {
  const [form, setForm] = useState(() => getProfileForm(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [eventError, setEventError] = useState("");
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loadingApprovedEvents, setLoadingApprovedEvents] = useState(false);
  const [approvedEventsError, setApprovedEventsError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadApprovedEvents = useCallback(async () => {
    if (!token) return;

    setLoadingApprovedEvents(true);
    setApprovedEventsError("");

    try {
      const res = await axios.get(`${API}/campaigns/my-approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovedEvents(res.data);
    } catch (err) {
      setApprovedEventsError(err.response?.data?.message || "Không thể tải sự kiện của tổ chức.");
    } finally {
      setLoadingApprovedEvents(false);
    }
  }, [token]);

  useEffect(() => {
    setForm(getProfileForm(user));
  }, [user]);

  useEffect(() => {
    loadApprovedEvents();
  }, [loadApprovedEvents]);

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
    setMessage("");
    setError("");
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng file ảnh.");
      event.target.value = "";
      return;
    }

    try {
      const avatar = await resizeImageFile(file);
      setForm((currentForm) => ({ ...currentForm, avatar }));
      setMessage("");
      setError("");
    } catch {
      setError("Không thể đọc file ảnh này. Vui lòng chọn ảnh khác.");
    } finally {
      event.target.value = "";
    }
  };

  const handleCloseManager = () => {
    setForm(getProfileForm(user));
    setMessage("");
    setError("");
    onCloseManager?.();
  };

  const handleEventChange = (event) => {
    setEventForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
    setEventMessage("");
    setEventError("");
  };

  const handleEventImageFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEventError("Vui lòng chọn đúng file ảnh minh họa.");
      event.target.value = "";
      return;
    }

    try {
      const anh_minh_hoa = await resizeImageFile(file);
      setEventForm((currentForm) => ({ ...currentForm, anh_minh_hoa }));
      setEventMessage("");
      setEventError("");
    } catch {
      setEventError("Không thể đọc file ảnh này. Vui lòng chọn ảnh khác.");
    } finally {
      event.target.value = "";
    }
  };

  const handleCloseEventCreator = () => {
    setEventForm(initialEventForm);
    setEventMessage("");
    setEventError("");
    onCloseEventCreator?.();
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();

    if (!eventForm.anh_minh_hoa) {
      setEventError("Vui lòng chọn ảnh minh họa.");
      return;
    }

    setCreatingEvent(true);
    setEventMessage("");
    setEventError("");

    try {
      const res = await axios.post(`${API}/campaigns`, eventForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEventForm(initialEventForm);
      setEventMessage(res.data.message || "Đã tạo sự kiện quyên góp.");
    } catch (err) {
      setEventError(err.response?.data?.message || "Không thể tạo sự kiện quyên góp.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await axios.put(`${API}/auth/organization-profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onProfileUpdated?.(res.data.user);
      setMessage(res.data.message || "Đã cập nhật tài khoản tổ chức.");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật tài khoản tổ chức.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      {eventCreatorOpen ? (
        <DonationEventCreator
          form={eventForm}
          creating={creatingEvent}
          message={eventMessage}
          error={eventError}
          onChange={handleEventChange}
          onImageChange={handleEventImageFileChange}
          onClose={handleCloseEventCreator}
          onSubmit={handleCreateEvent}
        />
      ) : managerOpen ? (
        <OrganizationAccountManager
          user={user}
          form={form}
          saving={saving}
          message={message}
          error={error}
          onChange={handleChange}
          onAvatarFileChange={handleAvatarFileChange}
          onClose={handleCloseManager}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          <section style={styles.hero}>
            <div>
              <p style={styles.eyebrow}>Khu vực tổ chức</p>
              <h2 style={styles.title}>{user?.ten_to_chuc || "Tổ chức"}</h2>
              <p style={styles.subtitle}>{user?.mo_ta || defaultDescription}</p>
            </div>
            <div style={styles.contactBox}>
              <span style={styles.contactLabel}>Liên hệ</span>
              <strong style={styles.contactValue}>{user?.sdt || "-"}</strong>
            </div>
          </section>

          <OrganizationEventsSection
            events={approvedEvents}
            loading={loadingApprovedEvents}
            error={approvedEventsError}
            onSelectEvent={setSelectedEvent}
          />
        </>
      )}

      {selectedEvent && (
        <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}

function OrganizationEventsSection({ events, loading, error, onSelectEvent }) {
  return (
    <section style={styles.eventsSection} aria-label="Sự kiện của tổ chức">
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Sự kiện của tổ chức</h2>
          <p style={styles.sectionDescription}>Các sự kiện đã được admin duyệt sẽ hiển thị tại đây.</p>
        </div>
      </div>

      {loading ? (
        <p style={styles.emptyText}>Đang tải sự kiện...</p>
      ) : error ? (
        <p style={styles.errorMessage}>{error}</p>
      ) : events.length === 0 ? (
        <p style={styles.emptyText}>Chưa có sự kiện nào được duyệt.</p>
      ) : (
        <div style={styles.eventCards}>
          {events.map((event) => (
            <button
              key={event.ma_hoat_dong}
              type="button"
              onClick={() => onSelectEvent(event)}
              style={styles.eventCard}
            >
              <img src={event.anh_minh_hoa} alt="" style={styles.eventCardImage} />
              <div style={styles.eventCardBody}>
                <h3 style={styles.eventCardTitle}>{event.ten_hoat_dong}</h3>
                <p style={styles.eventCardText}>{event.mo_ta}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function EventDetailDialog({ event, onClose }) {
  return (
    <div style={styles.detailOverlay} role="presentation">
      <section style={styles.detailDialog} role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
        <div style={styles.detailHeader}>
          <h2 id="event-detail-title" style={styles.detailTitle}>{event.ten_hoat_dong}</h2>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>
            Đóng
          </button>
        </div>
        <img src={event.anh_minh_hoa} alt="" style={styles.detailImage} />
        <p style={styles.detailText}>{event.mo_ta}</p>
        <dl style={styles.detailList}>
          <div>
            <dt>Ngày tổ chức</dt>
            <dd>{formatDate(event.ngay_to_chuc)}</dd>
          </div>
          <div>
            <dt>Hạn kết thúc</dt>
            <dd>{formatDate(event.han_ket_thuc)}</dd>
          </div>
          <div>
            <dt>Địa điểm</dt>
            <dd>{event.dia_diem || "-"}</dd>
          </div>
          <div>
            <dt>Hình thức</dt>
            <dd>{getDonationTypeLabel(event.hinh_thuc_quyen_gop)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function DonationEventCreator({
  form,
  creating,
  message,
  error,
  onChange,
  onImageChange,
  onClose,
  onSubmit,
}) {
  return (
    <section style={styles.eventCreator} aria-label="Tạo sự kiện quyên góp">
      <div style={styles.managerHeader}>
        <div>
          <h2 style={styles.managerTitle}>Tạo sự kiện quyên góp</h2>
          <p style={styles.managerDescription}>
            Nhập đầy đủ thông tin sự kiện trước khi tạo.
          </p>
        </div>
        <button type="button" onClick={onClose} style={styles.secondaryButton}>
          Đóng
        </button>
      </div>

      <form onSubmit={onSubmit} style={styles.managerForm}>
        <div style={styles.eventGrid}>
          <div style={styles.editColumn}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Ảnh minh họa</span>
              <div style={styles.eventImageRow}>
                {form.anh_minh_hoa ? (
                  <img
                    src={form.anh_minh_hoa}
                    alt="Ảnh minh họa sự kiện"
                    style={styles.eventImagePreview}
                  />
                ) : (
                  <div style={styles.eventImagePlaceholder}>Chưa chọn ảnh</div>
                )}
                <input type="file" accept="image/*" onChange={onImageChange} style={styles.fileInput} />
              </div>
            </label>

            <EditableField
              label="Tên hoạt động"
              name="ten_hoat_dong"
              value={form.ten_hoat_dong}
              onChange={onChange}
              placeholder="Ví dụ: Quyên góp sách cho học sinh khó khăn"
              required
            />

            <EditableField
              label="Mô tả"
              name="mo_ta"
              value={form.mo_ta}
              onChange={onChange}
              placeholder="Mô tả mục tiêu, đối tượng hỗ trợ và cách tham gia"
              required
              multiline
            />
          </div>

          <div style={styles.editColumn}>
            <EditableField
              label="Ngày tổ chức"
              name="ngay_to_chuc"
              type="datetime-local"
              value={form.ngay_to_chuc}
              onChange={onChange}
              required
            />

            <EditableField
              label="Hạn kết thúc"
              name="han_ket_thuc"
              type="datetime-local"
              value={form.han_ket_thuc}
              onChange={onChange}
              required
            />

            <EditableField
              label="Địa điểm"
              name="dia_diem"
              value={form.dia_diem}
              onChange={onChange}
              placeholder="Nhập địa điểm tổ chức"
              required
            />

            <fieldset style={styles.radioFieldset}>
              <legend style={styles.fieldLabel}>Hình thức quyên góp</legend>
              <div style={styles.radioGroup}>
                {donationTypeOptions.map((option) => (
                  <label key={option.value} style={styles.radioOption}>
                    <input
                      type="radio"
                      name="hinh_thuc_quyen_gop"
                      value={option.value}
                      checked={form.hinh_thuc_quyen_gop === option.value}
                      onChange={onChange}
                      required
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {message && <p style={styles.successMessage}>{message}</p>}
        {error && <p style={styles.errorMessage}>{error}</p>}

        <div style={styles.managerActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton} disabled={creating}>
            Hủy
          </button>
          <button type="submit" style={styles.saveButton} disabled={creating}>
            {creating ? "Đang tạo..." : "Tạo sự kiện"}
          </button>
        </div>
      </form>
    </section>
  );
}

function OrganizationAccountManager({
  user,
  form,
  saving,
  message,
  error,
  onChange,
  onAvatarFileChange,
  onClose,
  onSubmit,
}) {
  const avatarPreview = form.avatar || DEFAULT_ORGANIZATION_AVATAR;
  const readOnlyFields = [
    { label: "Email", value: user?.email || "-" },
    { label: "Số điện thoại", value: user?.sdt || "-" },
  ];

  if (user?.ly_do_cam) {
    readOnlyFields.push({ label: "Lý do cấm", value: user.ly_do_cam });
  }

  return (
    <section style={styles.accountManager} aria-label="Quản lý tài khoản tổ chức">
      <div style={styles.managerHeader}>
        <div>
          <h2 style={styles.managerTitle}>Quản lý tài khoản tổ chức</h2>
          <p style={styles.managerDescription}>
            Chỉ tên tổ chức, avatar, địa chỉ và mô tả được phép cập nhật.
          </p>
        </div>
        <button type="button" onClick={onClose} style={styles.secondaryButton}>
          Đóng
        </button>
      </div>

      <form onSubmit={onSubmit} style={styles.managerForm}>
        <div style={styles.managerGrid}>
          <div style={styles.editColumn}>
            <div style={styles.avatarPreviewRow}>
              <img
                src={avatarPreview}
                alt="Avatar tổ chức"
                style={styles.avatarPreview}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_ORGANIZATION_AVATAR;
                }}
              />
              <AvatarFileField
                label="Avatar tổ chức"
                hasAvatar={Boolean(form.avatar)}
                onChange={onAvatarFileChange}
              />
            </div>

            <EditableField
              label="Tên tổ chức"
              name="ten_to_chuc"
              value={form.ten_to_chuc}
              onChange={onChange}
              placeholder="Nhập tên tổ chức"
              required
            />

            <EditableField
              label="Địa chỉ"
              name="dia_chi"
              value={form.dia_chi}
              onChange={onChange}
              placeholder="Nhập địa chỉ tổ chức"
            />

            <EditableField
              label="Mô tả"
              name="mo_ta"
              value={form.mo_ta}
              onChange={onChange}
              placeholder="Nhập mô tả tổ chức"
              multiline
            />
          </div>

          <div style={styles.readOnlyColumn}>
            {readOnlyFields.map((field) => (
              <ReadOnlyField key={field.label} label={field.label} value={field.value} />
            ))}
          </div>
        </div>

        {message && <p style={styles.successMessage}>{message}</p>}
        {error && <p style={styles.errorMessage}>{error}</p>}

        <div style={styles.managerActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton} disabled={saving}>
            Hủy
          </button>
          <button type="submit" style={styles.saveButton} disabled={saving}>
            {saving ? "Đang cập nhật..." : "Cập nhật"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AvatarFileField({ label, hasAvatar, onChange }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input type="file" accept="image/*" onChange={onChange} style={styles.fileInput} />
      <span style={styles.fileHint}>
        {hasAvatar ? "Đã chọn ảnh avatar." : "Chọn ảnh từ máy tính."}
      </span>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  multiline = false,
  maxLength,
}) {
  const inputStyle = multiline ? styles.textArea : styles.input;
  const InputComponent = multiline ? "textarea" : "input";

  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <InputComponent
        name={name}
        type={multiline ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        rows={multiline ? 4 : undefined}
        style={inputStyle}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input value={value || "-"} readOnly style={{ ...styles.input, ...styles.readOnlyInput }} />
    </label>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getDonationTypeLabel(type) {
  if (type === "nhan_tien_chuyen_khoan") return "Nhận tiền chuyển khoản";
  if (type === "ban_do_quyen_gop") return "Bán đồ quyên góp";
  if (type === "nhan_do_vat") return "Nhận đồ vật";
  return type || "-";
}

function getProfileForm(user) {
  return {
    ten_to_chuc: user?.ten_to_chuc || "",
    avatar: user?.avatar || "",
    dia_chi: user?.dia_chi || "",
    mo_ta: user?.mo_ta || "",
  };
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();

      image.onerror = reject;
      image.onload = () => {
        const maxSize = 512;
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
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
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
    flexWrap: "wrap",
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
  eventsSection: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 20,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 22,
    margin: 0,
  },
  sectionDescription: {
    color: "#4b5563",
    lineHeight: 1.45,
    margin: "6px 0 0",
  },
  eventCards: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  eventCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    font: "inherit",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
  },
  eventCardImage: {
    aspectRatio: "16 / 9",
    objectFit: "cover",
    width: "100%",
  },
  eventCardBody: {
    display: "grid",
    gap: 8,
    padding: 14,
  },
  eventCardTitle: {
    fontSize: 18,
    margin: 0,
  },
  eventCardText: {
    color: "#4b5563",
    lineHeight: 1.45,
    margin: 0,
  },
  emptyText: {
    color: "#4b5563",
    margin: 0,
  },
  detailOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 24,
    position: "fixed",
    zIndex: 30,
  },
  detailDialog: {
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
    maxHeight: "90vh",
    maxWidth: 720,
    overflow: "auto",
    padding: 20,
    width: "100%",
  },
  detailHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 24,
    margin: 0,
  },
  detailImage: {
    borderRadius: 8,
    maxHeight: 320,
    objectFit: "cover",
    width: "100%",
  },
  detailText: {
    color: "#4b5563",
    lineHeight: 1.5,
    margin: "14px 0",
  },
  detailList: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    margin: 0,
  },
  accountManager: {
    backgroundColor: "#fff",
    border: "1px solid #d1fae5",
    borderRadius: 8,
    padding: 20,
  },
  eventCreator: {
    backgroundColor: "#fff",
    border: "1px solid #d1fae5",
    borderRadius: 8,
    padding: 20,
  },
  managerHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  managerTitle: {
    color: "#111827",
    fontSize: 22,
    margin: 0,
  },
  managerDescription: {
    color: "#4b5563",
    lineHeight: 1.45,
    margin: "6px 0 0",
  },
  managerForm: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  managerGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  eventGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  editColumn: {
    display: "grid",
    gap: 14,
  },
  readOnlyColumn: {
    display: "grid",
    gap: 14,
  },
  avatarPreviewRow: {
    alignItems: "center",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "72px 1fr",
  },
  avatarPreview: {
    backgroundColor: "#ecfdf5",
    border: "2px solid #d1fae5",
    borderRadius: 999,
    height: 72,
    objectFit: "cover",
    width: 72,
  },
  eventImageRow: {
    display: "grid",
    gap: 10,
  },
  eventImagePreview: {
    backgroundColor: "#f9fafb",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    height: 180,
    objectFit: "cover",
    width: "100%",
  },
  eventImagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    color: "#6b7280",
    display: "flex",
    height: 180,
    justifyContent: "center",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#111827",
    font: "inherit",
    minHeight: 42,
    outline: "none",
    padding: "9px 11px",
    width: "100%",
  },
  fileInput: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#111827",
    font: "inherit",
    minHeight: 42,
    padding: "8px 10px",
    width: "100%",
  },
  fileHint: {
    color: "#6b7280",
    fontSize: 13,
  },
  textArea: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#111827",
    font: "inherit",
    lineHeight: 1.45,
    minHeight: 108,
    outline: "none",
    padding: "10px 11px",
    resize: "vertical",
    width: "100%",
  },
  readOnlyInput: {
    backgroundColor: "#f9fafb",
    color: "#4b5563",
    cursor: "default",
  },
  radioFieldset: {
    border: "none",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    margin: 0,
    padding: 0,
  },
  radioGroup: {
    display: "grid",
    gap: 8,
  },
  radioOption: {
    alignItems: "center",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    color: "#111827",
    display: "flex",
    gap: 9,
    minHeight: 42,
    padding: "9px 11px",
  },
  managerActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    backgroundColor: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
    padding: "9px 12px",
  },
  saveButton: {
    backgroundColor: "#047857",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 13px",
  },
  successMessage: {
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 8,
    color: "#047857",
    margin: 0,
    padding: "10px 12px",
  },
  errorMessage: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    color: "#b91c1c",
    margin: 0,
    padding: "10px 12px",
  },
};

export default OrganizationPage;
