import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './MemberPage.css';
import {
  LuCalendar,
  LuCheck,
  LuCreditCard,
  LuEye,
  LuHeart,
  LuPackage,
  LuPackage2,
  LuPlus,
  LuTrash2,
} from 'react-icons/lu';

const API = 'http://localhost:5000/api';

function getAssetUrl(path) {
  if (!path) return 'https://via.placeholder.com/80';
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith('/') ? path : `/${path}`}`;
}

function getProductStatus(product) {
  if (product.trang_thai === 'cho_duyet') return { className: 'pending', label: 'Chờ duyệt' };
  if (product.trang_thai === 'da_duyet') return { className: 'approved', label: 'Đã duyệt' };
  if (product.trang_thai === 'dang_giao_dich') return { className: 'in-transaction', label: 'Đã có người mua' };
  if (product.trang_thai === 'tu_choi') return { className: 'rejected', label: 'Từ chối' };
  return { className: 'pending', label: product.trang_thai || 'Chưa cập nhật' };
}

export default function MemberPage({ user, token, navigate }) {
  const [activeTab, setActiveTab] = useState('Sản phẩm của tôi');
  const [stats, setStats] = useState({ spDaDang: 0, daBan: 0, quyenGop: 0 });
  const [myProducts, setMyProducts] = useState([]);
  const [memberProfile, setMemberProfile] = useState(user || {});
  const [notice, setNotice] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  const [processingPaymentId, setProcessingPaymentId] = useState(null);

  const loadMemberData = useCallback(async () => {
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, productsRes, profileRes] = await Promise.all([
        axios.get(`${API}/dashboard/member-stats`, { headers }),
        axios.get(`${API}/products/my-products`, { headers }),
        axios.get(`${API}/auth/member-profile`, { headers }),
      ]);

      const products = Array.isArray(productsRes.data) ? productsRes.data : [];

      setMyProducts(products);
      setMemberProfile(profileRes.data?.user || {});
      setStats({
        ...statsRes.data,
        spDaDang: products.length,
        quyenGop: products.filter((product) => Number(product.so_phan_tram_quyen_gop || 0) > 0).length,
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu thành viên:', err);
      setNotice(err.response?.data?.error || err.response?.data?.message || 'Không thể tải dữ liệu thành viên.');
    }
  }, [token]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  const formatPrice = (price) => {
    if (!price || Number(price) === 0) return 'Miễn phí';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  };

  const hasBankQr = Boolean(String(memberProfile?.ma_ngan_hang || user?.ma_ngan_hang || '').trim());

  const handleAddProduct = () => {
    setNotice('');

    if (!hasBankQr) {
      setNotice('Bạn cần cập nhật mã ngân hàng/QR nhận tiền trước khi đăng bán sản phẩm.');
      return;
    }

    navigate('post-product');
  };

  const openDeleteModal = (productId) => {
    setDeleteModal({ isOpen: true, productId });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/products/${deleteModal.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const nextProducts = myProducts.filter((product) => product.ma_san_pham !== deleteModal.productId);
      setMyProducts(nextProducts);
      setStats((prevStats) => ({
        ...prevStats,
        spDaDang: nextProducts.length,
        quyenGop: nextProducts.filter((product) => Number(product.so_phan_tram_quyen_gop || 0) > 0).length,
      }));
      setDeleteModal({ isOpen: false, productId: null });
      setNotice('Đã xóa sản phẩm.');
    } catch (err) {
      setNotice(`Xóa thất bại: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSellerDecision = async (product, action) => {
    if (!product.ma_thanh_toan) return;

    const isConfirm = action === 'confirm';
    const ok = window.confirm(
      isConfirm
        ? 'Xác nhận đã nhận tiền và xóa hẳn sản phẩm khỏi hệ thống?'
        : 'Từ chối giao dịch và hiện lại sản phẩm trên trang chủ?'
    );

    if (!ok) return;

    setProcessingPaymentId(product.ma_thanh_toan);
    setNotice('');

    try {
      const endpoint = isConfirm ? 'confirm' : 'reject';
      const res = await axios.put(`${API}/products/purchases/${product.ma_thanh_toan}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotice(res.data.message || 'Đã cập nhật giao dịch.');
      await loadMemberData();
    } catch (err) {
      setNotice(err.response?.data?.error || 'Không thể xử lý giao dịch.');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  return (
    <div className="member-container">
      <div className="profile-header">
        <div className="user-info">
          <div className="avatar">{user?.ho_ten ? user.ho_ten[0] : 'T'}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>{user?.ho_ten || 'Thành viên'}</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><LuPackage /> <h3>{stats.spDaDang}</h3><p>Sản phẩm đã đăng</p></div>
        <div className="stat-item"><LuCheck /> <h3>{stats.daBan}</h3><p>Đã bán</p></div>
        <div className="stat-item"><LuHeart /> <h3>{stats.quyenGop}</h3><p>Đã quyên góp</p></div>
      </div>

      <div className="tabs-row">
        {[
          { name: 'Sản phẩm của tôi', icon: <LuPackage2 size={18} /> },
          { name: 'Thanh toán', icon: <LuCreditCard size={18} /> },
          { name: 'Hoạt động', icon: <LuCalendar size={18} /> },
        ].map((tab) => (
          <button
            key={tab.name}
            className={activeTab === tab.name ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      <div className="content-area">
        <div className="content-header">
          <h2 style={{ margin: 0, fontSize: '18px' }}>{activeTab}</h2>
          {activeTab === 'Sản phẩm của tôi' && (
            <button onClick={handleAddProduct} className="add-btn">
              <LuPlus /> Đăng thêm
            </button>
          )}
        </div>

        {notice && <p className="member-notice">{notice}</p>}

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
                <button className="modal-btn confirm-btn" onClick={confirmDelete}>
                  Xóa sản phẩm
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Sản phẩm của tôi' ? (
          myProducts.length > 0 ? (
            <div className="product-list">
              {myProducts.map((product) => {
                const status = getProductStatus(product);
                const hasBuyer = product.trang_thai === 'dang_giao_dich' && product.ma_thanh_toan;

                return (
                  <div key={product.ma_san_pham} className="product-card-row">
                    <div className="product-main-row">
                      <div className="product-info-group">
                        <img
                          src={getAssetUrl(product.anh)}
                          alt={product.ten_san_pham}
                          className="product-img-row"
                        />
                        <div className="product-details-row">
                          <h4 className="product-title-row">{product.ten_san_pham}</h4>
                          <div className="product-price-status">
                            <span className={`product-price-row ${Number(product.gia) === 0 ? 'free' : ''}`}>
                              {formatPrice(product.gia)}
                            </span>
                            <span className={`status-badge ${status.className}`}>{status.label}</span>
                          </div>
                          <span className="product-time">{product.ten_danh_muc || 'Chưa phân loại'}</span>
                        </div>
                      </div>

                      <div className="product-actions-row">
                        {hasBuyer && product.anh_xac_nhan_giao_dich && (
                          <a
                            className="action-icon"
                            href={getAssetUrl(product.anh_xac_nhan_giao_dich)}
                            target="_blank"
                            rel="noreferrer"
                            title="Xem biên lai"
                          >
                            <LuEye />
                          </a>
                        )}
                        {!hasBuyer && (
                          <button
                            className="action-icon delete"
                            onClick={() => openDeleteModal(product.ma_san_pham)}
                            title="Xóa sản phẩm"
                          >
                            <LuTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {hasBuyer && (
                      <div className="buyer-panel">
                        <div className="buyer-info">
                          <strong>Người mua:</strong> {product.ten_nguoi_mua || 'Thành viên'}
                          <span>SĐT: {product.sdt_nguoi_mua || 'Chưa cập nhật'}</span>
                          <span>Email: {product.email_nguoi_mua || 'Chưa cập nhật'}</span>
                        </div>
                        {product.anh_xac_nhan_giao_dich && (
                          <img
                            className="receipt-preview"
                            src={getAssetUrl(product.anh_xac_nhan_giao_dich)}
                            alt="Biên lai người mua"
                          />
                        )}
                        <div className="seller-decision-actions">
                          <button
                            type="button"
                            className="seller-confirm-btn"
                            disabled={processingPaymentId === product.ma_thanh_toan}
                            onClick={() => handleSellerDecision(product, 'confirm')}
                          >
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            className="seller-reject-btn"
                            disabled={processingPaymentId === product.ma_thanh_toan}
                            onClick={() => handleSellerDecision(product, 'reject')}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu cho Sản phẩm của tôi</p>
          )
        ) : (
          <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu cho {activeTab}</p>
        )}
      </div>
    </div>
  );
}
