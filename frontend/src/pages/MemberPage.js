import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './MemberPage.css';
import {
  LuBuilding2,
  LuCheck,
  LuCreditCard,
  LuEye,
  LuHeart,
  LuPackage,
  LuPackage2,
  LuPencil,
  LuPlus,
  LuReceiptText,
  LuTrash2,
  LuUpload,
} from 'react-icons/lu';

const API = 'http://localhost:5000/api';

function getAssetUrl(path) {
  if (!path) return 'https://via.placeholder.com/80';
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith('/') ? path : `/${path}`}`;
}

function getProductStatus(product) {
  if (product.ma_thanh_toan) return { className: 'in-transaction', label: 'Chờ xác nhận' };
  if (product.trang_thai === 'cho_duyet') return { className: 'pending', label: 'Chờ duyệt' };
  if (product.trang_thai === 'da_duyet') return { className: 'approved', label: 'Đã duyệt' };
  if (product.trang_thai === 'dang_giao_dich') return { className: 'in-transaction', label: 'Đã có người mua' };
  if (product.trang_thai === 'tu_choi') return { className: 'rejected', label: 'Từ chối' };
  return { className: 'pending', label: product.trang_thai || 'Chưa cập nhật' };
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getSystemFeeAmount(payment) {
  const storedFee = Number(payment.phi_he_thong || 0);
  if (storedFee > 0) return storedFee;
  return Math.round(Number(payment.so_tien_giao_dich || 0) * 0.05);
}

function canEditPersonalProduct(product, hasBuyer) {
  return !hasBuyer && !product.ma_hoat_dong && product.trang_thai !== 'dang_giao_dich';
}

function MemberPaymentTab({
  loading,
  systemFees,
  organizationDebts,
  systemFeeReceipt,
  submittingSystemFee,
  onReceiptChange,
  onSubmitSystemFee,
}) {
  const systemFeeTotal = systemFees.reduce((total, payment) => total + getSystemFeeAmount(payment), 0);
  const organizationDebtTotal = organizationDebts.reduce(
    (total, debt) => total + Number(debt.so_tien_tra_nguoi_ban || 0),
    0
  );

  return (
    <div className="payment-grid">
      <section className="payment-panel">
        <div className="payment-panel-heading">
          <span className="payment-panel-icon"><LuReceiptText size={20} /></span>
          <div>
            <h3>Tiền cần thanh toán cho hệ thống</h3>
            <p>Phí hệ thống 5% chỉ tính sau khi bạn xác nhận đã nhận tiền từ người mua.</p>
          </div>
        </div>

        <div className="payment-total-row">
          <span>Tổng cần nộp</span>
          <strong>{formatCurrency(systemFeeTotal)}</strong>
        </div>
        <p className="payment-due-note">Hạn nộp: ngày 30 hàng tháng</p>

        {loading ? (
          <p className="payment-empty">Đang tải dữ liệu thanh toán...</p>
        ) : systemFees.length === 0 ? (
          <p className="payment-empty">Không có khoản phí hệ thống nào cần nộp.</p>
        ) : (
          <div className="payment-list">
            {systemFees.map((payment) => (
              <article className="payment-item" key={payment.ma_thanh_toan}>
                <div>
                  <h4>{payment.ten_san_pham || 'Sản phẩm'}</h4>
                  <p>
                    {payment.so_luong || 1} sản phẩm - Doanh thu {formatCurrency(payment.so_tien_giao_dich)}
                  </p>
                  <p>Phí hệ thống 5%: {formatCurrency(getSystemFeeAmount(payment))}</p>
                </div>
                <span>{payment.ngay_gui ? formatDate(payment.ngay_gui) : '-'}</span>
              </article>
            ))}
          </div>
        )}

        {systemFees.length > 0 && (
          <form className="system-fee-form" onSubmit={onSubmitSystemFee}>
            <label className="system-fee-upload">
              <span>Biên lai nộp phí</span>
              <input type="file" accept="image/*" onChange={onReceiptChange} />
            </label>
            {systemFeeReceipt && <p className="selected-receipt">{systemFeeReceipt.name}</p>}
            <button type="submit" className="seller-confirm-btn" disabled={submittingSystemFee || !systemFeeReceipt}>
              <LuUpload size={16} /> {submittingSystemFee ? 'Đang nộp...' : 'Nộp biên lai'}
            </button>
          </form>
        )}
      </section>

      <section className="payment-panel">
        <div className="payment-panel-heading">
          <span className="payment-panel-icon organization"><LuBuilding2 size={20} /></span>
          <div>
            <h3>Tiền tổ chức còn nợ</h3>
            <p>Phần còn lại tổ chức phải trả cho bạn sau khi trích tỷ lệ quyên góp.</p>
          </div>
        </div>

        <div className="payment-total-row organization">
          <span>Tổng tổ chức nợ</span>
          <strong>{formatCurrency(organizationDebtTotal)}</strong>
        </div>
        <p className="payment-due-note">Hạn tổ chức phải trả: ngày kết thúc sự kiện</p>

        {loading ? (
          <p className="payment-empty">Đang tải khoản tổ chức nợ...</p>
        ) : organizationDebts.length === 0 ? (
          <p className="payment-empty">Không có khoản tổ chức nợ nào đang chờ thanh toán.</p>
        ) : (
          <div className="payment-list">
            {organizationDebts.map((debt) => (
              <article className="payment-item" key={debt.ma_thanh_toan}>
                <div>
                  <h4>{debt.ten_san_pham || 'Sản phẩm quyên góp'}</h4>
                  <p>{debt.ten_to_chuc || 'Tổ chức'} - {debt.ten_hoat_dong || 'Sự kiện quyên góp'}</p>
                  <p>
                    Quyên góp {Number(debt.so_phan_tram_quyen_gop || 0)}%,
                    tổ chức nợ {formatCurrency(debt.so_tien_tra_nguoi_ban)}
                  </p>
                  <p>Tổng tiền người mua: {formatCurrency(debt.so_tien_giao_dich)}</p>
                </div>
                <span>Hạn: {formatDate(debt.han_ket_thuc)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MemberPage({ user, token, navigate }) {
  const [activeTab, setActiveTab] = useState('Sản phẩm của tôi');
  const [stats, setStats] = useState({ spDaDang: 0, daBan: 0, quyenGop: 0 });
  const [myProducts, setMyProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [memberProfile, setMemberProfile] = useState(user || {});
  const [paymentSummary, setPaymentSummary] = useState({ systemFees: [], organizationDebts: [] });
  const [categories, setCategories] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [systemFeeReceipt, setSystemFeeReceipt] = useState(null);
  const [submittingSystemFee, setSubmittingSystemFee] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  const [editModal, setEditModal] = useState({ isOpen: false, product: null });
  const [editForm, setEditForm] = useState({
    ten_san_pham: '',
    gia: '',
    mo_ta: '',
    ma_danh_muc: '',
    tinh_trang: '',
    so_luong: 1,
    anh: '',
  });
  const [editFile, setEditFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);

  const loadMemberData = useCallback(async () => {
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    setLoadingPayments(true);

    try {
      const [statsRes, productsRes, profileRes, paymentRes] = await Promise.all([
        axios.get(`${API}/dashboard/member-stats`, { headers }),
        axios.get(`${API}/products/my-products`, { headers }),
        axios.get(`${API}/auth/member-profile`, { headers }),
        axios.get(`${API}/products/member-payment-summary`, { headers }),
      ]);

      const products = Array.isArray(productsRes.data) ? productsRes.data : [];
      const nextPaymentSummary = paymentRes.data || {};

      setMyProducts(products);
      setMemberProfile(profileRes.data?.user || {});
      setPaymentSummary({
        systemFees: Array.isArray(nextPaymentSummary.systemFees) ? nextPaymentSummary.systemFees : [],
        organizationDebts: Array.isArray(nextPaymentSummary.organizationDebts) ? nextPaymentSummary.organizationDebts : [],
      });
      setStats({
        ...statsRes.data,
        spDaDang: products.length,
        quyenGop: products.filter((product) => Number(product.so_phan_tram_quyen_gop || 0) > 0).length,
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu thành viên:', err);
      setNotice(err.response?.data?.error || err.response?.data?.message || 'Không thể tải dữ liệu thành viên.');
    } finally {
      setLoadingPayments(false);
    }
  }, [token]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  useEffect(() => {
    axios.get(`${API}/products/categories`)
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotice('Không thể tải danh mục sản phẩm.'));
  }, []);

  useEffect(() => {
    if (!editFile) {
      setEditPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(editFile);
    setEditPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [editFile]);

  const formatPrice = (price) => {
    if (!price || Number(price) === 0) return 'Miễn phí';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  };

  const hasBankQr = Boolean(String(memberProfile?.ma_ngan_hang || user?.ma_ngan_hang || '').trim());

  const filteredMyProducts = useMemo(() => {
    const keyword = productSearchTerm.trim().toLowerCase();

    return myProducts.filter((product) => {
      const matchesStatus = productStatusFilter === 'all' || product.trang_thai === productStatusFilter;
      const matchesCategory =
        productCategoryFilter === 'all' || Number(product.ma_danh_muc) === Number(productCategoryFilter);

      if (!matchesStatus || !matchesCategory) return false;
      if (!keyword) return true;

      return [
        product.ten_san_pham,
        product.mo_ta,
        product.tinh_trang,
        product.ten_danh_muc,
        product.ten_hoat_dong,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }, [myProducts, productCategoryFilter, productSearchTerm, productStatusFilter]);

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

  const openEditModal = (product) => {
    setEditModal({ isOpen: true, product });
    setEditForm({
      ten_san_pham: product.ten_san_pham || '',
      gia: product.gia ?? '',
      mo_ta: product.mo_ta || '',
      ma_danh_muc: product.ma_danh_muc || '',
      tinh_trang: product.tinh_trang || '',
      so_luong: product.so_luong || 1,
      anh: product.anh || '',
    });
    setEditFile(null);
    setEditPreviewUrl('');
    setNotice('');
  };

  const closeEditModal = () => {
    if (savingEdit) return;

    setEditModal({ isOpen: false, product: null });
    setEditForm({
      ten_san_pham: '',
      gia: '',
      mo_ta: '',
      ma_danh_muc: '',
      tinh_trang: '',
      so_luong: 1,
      anh: '',
    });
    setEditFile(null);
    setEditPreviewUrl('');
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleEditFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (file && !file.type.startsWith('image/')) {
      setNotice('Vui lòng chọn đúng file ảnh sản phẩm.');
      event.target.value = '';
      return;
    }

    setEditFile(file);
    event.target.value = '';
  };

  const submitProductEdit = async (event) => {
    event.preventDefault();

    if (!editModal.product) return;

    if (!editForm.ten_san_pham.trim()) {
      setNotice('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (!editForm.ma_danh_muc) {
      setNotice('Vui lòng chọn danh mục.');
      return;
    }

    const formData = new FormData();
    ['ten_san_pham', 'gia', 'mo_ta', 'ma_danh_muc', 'tinh_trang', 'so_luong'].forEach((key) => {
      formData.append(key, editForm[key]);
    });
    if (editFile) {
      formData.append('anh', editFile);
    }

    setSavingEdit(true);
    setNotice('');

    try {
      const res = await axios.put(`${API}/products/${editModal.product.ma_san_pham}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      closeEditModal();
      setNotice(res.data.message || 'Đã gửi chỉnh sửa sản phẩm cho admin duyệt.');
      await loadMemberData();
    } catch (err) {
      setNotice(err.response?.data?.error || 'Không thể chỉnh sửa sản phẩm.');
    } finally {
      setSavingEdit(false);
    }
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
        ? 'Xác nhận đã nhận tiền cho giao dịch này?'
        : 'Từ chối giao dịch và cộng lại số lượng sản phẩm?'
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

  const handleSystemFeeReceiptChange = (event) => {
    const file = event.target.files?.[0] || null;
    setNotice('');

    if (file && !file.type.startsWith('image/')) {
      setSystemFeeReceipt(null);
      setNotice('Vui lòng chọn đúng file ảnh biên lai.');
      return;
    }

    setSystemFeeReceipt(file);
  };

  const submitSystemFeeReceipt = async (event) => {
    event.preventDefault();

    const systemFees = paymentSummary.systemFees || [];
    if (systemFees.length === 0) {
      setNotice('Không có khoản phí hệ thống nào cần nộp.');
      return;
    }

    if (!systemFeeReceipt) {
      setNotice('Vui lòng tải lên biên lai nộp phí hệ thống.');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', systemFeeReceipt);
    formData.append('payment_ids', JSON.stringify(systemFees.map((payment) => payment.ma_thanh_toan)));

    setSubmittingSystemFee(true);
    setNotice('');

    try {
      const res = await axios.post(`${API}/products/system-fees/submit`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSystemFeeReceipt(null);
      setNotice(res.data.message || 'Đã ghi nhận biên lai phí hệ thống.');
      await loadMemberData();
    } catch (err) {
      setNotice(err.response?.data?.error || 'Không thể nộp biên lai phí hệ thống.');
    } finally {
      setSubmittingSystemFee(false);
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

        {activeTab === 'Sản phẩm của tôi' && (
          <div className="member-filter-bar">
            <label>
              <span>Tìm kiếm</span>
              <input
                value={productSearchTerm}
                onChange={(event) => setProductSearchTerm(event.target.value)}
                placeholder="Tên sản phẩm, mô tả, sự kiện..."
              />
            </label>
            <label>
              <span>Trạng thái</span>
              <select value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="tu_choi">Từ chối</option>
                <option value="dang_giao_dich">Đang giao dịch</option>
              </select>
            </label>
            <label>
              <span>Danh mục</span>
              <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.ma_danh_muc} value={category.ma_danh_muc}>
                    {category.ten_danh_muc}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

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

        {editModal.isOpen && (
          <div className="modal-overlay">
            <form className="modal-content product-edit-modal" onSubmit={submitProductEdit}>
              <h3>Chỉnh sửa sản phẩm</h3>
              <label className="edit-product-upload">
                <span>Ảnh sản phẩm</span>
                <input type="file" accept="image/*" onChange={handleEditFileChange} />
                <img
                  src={editPreviewUrl || getAssetUrl(editForm.anh)}
                  alt="Xem trước ảnh sản phẩm"
                  onError={(event) => {
                    event.currentTarget.src = 'https://via.placeholder.com/160';
                  }}
                />
              </label>

              <label className="edit-field">
                <span>Tên sản phẩm</span>
                <input name="ten_san_pham" value={editForm.ten_san_pham} onChange={handleEditFormChange} />
              </label>

              <div className="edit-grid">
                <label className="edit-field">
                  <span>Danh mục</span>
                  <select name="ma_danh_muc" value={editForm.ma_danh_muc} onChange={handleEditFormChange}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((category) => (
                      <option key={category.ma_danh_muc} value={category.ma_danh_muc}>
                        {category.ten_danh_muc}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="edit-field">
                  <span>Tình trạng</span>
                  <input name="tinh_trang" value={editForm.tinh_trang} onChange={handleEditFormChange} />
                </label>
              </div>

              <div className="edit-grid">
                <label className="edit-field">
                  <span>Giá bán</span>
                  <input name="gia" value={editForm.gia} onChange={handleEditFormChange} />
                </label>
                <label className="edit-field">
                  <span>Số lượng</span>
                  <input name="so_luong" type="number" min="1" value={editForm.so_luong} onChange={handleEditFormChange} />
                </label>
              </div>

              <label className="edit-field">
                <span>Mô tả</span>
                <textarea name="mo_ta" value={editForm.mo_ta} onChange={handleEditFormChange} />
              </label>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={closeEditModal} disabled={savingEdit}>
                  Hủy
                </button>
                <button type="submit" className="modal-btn save-btn" disabled={savingEdit}>
                  {savingEdit ? 'Đang gửi...' : 'Gửi duyệt'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'Sản phẩm của tôi' ? (
          myProducts.length > 0 ? (
            <div className="product-list">
              {filteredMyProducts.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Không có sản phẩm phù hợp với bộ lọc.</p>
              ) : filteredMyProducts.map((product) => {
                const status = getProductStatus(product);
                const hasBuyer = Boolean(product.ma_thanh_toan);

                return (
                  <div key={`${product.ma_san_pham}-${product.ma_thanh_toan || 'product'}`} className="product-card-row">
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
                          <span className="product-time">Còn lại: {product.so_luong || 0}</span>
                          {product.trang_thai === 'tu_choi' && product.ly_do_tu_choi && (
                            <span className="product-rejection-reason">Lý do từ chối: {product.ly_do_tu_choi}</span>
                          )}
                        </div>
                      </div>

                      <div className="product-actions-row">
                        {canEditPersonalProduct(product, hasBuyer) && (
                          <button
                            className="action-icon"
                            onClick={() => openEditModal(product)}
                            title="Chỉnh sửa sản phẩm"
                          >
                            <LuPencil />
                          </button>
                        )}
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
                          <span>Số lượng mua: {product.so_luong_mua || 1}</span>
                          <span>Số tiền: {formatPrice(product.so_tien_giao_dich || product.gia)}</span>
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
        ) : activeTab === 'Thanh toán' ? (
          <MemberPaymentTab
            loading={loadingPayments}
            systemFees={paymentSummary.systemFees || []}
            organizationDebts={paymentSummary.organizationDebts || []}
            systemFeeReceipt={systemFeeReceipt}
            submittingSystemFee={submittingSystemFee}
            onReceiptChange={handleSystemFeeReceiptChange}
            onSubmitSystemFee={submitSystemFeeReceipt}
          />
        ) : (
          <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu cho {activeTab}</p>
        )}
      </div>
    </div>
  );
}
