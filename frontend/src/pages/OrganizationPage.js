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
  ma_qr_quyen_gop: "",
  so_tien_toi_thieu: "",
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
  const [approvedEventsMessage, setApprovedEventsMessage] = useState("");
  const [approvedEventsError, setApprovedEventsError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [pendingContributions, setPendingContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionMessage, setContributionMessage] = useState("");
  const [contributionError, setContributionError] = useState("");
  const [confirmingContributionId, setConfirmingContributionId] = useState(null);
  const [donationSales, setDonationSales] = useState([]);
  const [loadingDonationSales, setLoadingDonationSales] = useState(false);
  const [donationSalesMessage, setDonationSalesMessage] = useState("");
  const [donationSalesError, setDonationSalesError] = useState("");
  const [confirmingDonationSaleId, setConfirmingDonationSaleId] = useState(null);
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [loadingSellerPayouts, setLoadingSellerPayouts] = useState(false);
  const [sellerPayoutMessage, setSellerPayoutMessage] = useState("");
  const [sellerPayoutError, setSellerPayoutError] = useState("");
  const [confirmingSellerPayoutId, setConfirmingSellerPayoutId] = useState(null);

  const loadApprovedEvents = useCallback(async () => {
    if (!token) return;

    setLoadingApprovedEvents(true);
    setApprovedEventsMessage("");
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

  const loadPendingContributions = useCallback(async () => {
    if (!token) return;

    setLoadingContributions(true);
    setContributionError("");

    try {
      const res = await axios.get(`${API}/campaigns/contributions/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingContributions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setContributionError(err.response?.data?.message || "Không thể tải biên lai chờ xác nhận.");
    } finally {
      setLoadingContributions(false);
    }
  }, [token]);

  const loadDonationSales = useCallback(async () => {
    if (!token) return;

    setLoadingDonationSales(true);
    setDonationSalesError("");

    try {
      const res = await axios.get(`${API}/products/organization-donation-sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonationSales(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setDonationSalesError(err.response?.data?.error || "Không thể tải biên lai mua sản phẩm quyên góp.");
    } finally {
      setLoadingDonationSales(false);
    }
  }, [token]);

  const loadSellerPayouts = useCallback(async () => {
    if (!token) return;

    setLoadingSellerPayouts(true);
    setSellerPayoutError("");

    try {
      const res = await axios.get(`${API}/products/organization-seller-payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellerPayouts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSellerPayoutError(err.response?.data?.error || "Không thể tải khoản cần thanh toán cho người bán.");
    } finally {
      setLoadingSellerPayouts(false);
    }
  }, [token]);

  useEffect(() => {
    setForm(getProfileForm(user));
  }, [user]);

  useEffect(() => {
    loadApprovedEvents();
    loadPendingContributions();
    loadDonationSales();
    loadSellerPayouts();
  }, [loadApprovedEvents, loadPendingContributions, loadDonationSales, loadSellerPayouts]);

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

  const handleEventQrFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEventError("Vui lòng chọn đúng file ảnh QR quyên góp.");
      event.target.value = "";
      return;
    }

    try {
      const ma_qr_quyen_gop = await resizeImageFile(file);
      setEventForm((currentForm) => ({ ...currentForm, ma_qr_quyen_gop }));
      setEventMessage("");
      setEventError("");
    } catch {
      setEventError("Không thể đọc file QR này. Vui lòng chọn ảnh khác.");
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

    if (!eventForm.ma_qr_quyen_gop) {
      setEventError("Vui lòng tải lên mã QR nhận quyên góp.");
      return;
    }

    if (
      eventForm.hinh_thuc_quyen_gop === "nhan_tien_chuyen_khoan" &&
      Number(eventForm.so_tien_toi_thieu || 0) <= 0
    ) {
      setEventError("Vui lòng nhập số tiền tối thiểu khi nhận tiền chuyển khoản.");
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
      loadPendingContributions();
    } catch (err) {
      setEventError(err.response?.data?.message || "Không thể tạo sự kiện quyên góp.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    const ok = window.confirm(`Xóa sự kiện "${event.ten_hoat_dong}"?`);
    if (!ok) return;

    setDeletingEventId(event.ma_hoat_dong);
    setApprovedEventsMessage("");
    setApprovedEventsError("");

    try {
      const res = await axios.delete(`${API}/campaigns/${event.ma_hoat_dong}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setApprovedEvents((currentEvents) =>
        currentEvents.filter((item) => item.ma_hoat_dong !== event.ma_hoat_dong)
      );
      setApprovedEventsMessage(res.data.message || "Đã xóa sự kiện.");
      if (selectedEvent?.ma_hoat_dong === event.ma_hoat_dong) {
        setSelectedEvent(null);
      }
    } catch (err) {
      setApprovedEventsError(err.response?.data?.message || "Không thể xóa sự kiện.");
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleConfirmContribution = async (contribution) => {
    const ok = window.confirm(`Xác nhận biên lai của ${contribution.ho_ten}?`);
    if (!ok) return;

    setConfirmingContributionId(contribution.ma_dong_gop);
    setContributionMessage("");
    setContributionError("");

    try {
      const res = await axios.put(
        `${API}/campaigns/contributions/${contribution.ma_dong_gop}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setContributionMessage(res.data.message || "Đã xác nhận biên lai quyên góp.");
      setPendingContributions((currentContributions) =>
        currentContributions.filter((item) => item.ma_dong_gop !== contribution.ma_dong_gop)
      );
      await loadApprovedEvents();
    } catch (err) {
      setContributionError(err.response?.data?.message || "Không thể xác nhận biên lai.");
    } finally {
      setConfirmingContributionId(null);
    }
  };

  const handleConfirmDonationSale = async (sale) => {
    const ok = window.confirm(`Xác nhận biên lai mua "${sale.ten_san_pham}"?`);
    if (!ok) return;

    setConfirmingDonationSaleId(sale.ma_thanh_toan);
    setDonationSalesMessage("");
    setDonationSalesError("");

    try {
      const res = await axios.put(
        `${API}/products/organization-donation-sales/${sale.ma_thanh_toan}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDonationSalesMessage(res.data.message || "Đã xác nhận biên lai mua sản phẩm quyên góp.");
      setDonationSales((currentSales) =>
        currentSales.filter((item) => item.ma_thanh_toan !== sale.ma_thanh_toan)
      );
      await loadSellerPayouts();
    } catch (err) {
      setDonationSalesError(err.response?.data?.error || "Không thể xác nhận biên lai mua sản phẩm quyên góp.");
    } finally {
      setConfirmingDonationSaleId(null);
    }
  };

  const handleConfirmSellerPayout = async (payout) => {
    const ok = window.confirm(`Xác nhận đã thanh toán cho ${payout.ten_nguoi_ban || "người bán"}?`);
    if (!ok) return;

    setConfirmingSellerPayoutId(payout.ma_thanh_toan);
    setSellerPayoutMessage("");
    setSellerPayoutError("");

    try {
      const res = await axios.put(
        `${API}/products/organization-seller-payouts/${payout.ma_thanh_toan}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSellerPayoutMessage(res.data.message || "Đã xác nhận thanh toán cho người bán.");
      setSellerPayouts((currentPayouts) =>
        currentPayouts.filter((item) => item.ma_thanh_toan !== payout.ma_thanh_toan)
      );
    } catch (err) {
      setSellerPayoutError(err.response?.data?.error || "Không thể xác nhận thanh toán cho người bán.");
    } finally {
      setConfirmingSellerPayoutId(null);
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
          onQrImageChange={handleEventQrFileChange}
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
            message={approvedEventsMessage}
            error={approvedEventsError}
            onSelectEvent={setSelectedEvent}
            deletingEventId={deletingEventId}
            onDeleteEvent={handleDeleteEvent}
          />

          <OrganizationContributionRequests
            contributions={pendingContributions}
            loading={loadingContributions}
            message={contributionMessage}
            error={contributionError}
            confirmingContributionId={confirmingContributionId}
            onConfirmContribution={handleConfirmContribution}
          />

          <OrganizationDonationSaleRequests
            sales={donationSales}
            loading={loadingDonationSales}
            message={donationSalesMessage}
            error={donationSalesError}
            confirmingSaleId={confirmingDonationSaleId}
            onConfirmSale={handleConfirmDonationSale}
          />

          <OrganizationSellerPayouts
            payouts={sellerPayouts}
            loading={loadingSellerPayouts}
            message={sellerPayoutMessage}
            error={sellerPayoutError}
            confirmingPayoutId={confirmingSellerPayoutId}
            onConfirmPayout={handleConfirmSellerPayout}
          />
        </>
      )}

      {selectedEvent && (
        <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}

function OrganizationEventsSection({ events, loading, message, error, deletingEventId, onSelectEvent, onDeleteEvent }) {
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
      ) : (
        <>
          {message && <p style={styles.successMessage}>{message}</p>}
          {error && <p style={styles.errorMessage}>{error}</p>}
          {events.length === 0 ? (
            <p style={styles.emptyText}>Chưa có sự kiện nào được duyệt.</p>
          ) : (
            <div style={styles.eventCards}>
              {events.map((event) => (
                <article
                  key={event.ma_hoat_dong}
                  style={styles.eventCard}
                >
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    style={styles.eventCardPreview}
                  >
                    <img src={event.anh_minh_hoa} alt="" style={styles.eventCardImage} />
                    <div style={styles.eventCardBody}>
                      <h3 style={styles.eventCardTitle}>{event.ten_hoat_dong}</h3>
                      <p style={styles.eventCardText}>{event.mo_ta}</p>
                    </div>
                  </button>
                  <div style={styles.eventCardActions}>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(event)}
                      style={styles.deleteButton}
                      disabled={deletingEventId === event.ma_hoat_dong}
                    >
                      {deletingEventId === event.ma_hoat_dong ? "Đang xóa..." : "Xóa sự kiện"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function OrganizationContributionRequests({
  contributions,
  loading,
  message,
  error,
  confirmingContributionId,
  onConfirmContribution,
}) {
  return (
    <section style={styles.eventsSection} aria-label="Biên lai quyên góp chờ xác nhận">
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Biên lai chờ xác nhận</h2>
          <p style={styles.sectionDescription}>Thành viên gửi biên lai chuyển khoản cho sự kiện nhận tiền.</p>
        </div>
      </div>

      {message && <p style={styles.successMessage}>{message}</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}

      {loading ? (
        <p style={styles.emptyText}>Đang tải biên lai...</p>
      ) : contributions.length === 0 ? (
        <p style={styles.emptyText}>Chưa có biên lai nào đang chờ xác nhận.</p>
      ) : (
        <div style={styles.contributionCards}>
          {contributions.map((contribution) => (
            <article key={contribution.ma_dong_gop} style={styles.contributionCard}>
              <img
                src={getAssetUrl(contribution.anh_bien_lai)}
                alt="Biên lai quyên góp"
                style={styles.contributionReceipt}
              />
              <div style={styles.contributionBody}>
                <h3 style={styles.eventCardTitle}>{contribution.ten_hoat_dong}</h3>
                <p style={styles.eventCardText}>
                  {contribution.ho_ten || "Thành viên"} - {contribution.lop || "Chưa cập nhật lớp"}
                </p>
                <p style={styles.eventCardText}>Số tiền: {formatCurrency(contribution.so_tien)}</p>
                {contribution.ghi_chu && <p style={styles.eventCardText}>Ghi chú: {contribution.ghi_chu}</p>}
                <button
                  type="button"
                  onClick={() => onConfirmContribution(contribution)}
                  style={styles.saveButton}
                  disabled={confirmingContributionId === contribution.ma_dong_gop}
                >
                  {confirmingContributionId === contribution.ma_dong_gop ? "Đang xác nhận..." : "Xác nhận"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrganizationDonationSaleRequests({
  sales,
  loading,
  message,
  error,
  confirmingSaleId,
  onConfirmSale,
}) {
  return (
    <section style={styles.eventsSection} aria-label="Biên lai mua sản phẩm quyên góp chờ xác nhận">
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Biên lai mua sản phẩm quyên góp</h2>
          <p style={styles.sectionDescription}>Người mua chuyển khoản vào QR sự kiện và gửi biên lai để tổ chức xác nhận.</p>
        </div>
      </div>

      {message && <p style={styles.successMessage}>{message}</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}

      {loading ? (
        <p style={styles.emptyText}>Đang tải biên lai mua sản phẩm...</p>
      ) : sales.length === 0 ? (
        <p style={styles.emptyText}>Chưa có biên lai mua sản phẩm quyên góp nào đang chờ xác nhận.</p>
      ) : (
        <div style={styles.contributionCards}>
          {sales.map((sale) => (
            <article key={sale.ma_thanh_toan} style={styles.contributionCard}>
              <img
                src={getAssetUrl(sale.anh_xac_nhan_giao_dich)}
                alt="Biên lai mua sản phẩm quyên góp"
                style={styles.contributionReceipt}
              />
              <div style={styles.contributionBody}>
                <h3 style={styles.eventCardTitle}>{sale.ten_san_pham}</h3>
                <p style={styles.eventCardText}>Sự kiện: {sale.ten_hoat_dong || "-"}</p>
                <p style={styles.eventCardText}>
                  Người mua: {sale.ten_nguoi_mua || "Thành viên"} - {sale.lop_nguoi_mua || "Chưa cập nhật lớp"}
                </p>
                <p style={styles.eventCardText}>
                  Người bán: {sale.ten_nguoi_ban || "Thành viên"} - {sale.lop_nguoi_ban || "Chưa cập nhật lớp"}
                </p>
                <p style={styles.eventCardText}>Số lượng: {sale.so_luong || 1}</p>
                <p style={styles.eventCardText}>Tổng tiền: {formatCurrency(sale.so_tien_giao_dich)}</p>
                <p style={styles.eventCardText}>Vào quỹ: {formatCurrency(sale.so_tien_quyen_gop)}</p>
                <p style={styles.eventCardText}>Nợ người bán: {formatCurrency(sale.so_tien_tra_nguoi_ban)}</p>
                {sale.ghi_chu && <p style={styles.eventCardText}>Ghi chú: {sale.ghi_chu}</p>}
                <button
                  type="button"
                  onClick={() => onConfirmSale(sale)}
                  style={styles.saveButton}
                  disabled={confirmingSaleId === sale.ma_thanh_toan}
                >
                  {confirmingSaleId === sale.ma_thanh_toan ? "Đang xác nhận..." : "Xác nhận biên lai"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrganizationSellerPayouts({
  payouts,
  loading,
  message,
  error,
  confirmingPayoutId,
  onConfirmPayout,
}) {
  return (
    <section style={styles.eventsSection} aria-label="Khoản cần thanh toán cho người bán">
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Khoản cần thanh toán cho người bán</h2>
          <p style={styles.sectionDescription}>Phần còn lại sau khi trích phần trăm quyên góp cho sự kiện.</p>
        </div>
      </div>

      {message && <p style={styles.successMessage}>{message}</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}

      {loading ? (
        <p style={styles.emptyText}>Đang tải khoản cần thanh toán...</p>
      ) : payouts.length === 0 ? (
        <p style={styles.emptyText}>Không có khoản nào đang chờ thanh toán cho người bán.</p>
      ) : (
        <div style={styles.payoutCards}>
          {payouts.map((payout) => (
            <article key={payout.ma_thanh_toan} style={styles.payoutCard}>
              <div style={styles.payoutInfo}>
                <h3 style={styles.eventCardTitle}>{payout.ten_san_pham}</h3>
                <p style={styles.eventCardText}>Sự kiện: {payout.ten_hoat_dong || "-"}</p>
                <p style={styles.eventCardText}>
                  Người bán: {payout.ten_nguoi_ban || "Thành viên"} - {payout.lop_nguoi_ban || "Chưa cập nhật lớp"}
                </p>
                <p style={styles.eventCardText}>Tổng tiền người mua đã chuyển: {formatCurrency(payout.so_tien_giao_dich)}</p>
                <p style={styles.eventCardText}>Phần quyên góp: {formatCurrency(payout.so_tien_quyen_gop)}</p>
                <p style={styles.payoutAmount}>Cần trả người bán: {formatCurrency(payout.so_tien_tra_nguoi_ban)}</p>
                <p style={styles.eventCardText}>Ngân hàng: {payout.ten_ngan_hang || "Chưa cập nhật"}</p>
                <p style={styles.eventCardText}>Số tài khoản: {payout.so_tai_khoan || "Chưa cập nhật"}</p>
                <button
                  type="button"
                  onClick={() => onConfirmPayout(payout)}
                  style={styles.saveButton}
                  disabled={confirmingPayoutId === payout.ma_thanh_toan}
                >
                  {confirmingPayoutId === payout.ma_thanh_toan ? "Đang xác nhận..." : "Xác nhận đã thanh toán"}
                </button>
              </div>
              <div style={styles.payoutQrBox}>
                <img
                  src={getAssetUrl(payout.ma_ngan_hang)}
                  alt="QR cá nhân của người bán"
                  style={styles.payoutQrImage}
                />
              </div>
            </article>
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
          <div>
            <dt>Số tiền tối thiểu</dt>
            <dd>{formatCurrency(event.so_tien_toi_thieu)}</dd>
          </div>
        </dl>
        {event.ma_qr_quyen_gop && (
          <div style={styles.detailQrBox}>
            <h3 style={styles.eventCardTitle}>QR nhận quyên góp</h3>
            <img src={event.ma_qr_quyen_gop} alt="QR nhận quyên góp" style={styles.detailQrImage} />
          </div>
        )}
        <div style={styles.donorListBox}>
          <h3 style={styles.eventCardTitle}>Người đã quyên góp</h3>
          {event.nguoi_quyen_gop?.length ? (
            <ul style={styles.donorList}>
              {event.nguoi_quyen_gop.map((donor, index) => (
                <li key={`${donor.ho_ten}-${donor.lop}-${index}`} style={styles.donorListItem}>
                  <strong>{donor.ho_ten}</strong>
                  <span>{donor.lop || "Chưa cập nhật lớp"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyText}>Chưa có thành viên nào được xác nhận quyên góp.</p>
          )}
        </div>
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
  onQrImageChange,
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

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Mã QR nhận quyên góp</span>
              <div style={styles.eventImageRow}>
                {form.ma_qr_quyen_gop ? (
                  <img
                    src={form.ma_qr_quyen_gop}
                    alt="Mã QR nhận quyên góp"
                    style={styles.qrImagePreview}
                  />
                ) : (
                  <div style={styles.qrImagePlaceholder}>Chưa chọn QR</div>
                )}
                <input type="file" accept="image/*" onChange={onQrImageChange} style={styles.fileInput} />
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

            {form.hinh_thuc_quyen_gop === "nhan_tien_chuyen_khoan" && (
              <EditableField
                label="Số tiền tối thiểu"
                name="so_tien_toi_thieu"
                type="number"
                value={form.so_tien_toi_thieu}
                onChange={onChange}
                placeholder="Ví dụ: 50000"
                required
              />
            )}

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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function getAssetUrl(path) {
  if (!path) return DEFAULT_ORGANIZATION_AVATAR;
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`;
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
    display: "flex",
    flexDirection: "column",
    font: "inherit",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
  },
  eventCardPreview: {
    backgroundColor: "transparent",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    font: "inherit",
    padding: 0,
    textAlign: "left",
    width: "100%",
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
  eventCardActions: {
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    justifyContent: "flex-end",
    padding: 12,
  },
  contributionCards: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  contributionCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    display: "grid",
    gap: 14,
    gridTemplateColumns: "140px minmax(0, 1fr)",
    padding: 14,
  },
  contributionReceipt: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    height: 140,
    objectFit: "contain",
    width: 140,
  },
  contributionBody: {
    alignContent: "start",
    display: "grid",
    gap: 8,
  },
  payoutCards: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  },
  payoutCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(0, 1fr) 180px",
    padding: 14,
  },
  payoutInfo: {
    alignContent: "start",
    display: "grid",
    gap: 8,
  },
  payoutAmount: {
    color: "#047857",
    fontSize: 17,
    fontWeight: 800,
    margin: 0,
  },
  payoutQrBox: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    display: "flex",
    justifyContent: "center",
    minHeight: 180,
    overflow: "hidden",
  },
  payoutQrImage: {
    maxHeight: 220,
    objectFit: "contain",
    width: "100%",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "9px 12px",
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
  detailQrBox: {
    borderTop: "1px solid #e5e7eb",
    display: "grid",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
  },
  detailQrImage: {
    backgroundColor: "#f9fafb",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    maxHeight: 220,
    objectFit: "contain",
    width: "100%",
  },
  donorListBox: {
    borderTop: "1px solid #e5e7eb",
    display: "grid",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
  },
  donorList: {
    display: "grid",
    gap: 8,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  donorListItem: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    padding: "9px 11px",
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
  qrImagePreview: {
    backgroundColor: "#f9fafb",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    height: 180,
    objectFit: "contain",
    width: "100%",
  },
  qrImagePlaceholder: {
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
