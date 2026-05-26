import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PostProductPage.css';

export default function PostProductPage({ navigate, token }) {
    const [activities, setActivities] = useState([]);
    const [categories, setCategories] = useState([]);
    const [file, setFile] = useState(null);
    const [form, setForm] = useState({
        ten_san_pham: '', gia: '', mo_ta: '', ma_danh_muc: '',
        tinh_trang: 'Như mới', so_luong: 1, so_phan_tram_quyen_gop: 0, ma_hoat_dong: ''
    });

    useEffect(() => {
        // Tải danh mục và hoạt động từ DB
        axios.get('http://localhost:5000/api/products/categories').then(res => setCategories(res.data));
        axios.get('http://localhost:5000/api/campaigns').then(res => setActivities(res.data));
    }, []);

    const handleSubmit = async () => {
        if (!form.ma_danh_muc) return alert("Vui lòng chọn danh mục!");

        const formData = new FormData();
        formData.append('anh', file);
        Object.keys(form).forEach(key => formData.append(key, form[key]));

        try {
            await axios.post('http://localhost:5000/api/products/create', formData, {
                headers: {'Authorization': `Bearer ${token}` }
            });
            alert("Đăng bài thành công!");
            navigate("dashboard");
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="post-product-container">
            <h2 className="page-title">Đăng tin sản phẩm</h2>

            <div className="upload-box" onClick={() => document.getElementById('fileInput').click()}>
                <input id="fileInput" type="file" hidden onChange={e => setFile(e.target.files[0])} />
                <div className="upload-placeholder">
                    <p>{file ? file.name : "📷 Nhấn để chọn ảnh sản phẩm"}</p>
                </div>
            </div>

            <input className="input-field" placeholder="Tên sản phẩm..." onChange={e => setForm({...form, ten_san_pham: e.target.value})} />

            <div className="row-grid">
                <select className="input-field" onChange={e => setForm({...form, ma_danh_muc: e.target.value})}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => <option key={cat.ma_danh_muc} value={cat.ma_danh_muc}>{cat.ten_danh_muc}</option>)}
                </select>
                <select className="input-field" onChange={e => setForm({...form, tinh_trang: e.target.value})}>
                    <option value="Như mới">Như mới</option>
                    <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                </select>
            </div>

            <div className="donation-box">
                <input type="number" className="input-field" placeholder="% Quyên góp" onChange={e => setForm({...form, so_phan_tram_quyen_gop: e.target.value})} />
                <select className="input-field" onChange={e => setForm({...form, ma_hoat_dong: e.target.value})}>
                    <option value="">-- Chọn hoạt động từ thiện (tùy chọn) --</option>
                    {activities.map(act => <option key={act.ma_hoat_dong} value={act.ma_hoat_dong}>{act.ten_hoat_dong}</option>)}
                </select>
            </div>

            <div className="row-grid">
                <input className="input-field" placeholder="Giá bán (đ)" onChange={e => setForm({...form, gia: e.target.value})} />
                <input className="input-field" type="number" placeholder="Số lượng" onChange={e => setForm({...form, so_luong: e.target.value})} />
            </div>

            <textarea className="input-field textarea" placeholder="Mô tả chi tiết..." onChange={e => setForm({...form, mo_ta: e.target.value})} />

            <button className="btn-submit" onClick={handleSubmit}>Đăng tin</button>
        </div>
    );
}