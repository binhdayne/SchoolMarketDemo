import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { LuCalendar, LuMessagesSquare, LuPencil, LuUpload, LuUsers, LuX } from "react-icons/lu";
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

function getAssetUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`;
}

function getStatusLabel(status) {
  if (status === "da_duyet" || status === "approved") return "Đã duyệt";
  if (status === "tu_choi" || status === "rejected") return "Từ chối";
  return "Chờ duyệt";
}

function getStatusClass(status) {
  if (status === "da_duyet" || status === "approved") return "approved";
  if (status === "tu_choi" || status === "rejected") return "rejected";
  return "pending";
}

export default function ActivityPostsPage({ token, accountType, onBackHome }) {
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [postSearchTerm, setPostSearchTerm] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [myPostStatusFilter, setMyPostStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canCreate = ["thanh_vien", "to_chuc"].includes(accountType);
  const selectedImagePreview = imagePreview || (!removeExistingImage && existingImage ? getAssetUrl(existingImage) : "");

  const loadPosts = () => {
    setLoading(true);

    axios.get(`${API}/posts`)
      .then((res) => setPosts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải danh sách hoạt động."))
      .finally(() => setLoading(false));
  };

  const loadMyPosts = useCallback(() => {
    if (!token || !canCreate) {
      setMyPosts([]);
      return;
    }

    setLoadingMyPosts(true);

    axios.get(`${API}/posts/my-posts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setMyPosts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải bài đăng của bạn."))
      .finally(() => setLoadingMyPosts(false));
  }, [canCreate, token]);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const filteredPosts = useMemo(() => {
    const keyword = postSearchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesType = postTypeFilter === "all" || post.loai_bai_dang === postTypeFilter;
      const matchesStatus = postStatusFilter === "all" || post.trang_thai === postStatusFilter;
      if (!matchesType) return false;
      if (!matchesStatus) return false;
      if (!keyword) return true;

      return [
        post.tieu_de,
        post.noi_dung,
        post.ho_ten,
        getPostTypeLabel(post.loai_bai_dang),
      ].some((value) => String(value || "").toLowerCase().includes(keyword));
    });
  }, [postSearchTerm, postStatusFilter, postTypeFilter, posts]);

  const filteredMyPosts = useMemo(() => {
    return myPosts.filter((post) => {
      if (myPostStatusFilter === "all") return true;
      return post.trang_thai === myPostStatusFilter;
    });
  }, [myPostStatusFilter, myPosts]);

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
    setMessage("");
    setError("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (file && !file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng file ảnh.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setMessage("");
    setError("");
    event.target.value = "";
  };

  const resetForm = () => {
    setForm(initialForm);
    setImageFile(null);
    setImagePreview("");
    setExistingImage("");
    setRemoveExistingImage(false);
    setEditingPost(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (editingPost && existingImage) {
      setExistingImage("");
      setRemoveExistingImage(true);
    }
  };

  const startEditPost = (post) => {
    setEditingPost(post);
    setForm({
      tieu_de: post.tieu_de || "",
      loai_bai_dang: post.loai_bai_dang || "trao_doi_chia_se",
      noi_dung: post.noi_dung || "",
    });
    setImageFile(null);
    setImagePreview("");
    setExistingImage(post.anh_minh_hoa || "");
    setRemoveExistingImage(false);
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canCreate) {
      setError("Chỉ tài khoản thành viên hoặc tổ chức mới có thể tạo bài đăng hoạt động.");
      return;
    }

    if (!form.tieu_de.trim() || !form.noi_dung.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung bài đăng.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (imageFile) {
        formData.append("anh_minh_hoa", imageFile);
      }
      if (editingPost && removeExistingImage) {
        formData.append("remove_anh_minh_hoa", "1");
      }

      const request = editingPost
        ? axios.put(`${API}/posts/${editingPost.ma_bai_dang}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        : axios.post(`${API}/posts`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await request;

      resetForm();
      setMessage(res.data.message || (editingPost ? "Đã gửi chỉnh sửa bài đăng hoạt động cho admin duyệt." : "Đã gửi bài đăng hoạt động cho admin duyệt."));
      loadPosts();
      loadMyPosts();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu bài đăng hoạt động.");
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
            Thành viên và tổ chức có thể tạo bài kêu gọi tình nguyện, trao đổi kinh nghiệm hoặc chia sẻ thông tin hữu ích.
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
                {canCreate ? (editingPost ? "Chỉnh sửa sẽ hiển thị lại sau khi admin duyệt." : "Bài đăng sẽ hiển thị sau khi admin duyệt.") : "Chức năng tạo bài đăng dành cho tài khoản thành viên và tổ chức."}
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

            <div className="community-field">
              <span className="community-label">Ảnh minh họa (tùy chọn)</span>
              <label className="activity-image-picker" htmlFor="activityPostImage">
                <input
                  id="activityPostImage"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                  disabled={!canCreate}
                />
                {selectedImagePreview ? (
                  <span className="activity-image-preview-wrap">
                    <img src={selectedImagePreview} alt="Xem trước ảnh bài đăng" className="activity-image-preview" />
                    <button
                      type="button"
                      className="activity-remove-image"
                      onClick={(event) => {
                        event.preventDefault();
                        removeImage();
                      }}
                      aria-label="Bỏ ảnh"
                    >
                      <LuX size={16} />
                    </button>
                  </span>
                ) : (
                  <span className="activity-image-placeholder">
                    <LuUpload size={18} /> Chọn ảnh
                  </span>
                )}
              </label>
            </div>

            {message && <p className="community-alert success">{message}</p>}
            {error && <p className="community-alert error">{error}</p>}

            <div className="community-actions">
              {editingPost && (
                <button type="button" className="community-secondary-button" onClick={resetForm} disabled={submitting}>
                  Hủy sửa
                </button>
              )}
              <button type="submit" className="community-primary-button" disabled={!canCreate || submitting}>
                {submitting ? "Đang gửi..." : (editingPost ? "Gửi chỉnh sửa" : "Đăng bài")}
              </button>
            </div>
          </form>

          {canCreate && (
            <div className="my-activity-posts">
              <h4>Bài đăng của tôi</h4>
              <label className="community-field">
                <span className="community-label">Lọc trạng thái</span>
                <select
                  className="community-select"
                  value={myPostStatusFilter}
                  onChange={(event) => setMyPostStatusFilter(event.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="cho_duyet">Chờ duyệt</option>
                  <option value="da_duyet">Đã duyệt</option>
                  <option value="tu_choi">Từ chối</option>
                </select>
              </label>
              {loadingMyPosts ? (
                <p className="community-empty compact">Đang tải bài đăng của bạn...</p>
              ) : myPosts.length === 0 ? (
                <p className="community-empty compact">Bạn chưa có bài đăng hoạt động nào.</p>
              ) : filteredMyPosts.length === 0 ? (
                <p className="community-empty compact">Không có bài đăng phù hợp trạng thái.</p>
              ) : (
                <div className="my-activity-list">
                  {filteredMyPosts.map((post) => (
                    <article key={post.ma_bai_dang} className="my-activity-item">
                      <div>
                        <span className={`activity-status ${getStatusClass(post.trang_thai)}`}>
                          {getStatusLabel(post.trang_thai)}
                        </span>
                        <h5>{post.tieu_de}</h5>
                        <p>{getPostTypeLabel(post.loai_bai_dang)} · {formatDate(post.ngay_dang)}</p>
                        {post.trang_thai === "tu_choi" && post.ly_do_tu_choi && (
                          <p className="activity-rejection-reason">Lý do từ chối: {post.ly_do_tu_choi}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="activity-edit-button"
                        onClick={() => startEditPost(post)}
                        title="Chỉnh sửa bài đăng"
                      >
                        <LuPencil size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="community-panel">
          <div className="community-section-header">
            <div>
              <h3 className="community-section-title">Danh sách hoạt động</h3>
              <p className="community-section-description">{filteredPosts.length} / {posts.length} bài đăng đang hiển thị</p>
            </div>
          </div>

          <div className="community-filter-bar">
            <label className="community-field">
              <span className="community-label">Tìm kiếm</span>
              <input
                className="community-input"
                value={postSearchTerm}
                onChange={(event) => setPostSearchTerm(event.target.value)}
                placeholder="Tiêu đề, nội dung, người đăng..."
              />
            </label>
            <label className="community-field">
              <span className="community-label">Loại bài đăng</span>
              <select
                className="community-select"
                value={postTypeFilter}
                onChange={(event) => setPostTypeFilter(event.target.value)}
              >
                <option value="all">Tất cả loại bài</option>
                {postTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="community-field">
              <span className="community-label">Trạng thái</span>
              <select
                className="community-select"
                value={postStatusFilter}
                onChange={(event) => setPostStatusFilter(event.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="da_duyet">Đã duyệt</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p className="community-empty">Đang tải bài đăng...</p>
          ) : posts.length === 0 ? (
            <p className="community-empty">Chưa có bài đăng hoạt động nào.</p>
          ) : filteredPosts.length === 0 ? (
            <p className="community-empty">Không có bài đăng phù hợp với bộ lọc.</p>
          ) : (
            <div className="activity-list">
              {filteredPosts.map((post) => (
                <article key={post.ma_bai_dang} className="activity-post-card">
                  {post.anh_minh_hoa && (
                    <img
                      src={getAssetUrl(post.anh_minh_hoa)}
                      alt={post.tieu_de || "Ảnh bài đăng hoạt động"}
                      className="activity-post-image"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
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
