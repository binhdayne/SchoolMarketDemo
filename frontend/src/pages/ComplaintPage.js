import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { LuFlag, LuImagePlus, LuSend, LuX } from "react-icons/lu";
import "./CommunityPages.css";

const API = "http://localhost:5000/api";

export default function ComplaintPage({ token, onBackHome }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [imageFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setMessage("");
    setError("");

    if (file && !file.type.startsWith("image/")) {
      setImageFile(null);
      setError("Vui lòng chọn đúng file ảnh.");
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!content.trim()) {
      setError("Vui lòng nhập nội dung tố cáo khiếu nại.");
      return;
    }

    if (!imageFile) {
      setError("Vui lòng tải lên ảnh minh chứng.");
      return;
    }

    const formData = new FormData();
    formData.append("noi_dung", content.trim());
    formData.append("image", imageFile);

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/complaints`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setContent("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(res.data.message || "Đã gửi tố cáo khiếu nại tới admin.");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Không thể gửi tố cáo khiếu nại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="community-page complaint-page">
      <section className="community-hero">
        <div>
          <p className="community-kicker">Tố cáo khiếu nại</p>
          <h2 className="community-title">Gửi phản ánh tới admin</h2>
          <p className="community-subtitle">
            Tải ảnh minh chứng và mô tả rõ nội dung cần admin kiểm tra.
          </p>
        </div>
        {onBackHome && (
          <button type="button" className="community-secondary-button" onClick={onBackHome}>
            Về trang chủ
          </button>
        )}
      </section>

      <section className="community-panel complaint-panel">
        <div className="community-section-header">
          <div>
            <h3 className="community-section-title">
              <LuFlag size={20} /> Nội dung phản ánh
            </h3>
            <p className="community-section-description">
              Thông tin này sẽ được gửi riêng tới admin để xem xét.
            </p>
          </div>
        </div>

        <form className="community-form" onSubmit={handleSubmit}>
          <div className="community-field">
            <span className="community-label">Ảnh minh chứng</span>
            <input
              id="complaint-image"
              ref={fileInputRef}
              className="complaint-file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <label className="complaint-upload-box" htmlFor="complaint-image">
              {previewUrl ? (
                <span className="complaint-preview-wrap">
                  <img src={previewUrl} alt="Ảnh minh chứng" className="complaint-preview" />
                  <button
                    type="button"
                    className="complaint-remove-image"
                    aria-label="Xóa ảnh"
                    onClick={(event) => {
                      event.preventDefault();
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <LuX size={18} />
                  </button>
                </span>
              ) : (
                <span className="complaint-upload-placeholder">
                  <LuImagePlus size={26} />
                  <span>Chọn ảnh minh chứng</span>
                </span>
              )}
            </label>
          </div>

          <label className="community-field">
            <span className="community-label">Nội dung</span>
            <textarea
              className="community-textarea"
              rows={7}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setMessage("");
                setError("");
              }}
              placeholder="Nhập nội dung tố cáo, khiếu nại hoặc vấn đề cần admin xử lý..."
            />
          </label>

          {message && <p className="community-alert success">{message}</p>}
          {error && <p className="community-alert error">{error}</p>}

          <div className="community-actions">
            <button type="submit" className="community-primary-button" disabled={submitting}>
              <LuSend size={17} /> {submitting ? "Đang gửi..." : "Gửi admin"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
