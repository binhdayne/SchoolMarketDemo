import React, { useEffect, useState } from "react";
import axios from "axios";
import { LuCalendar, LuMessagesSquare, LuUsers } from "react-icons/lu";
import "./CommunityPages.css";

const API = "http://localhost:5000/api";

const initialForm = {
  tieu_de: "",
  loai_bai_dang: "keu_goi_tinh_nguyen",
  noi_dung: "",
};

const postTypeOptions = [
  { value: "keu_goi_tinh_nguyen", label: "Kêu gọi tình nguyện" },
  { value: "trao_doi_chia_se", label: "Trao đổi chia sẻ" },
  { value: "hoi_dap", label: "Hỏi đáp" },
  { value: "khac", label: "Khác" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getPostTypeLabel(type) {
  return postTypeOptions.find((option) => option.value === type)?.label || "Khác";
}

export default function ActivityPostsPage({ token, accountType, onBackHome }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canCreate = accountType === "thanh_vien";

  const loadPosts = () => {
    setLoading(true);

    axios.get(`${API}/posts`)
      .then((res) => setPosts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải danh sách hoạt động."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canCreate) {
      setError("Chỉ tài khoản thành viên mới có thể tạo bài đăng hoạt động.");
      return;
    }

    if (!form.tieu_de.trim() || !form.noi_dung.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung bài đăng.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/posts`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForm(initialForm);
      setMessage(res.data.message || "Đã gửi bài đăng hoạt động cho admin duyệt.");
      loadPosts();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tạo bài đăng hoạt động.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="community-page">
      <section className="community-hero">
        <div>
          <p className="community-kicker">Hoạt động</p>
          <h2 className="community-title">Bài đăng cộng đồng</h2>
          <p className="community-subtitle">
            Thành viên có thể tạo bài kêu gọi tình nguyện, trao đổi kinh nghiệm hoặc chia sẻ thông tin hữu ích.
          </p>
        </div>
        {onBackHome && (
          <button type="button" className="community-secondary-button" onClick={onBackHome}>
            Về trang chủ
          </button>
        )}
      </section>

      <div className="activity-layout">
        <section className="community-panel">
          <div className="community-section-header">
            <div>
              <h3 className="community-section-title">Tạo bài đăng</h3>
              <p className="community-section-description">
                {canCreate ? "Bài đăng sẽ hiển thị sau khi admin duyệt." : "Chức năng tạo bài đăng dành cho tài khoản thành viên."}
              </p>
            </div>
          </div>

          <form className="community-form" onSubmit={handleSubmit}>
            <label className="community-field">
              <span className="community-label">Tiêu đề</span>
              <input
                className="community-input"
                name="tieu_de"
                value={form.tieu_de}
                onChange={handleChange}
                placeholder="Ví dụ: Cần tình nguyện viên hỗ trợ ngày hội sách"
                disabled={!canCreate}
              />
            </label>

            <label className="community-field">
              <span className="community-label">Loại bài đăng</span>
              <select
                className="community-select"
                name="loai_bai_dang"
                value={form.loai_bai_dang}
                onChange={handleChange}
                disabled={!canCreate}
              >
                {postTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="community-field">
              <span className="community-label">Nội dung</span>
              <textarea
                className="community-textarea"
                name="noi_dung"
                value={form.noi_dung}
                onChange={handleChange}
                placeholder="Nhập nội dung kêu gọi, trao đổi hoặc chia sẻ..."
                disabled={!canCreate}
              />
            </label>

            {message && <p className="community-alert success">{message}</p>}
            {error && <p className="community-alert error">{error}</p>}

            <div className="community-actions">
              <button type="submit" className="community-primary-button" disabled={!canCreate || submitting}>
                {submitting ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </form>
        </section>

        <section className="community-panel">
          <div className="community-section-header">
            <div>
              <h3 className="community-section-title">Danh sách hoạt động</h3>
              <p className="community-section-description">{posts.length} bài đăng đang hiển thị</p>
            </div>
          </div>

          {loading ? (
            <p className="community-empty">Đang tải bài đăng...</p>
          ) : posts.length === 0 ? (
            <p className="community-empty">Chưa có bài đăng hoạt động nào.</p>
          ) : (
            <div className="activity-list">
              {posts.map((post) => (
                <article key={post.ma_bai_dang} className="activity-post-card">
                  <div className="activity-post-header">
                    <div>
                      <span className="community-badge">
                        {post.loai_bai_dang === "keu_goi_tinh_nguyen" ? <LuUsers size={14} /> : <LuMessagesSquare size={14} />}
                        {getPostTypeLabel(post.loai_bai_dang)}
                      </span>
                      <h3 className="community-card-title">{post.tieu_de}</h3>
                      <p className="activity-author">{post.ho_ten || "Thành viên"} · {formatDate(post.ngay_dang)}</p>
                    </div>
                    <LuCalendar size={20} color="#6b7280" />
                  </div>
                  <p className="community-card-text">{post.noi_dung}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
