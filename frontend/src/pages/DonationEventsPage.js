import React, { useEffect, useState } from "react";
import axios from "axios";
import { LuCalendar, LuClock, LuHeart, LuMapPin } from "react-icons/lu";
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

export default function DonationEventsPage({ onBackHome }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                  src={event.anh_minh_hoa || "/images/school-market-icon-v2.png"}
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
