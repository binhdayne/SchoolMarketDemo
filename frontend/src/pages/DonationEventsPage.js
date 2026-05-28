import React, { useEffect, useState } from "react";
import axios from "axios";
import { LuArrowLeft, LuCalendar, LuClock, LuHeart, LuMapPin, LuUpload } from "react-icons/lu";
import "./CommunityPages.css";

const API = "http://localhost:5000/api";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getDonationTypeLabel(type) {
  if (type === "nhan_tien_chuyen_khoan") return "Nhận tiền chuyển khoản";
  if (type === "ban_do_quyen_gop") return "Bán đồ quyên góp";
  if (type === "nhan_do_vat") return "Nhận đồ vật";
  return type || "Chưa cập nhật";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function getAssetUrl(path) {
  if (!path) return "/images/school-market-icon-v2.png";
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`;
}

function isTransferEvent(event) {
  return event.hinh_thuc_quyen_gop === "nhan_tien_chuyen_khoan";
}

function canJoinTransferEvent(event) {
  return isTransferEvent(event) && Boolean(event.ma_qr_quyen_gop) && Number(event.so_tien_toi_thieu || 0) > 0;
}

function DonorList({ donors }) {
  return (
    <div className="donor-list-box">
      <h4>Người đã quyên góp</h4>
      {donors.length === 0 ? (
        <p>Chưa có thành viên nào được xác nhận quyên góp.</p>
      ) : (
        <ul className="donor-list">
          {donors.map((donor, index) => (
            <li key={`${donor.ho_ten}-${donor.lop}-${index}`}>
              <strong>{donor.ho_ten}</strong>
              <span>{donor.lop || "Chưa cập nhật lớp"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DonationEventsPage({ token, accountType, onBackHome, onLoginRequired }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contributionMessage, setContributionMessage] = useState("");
  const [contributionError, setContributionError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    axios.get(`${API}/campaigns`)
      .then((res) => {
        if (mounted) setEvents(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || "Không thể tải danh sách sự kiện quyên góp.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!receipt) {
      setReceiptPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(receipt);
    setReceiptPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receipt]);

  const openContributionPage = (event) => {
    if (!canJoinTransferEvent(event)) return;

    if (!token) {
      onLoginRequired?.();
      return;
    }

    if (accountType !== "thanh_vien") {
      setError("Chỉ thành viên mới có thể tham gia quyên góp.");
      return;
    }

    setSelectedEvent(event);
    setAmount(String(Number(event.so_tien_toi_thieu || 0)));
    setReceipt(null);
    setNote("");
    setContributionMessage("");
    setContributionError("");
  };

  const closeContributionPage = () => {
    setSelectedEvent(null);
    setReceipt(null);
    setReceiptPreview("");
    setAmount("");
    setNote("");
    setContributionMessage("");
    setContributionError("");
  };

  const submitContribution = async () => {
    setContributionMessage("");
    setContributionError("");

    if (!selectedEvent) return;

    if (!receipt) {
      setContributionError("Vui lòng tải lên biên lai chuyển khoản.");
      return;
    }

    const numericAmount = Number(amount || 0);
    const minimumAmount = Number(selectedEvent.so_tien_toi_thieu || 0);
    if (!Number.isFinite(numericAmount) || numericAmount < minimumAmount) {
      setContributionError(`Số tiền tối thiểu là ${formatCurrency(minimumAmount)}.`);
      return;
    }

    const formData = new FormData();
    formData.append("receipt", receipt);
    formData.append("so_tien", String(numericAmount));
    formData.append("ghi_chu", note);

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/campaigns/${selectedEvent.ma_hoat_dong}/contributions`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContributionMessage(res.data.message || "Đã gửi biên lai cho tổ chức xác nhận.");
      setReceipt(null);
      setNote("");
    } catch (err) {
      setContributionError(err.response?.data?.message || "Không thể gửi biên lai quyên góp.");
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedEvent) {
    return (
      <main className="community-page">
        <section className="community-hero">
          <div>
            <p className="community-kicker">Tham gia quyên góp</p>
            <h2 className="community-title">{selectedEvent.ten_hoat_dong}</h2>
            <p className="community-subtitle">{selectedEvent.mo_ta || "Chưa có mô tả."}</p>
          </div>
          <button type="button" className="community-secondary-button" onClick={closeContributionPage}>
            <LuArrowLeft size={16} /> Danh sách sự kiện
          </button>
        </section>

        <section className="community-panel contribution-layout">
          <div className="contribution-event">
            <img
              src={getAssetUrl(selectedEvent.anh_minh_hoa)}
              alt={selectedEvent.ten_hoat_dong || "Sự kiện quyên góp"}
              className="community-card-image"
            />
            <div className="community-card-body">
              <span className="community-badge"><LuHeart size={14} /> {getDonationTypeLabel(selectedEvent.hinh_thuc_quyen_gop)}</span>
              <div className="community-meta">
                <span><LuMapPin size={15} /> {selectedEvent.dia_diem || "Chưa cập nhật địa điểm"}</span>
                <span><LuCalendar size={15} /> Ngày tổ chức: {formatDate(selectedEvent.ngay_to_chuc)}</span>
                <span><LuClock size={15} /> Hạn kết thúc: {formatDate(selectedEvent.han_ket_thuc)}</span>
                <span>Tổ chức: {selectedEvent.ten_to_chuc || "-"}</span>
              </div>

              <DonorList donors={selectedEvent.nguoi_quyen_gop || []} />
            </div>
          </div>

          <aside className="contribution-payment">
            <h3>Thông tin chuyển khoản</h3>
            <div className="event-qr-box">
              <img src={getAssetUrl(selectedEvent.ma_qr_quyen_gop)} alt="QR quyên góp sự kiện" />
            </div>
            <div className="contribution-summary">
              <span>Số tiền tối thiểu</span>
              <strong>{formatCurrency(selectedEvent.so_tien_toi_thieu)}</strong>
            </div>

            {contributionMessage && <p className="community-alert success">{contributionMessage}</p>}
            {contributionError && <p className="community-alert error">{contributionError}</p>}

            <label className="community-field">
              <span className="community-label">Số tiền đã chuyển</span>
              <input
                className="community-input"
                type="number"
                min={Number(selectedEvent.so_tien_toi_thieu || 0)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={Boolean(contributionMessage)}
              />
            </label>

            <label className="receipt-uploader" htmlFor="eventReceiptInput">
              <input
                id="eventReceiptInput"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setReceipt(event.target.files?.[0] || null)}
                disabled={Boolean(contributionMessage)}
              />
              {receiptPreview ? (
                <img src={receiptPreview} alt="Biên lai chuyển khoản" />
              ) : (
                <span><LuUpload size={18} /> Tải lên biên lai chuyển khoản</span>
              )}
            </label>

            <textarea
              className="community-textarea"
              placeholder="Ghi chú cho tổ chức nếu cần..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={Boolean(contributionMessage)}
            />

            <button
              type="button"
              className="community-primary-button"
              onClick={submitContribution}
              disabled={submitting || Boolean(contributionMessage)}
            >
              {submitting ? "Đang gửi..." : "Gửi biên lai xác nhận"}
            </button>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="community-page">
      <section className="community-hero">
        <div>
          <p className="community-kicker">Quyên góp</p>
          <h2 className="community-title">Sự kiện từ các tổ chức</h2>
          <p className="community-subtitle">
            Danh sách sự kiện quyên góp đã được admin duyệt và đang hiển thị công khai.
          </p>
        </div>
        {onBackHome && (
          <button type="button" className="community-secondary-button" onClick={onBackHome}>
            Về trang chủ
          </button>
        )}
      </section>

      <section className="community-panel">
        <div className="community-section-header">
          <div>
            <h3 className="community-section-title">Danh sách sự kiện</h3>
            <p className="community-section-description">{events.length} sự kiện đang hiển thị</p>
          </div>
        </div>

        {loading ? (
          <p className="community-empty">Đang tải sự kiện...</p>
        ) : error ? (
          <p className="community-alert error">{error}</p>
        ) : events.length === 0 ? (
          <p className="community-empty">Chưa có sự kiện quyên góp nào được duyệt.</p>
        ) : (
          <div className="community-grid">
            {events.map((event) => (
              <article key={event.ma_hoat_dong} className="community-card">
                <img
                  src={getAssetUrl(event.anh_minh_hoa)}
                  alt={event.ten_hoat_dong || "Sự kiện quyên góp"}
                  className="community-card-image"
                  onError={(imageEvent) => {
                    imageEvent.currentTarget.onerror = null;
                    imageEvent.currentTarget.src = "/images/school-market-icon-v2.png";
                  }}
                />
                <div className="community-card-body">
                  <span className="community-badge"><LuHeart size={14} /> {getDonationTypeLabel(event.hinh_thuc_quyen_gop)}</span>
                  <h3 className="community-card-title">{event.ten_hoat_dong}</h3>
                  <p className="community-card-text">{event.mo_ta || "Chưa có mô tả."}</p>
                  <div className="community-meta">
                    <span><LuMapPin size={15} /> {event.dia_diem || "Chưa cập nhật địa điểm"}</span>
                    <span><LuCalendar size={15} /> Ngày tổ chức: {formatDate(event.ngay_to_chuc)}</span>
                    <span><LuClock size={15} /> Hạn kết thúc: {formatDate(event.han_ket_thuc)}</span>
                    <span>Tổ chức: {event.ten_to_chuc || "-"}</span>
                  </div>
                  {isTransferEvent(event) && (
                    <div className="contribution-summary inline">
                      <span>Số tiền tối thiểu</span>
                      <strong>{formatCurrency(event.so_tien_toi_thieu)}</strong>
                    </div>
                  )}
                  <DonorList donors={event.nguoi_quyen_gop || []} />
                  <button
                    type="button"
                    className="community-primary-button"
                    onClick={() => openContributionPage(event)}
                    disabled={!canJoinTransferEvent(event) || (Boolean(token) && accountType !== "thanh_vien")}
                  >
                    {!isTransferEvent(event)
                      ? "Chưa hỗ trợ"
                      : !canJoinTransferEvent(event)
                        ? "Chưa sẵn sàng"
                      : token && accountType !== "thanh_vien"
                        ? "Chỉ thành viên"
                        : token
                          ? "Tham gia"
                          : "Đăng nhập để tham gia"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
