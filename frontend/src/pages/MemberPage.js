import React, { useState, useEffect } from 'react'; // Đã thêm useEffect
import axios from 'axios'; // Đã thêm axios
import './MemberPage.css';
// Thêm 3 icon mới cho danh sách sản phẩm
import { LuPackage, LuCheck, LuHeart, LuPlus, LuEye, LuPencil, LuTrash2, LuCreditCard, LuCalendar, LuPackage2 } from 'react-icons/lu';

const API = 'http://localhost:5000/api';

// Đã thêm prop 'token' vào đây
export default function MemberPage({ user, token, onLogout, navigate }) {
  const [activeTab, setActiveTab] = useState("Sản phẩm của tôi");

  // --- PHẦN THÊM MỚI: State và API ---
  const [stats, setStats] = useState({ spDaDang: 0, daBan: 0, quyenGop: 0 });
  const [myProducts, setMyProducts] = useState([]); // State chứa danh sách sản phẩm
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });

  useEffect(() => {
    if (token) {
      const headers = { 'Authorization': `Bearer ${token}` };

      Promise.all([
        axios.get(`${API}/dashboard/member-stats`, { headers }),
        axios.get(`${API}/products/my-products`, { headers })
      ])
      .then(([statsRes, productsRes]) => {
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];

        setMyProducts(products);
        setStats({
          ...statsRes.data,
          spDaDang: products.length,
          quyenGop: products.filter(product => Number(product.so_phan_tram_quyen_gop || 0) > 0).length
        });
      })
      .catch(err => console.error("Lỗi tải dữ liệu thành viên:", err));
    }
  }, [token]);
  // ------------------------------------

  // Hàm fomat giá tiền VNĐ
  const formatPrice = (price) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  // HÀM XỬ LÝ XÓA SẢN PHẨM
  // Bấm vào nút thùng rác -> Chỉ mở Popup, chưa xóa ngay
  const openDeleteModal = (productId) => {
    setDeleteModal({ isOpen: true, productId: productId });
  };

  // Bấm nút "Xóa" trên Popup -> Tiến hành gọi API
  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/products/${deleteModal.productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Cập nhật lại UI
      const nextProducts = myProducts.filter(product => product.ma_san_pham !== deleteModal.productId);
      setMyProducts(nextProducts);
      setStats(prevStats => ({
        ...prevStats,
        spDaDang: nextProducts.length,
        quyenGop: nextProducts.filter(product => Number(product.so_phan_tram_quyen_gop || 0) > 0).length
      }));

      // Đóng popup
      setDeleteModal({ isOpen: false, productId: null });
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Xóa thất bại: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="member-container">
      {/* 1. Header */}
      <div className="profile-header">
        <div className="user-info">
          <div className="avatar">{user?.ho_ten ? user.ho_ten[0] : "L"}</div>
          <div>
            <h1 style={{margin: 0, fontSize: '20px'}}>{user?.ho_ten || "Lê Thanh Hà"}</h1>
            <p style={{margin: 0, opacity: 0.9, fontSize: '14px'}}>{user?.email || "lethanhhha@gmail.com"}</p>
          </div>
        </div>
      </div>

      {/* 2. Stats Grid - Đảm bảo căn giữa giống Figma */}
      <div className="stats-row">
        {/* Chỉ thay số 0 bằng biến stats, giữ nguyên trên 1 dòng */}
        <div className="stat-item"><LuPackage /> <h3>{stats.spDaDang}</h3><p>Sản phẩm đã đăng</p></div>
        <div className="stat-item"><LuCheck /> <h3>{stats.daBan}</h3><p>Đã bán</p></div>
        <div className="stat-item"><LuHeart /> <h3>{stats.quyenGop}</h3><p>Đã quyên góp</p></div>
      </div>

      {/* 3. Tabs */}
      <div className="tabs-row">
        {[
          { name: "Sản phẩm của tôi", icon: <LuPackage2 size={18} /> },
          { name: "Thanh toán", icon: <LuCreditCard size={18} /> },
          { name: "Hoạt động", icon: <LuCalendar size={18} /> }
        ].map(tab => (
          <button
            key={tab.name}
            className={activeTab === tab.name ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* 4. Content */}
      <div className="content-area">
        <div className="content-header">
          <h2 style={{margin: 0, fontSize: '18px'}}>{activeTab}</h2>
          {/* Nút đăng thêm chỉ hiện ở tab Sản phẩm của tôi */}
          {activeTab === "Sản phẩm của tôi" && (
            <button onClick={() => navigate("post-product")} className="add-btn">
              <LuPlus /> Đăng thêm
            </button>
          )}
        </div>

        {/* CHÈN THÊM ĐOẠN NÀY (POPUP XÓA SẢN PHẨM) */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, color: '#333' }}>Xác nhận xóa</h3>
            <p style={{ color: '#666', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel-btn"
                onClick={() => setDeleteModal({ isOpen: false, productId: null })}
              >
                Hủy
              </button>
              <button
                className="modal-btn confirm-btn"
                onClick={confirmDelete}
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Xử lý hiển thị danh sách sản phẩm hoặc thông báo chưa có dữ liệu */}
        {activeTab === "Sản phẩm của tôi" ? (
          myProducts.length > 0 ? (
            <div className="product-list">
              {myProducts.map(product => (
                <div key={product.ma_san_pham} className="product-card-row">
                  <div className="product-info-group">
                    <img src={product.anh ? `http://localhost:5000${product.anh}` : 'https://via.placeholder.com/80'} alt={product.ten_san_pham} className="product-img-row" />
                    <div className="product-details-row">
                      <h4 className="product-title-row">{product.ten_san_pham}</h4>
                      <div className="product-price-status">
                        <span className={`product-price-row ${product.gia === 0 ? 'free' : ''}`}>{formatPrice(product.gia)}</span>
                        <span className={`status-badge ${
                          product.trang_thai === 'cho_duyet' ? 'pending' :
                          product.trang_thai === 'da_duyet' ? 'approved' : 'rejected'
                        }`}>
                          {product.trang_thai === 'cho_duyet' ? 'Chờ duyệt' :
                          product.trang_thai === 'da_duyet' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                      </div>
                      <span className="product-time">Vừa xong</span>
                    </div>
                  </div>
                  <div className="product-actions-row">
                    <button className="action-icon"><LuEye /></button>
                    <button className="action-icon"><LuPencil /></button>
                    <button className="action-icon delete"
                      onClick={() => openDeleteModal(product.ma_san_pham)}
                    >
                      <LuTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{color: '#666', fontSize: '14px'}}>Chưa có dữ liệu cho Sản phẩm của tôi</p>
          )
        ) : (
          <p style={{color: '#666', fontSize: '14px'}}>Chưa có dữ liệu cho {activeTab}</p>
        )}
      </div>
    </div>
  );
}
