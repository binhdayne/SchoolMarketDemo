import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PostProductPage.css';

const API = 'http://localhost:5000/api';

export default function PostProductPage({ navigate, token }) {
    const [categories, setCategories] = useState([]);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        ten_san_pham: '', gia: '', mo_ta: '', ma_danh_muc: '',
        tinh_trang: 'Như mới', so_luong: 1
    });

    useEffect(() => {
        axios.get(`${API}/products/categories`)
            .then(res => setCategories(res.data))
            .catch(() => setError('Không thể tải danh mục sản phẩm. Hãy kiểm tra backend đang chạy bản mới nhất.'));

    }, []);

    useEffect(() => {
        if (!file) {
            setPreviewUrl('');
            return undefined;
        }

        const nextPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(nextPreviewUrl);

        return () => URL.revokeObjectURL(nextPreviewUrl);
    }, [file]);

    const handleSubmit = async () => {
        setError('');
        setMessage('');

        if (!token) {
            setError('Bạn cần đăng nhập để đăng sản phẩm.');
            return;
        }

        if (!form.ma_danh_muc) {
            setError('Vui lòng chọn danh mục.');
            return;
        }

        if (!form.ten_san_pham.trim()) {
            setError('Vui lòng nhập tên sản phẩm.');
            return;
        }

        const formData = new FormData();
        if (file) {
            formData.append('anh', file);
        }
        Object.keys(form).forEach(key => formData.append(key, form[key]));
        formData.append('so_phan_tram_quyen_gop', '0');
        formData.append('ma_hoat_dong', '');

        setSubmitting(true);

        try {
            const res = await axios.post(`${API}/products/create`, formData, {
                headers: {'Authorization': `Bearer ${token}` }
            });
            setMessage(res.data.message || 'Đã gửi bài đăng cho admin duyệt.');
            navigate("dashboard");
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể đăng sản phẩm. Hãy kiểm tra backend và thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="post-product-container">
            <div className="post-product-header">
                <h2 className="page-title">Đăng tin sản phẩm</h2>
            </div>

            {message && <p className="form-alert success">{message}</p>}
            {error && <p className="form-alert error">{error}</p>}

            <div className="form-field">
                <label className="field-label" htmlFor="fileInput">Ảnh sản phẩm</label>
                <div className="upload-box" onClick={() => document.getElementById('fileInput').click()}>
                    <input id="fileInput" type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0])} />
                    <div className="upload-placeholder">
                        {previewUrl ? (
                            <img className="image-preview" src={previewUrl} alt="Xem trước ảnh sản phẩm" />
                        ) : (
                            <p>📷 Nhấn để chọn ảnh sản phẩm</p>
                        )}
                    </div>
                </div>
                {file && <span className="file-name">{file.name}</span>}
            </div>

            <label className="form-field" htmlFor="ten_san_pham">
                <span className="field-label">Tên sản phẩm</span>
                <input id="ten_san_pham" className="input-field" placeholder="Nhập tên sản phẩm..." value={form.ten_san_pham} onChange={e => setForm({...form, ten_san_pham: e.target.value})} />
            </label>

            <div className="row-grid">
                <label className="form-field" htmlFor="ma_danh_muc">
                    <span className="field-label">Danh mục</span>
                    <select id="ma_danh_muc" className="input-field" value={form.ma_danh_muc} onChange={e => setForm({...form, ma_danh_muc: e.target.value})}>
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(cat => <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>)}
                    </select>
                </label>
                <label className="form-field" htmlFor="tinh_trang">
                    <span className="field-label">Tình trạng</span>
                    <select id="tinh_trang" className="input-field" value={form.tinh_trang} onChange={e => setForm({...form, tinh_trang: e.target.value})}>
                        <option value="Như mới">Như mới</option>
                        <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                    </select>
                </label>
            </div>

            <div className="row-grid">
                <label className="form-field" htmlFor="gia">
                    <span className="field-label">Giá bán (đ)</span>
                    <input id="gia" className="input-field" placeholder="Nhập giá bán" value={form.gia} onChange={e => setForm({...form, gia: e.target.value})} />
                </label>
                <label className="form-field" htmlFor="so_luong">
                    <span className="field-label">Số lượng</span>
                    <input id="so_luong" className="input-field" type="number" min="1" placeholder="Số lượng" value={form.so_luong} onChange={e => setForm({...form, so_luong: e.target.value})} />
                </label>
            </div>

            <label className="form-field" htmlFor="mo_ta">
                <span className="field-label">Mô tả chi tiết</span>
                <textarea id="mo_ta" className="input-field textarea" placeholder="Nhập mô tả chi tiết..." value={form.mo_ta} onChange={e => setForm({...form, mo_ta: e.target.value})} />
            </label>

            <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi admin duyệt'}
            </button>
        </div>
    );
}
