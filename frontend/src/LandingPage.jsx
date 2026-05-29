import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LuSearch, LuFilter, LuHeart, LuShoppingBag, LuCalendar,
  LuClock, LuChevronRight, LuTrendingUp, LuUsers, LuPackage, LuMessagesSquare,
  LuMinus, LuPlus, LuX
} from 'react-icons/lu';
import './LandingPage.css';

const API = 'http://localhost:5000/api';
const DEFAULT_STATS = {
  products: 0,
  campaigns: 0,
  members: 0,
  satisfaction: 95,
};
const initialPostProductForm = {
  ten_san_pham: '',
  gia: '',
  mo_ta: '',
  ma_danh_muc: '',
  tinh_trang: 'Như mới',
  so_luong: 1,
  ma_hoat_dong: '',
  so_phan_tram_quyen_gop: '',
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
}

function getAssetUrl(path) {
  if (!path) return '/images/school-market-icon-v2.png';
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith('/') ? path : `/${path}`}`;
}

function getDescription(product) {
  const description = String(product?.mo_ta || '').trim();
  return description || 'Chưa có mô tả.';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function isDonationProduct(product) {
  return Boolean(
    product.ma_hoat_dong &&
    product.hinh_thuc_quyen_gop === 'ban_do_quyen_gop' &&
    Number(product.so_phan_tram_quyen_gop || 0) >= 40
  );
}

function getPostTypeLabel(type) {
  if (type === 'keu_goi_tinh_nguyen') return 'Kêu gọi tình nguyện';
  if (type === 'trao_doi_chia_se') return 'Trao đổi chia sẻ';
  if (type === 'hoi_dap') return 'Hỏi đáp';
  return 'Khác';
}

export default function LandingPage({
  onLoginClick,
  onRegisterClick,
  isAuthenticated = false,
  token,
  user,
  accountType,
  onHomeClick,
  onDashboardClick,
  onDonationClick,
  onActivityClick,
  onAccountClick,
  onBuyProductClick,
  onLogout,
}) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activityPosts, setActivityPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingActivityPosts, setLoadingActivityPosts] = useState(true);
  const [selectedBuyProduct, setSelectedBuyProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [donationCampaigns, setDonationCampaigns] = useState([]);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postForm, setPostForm] = useState(initialPostProductForm);
  const [postFile, setPostFile] = useState(null);
  const [postPreviewUrl, setPostPreviewUrl] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  const displayName = user?.ho_ten || user?.ten_to_chuc || 'Người dùng';
  const roleLabel = accountType === 'to_chuc' ? 'Tổ chức' : accountType === 'admin' ? 'Admin' : 'Thành viên';
  const selectedBuyStock = Number(selectedBuyProduct?.so_luong || 0);
  const normalizedBuyQuantity = Math.min(
    Math.max(1, Number(buyQuantity) || 1),
    Math.max(1, selectedBuyStock)
  );
  const selectedBuyTotal = Number(selectedBuyProduct?.gia || 0) * normalizedBuyQuantity;

  useEffect(() => {
    let isMounted = true;
    setLoadingProducts(true);
    setLoadingActivityPosts(true);

    Promise.allSettled([
      axios.get(`${API}/products/stats`),
      axios.get(`${API}/products/categories`),
      axios.get(`${API}/products/public`),
      axios.get(`${API}/posts`),
      axios.get(`${API}/campaigns`),
    ]).then(([statsResult, categoriesResult, productsResult, postsResult, campaignsResult]) => {
      if (!isMounted) return;

      if (statsResult.status === 'fulfilled') {
        setStats({ ...DEFAULT_STATS, ...statsResult.value.data });
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(Array.isArray(categoriesResult.value.data) ? categoriesResult.value.data : []);
      }

      if (productsResult.status === 'fulfilled') {
        setProducts(Array.isArray(productsResult.value.data) ? productsResult.value.data : []);
      }

      if (postsResult.status === 'fulfilled') {
        setActivityPosts(Array.isArray(postsResult.value.data) ? postsResult.value.data : []);
      }

      if (campaignsResult.status === 'fulfilled') {
        const campaignList = Array.isArray(campaignsResult.value.data) ? campaignsResult.value.data : [];
        setDonationCampaigns(campaignList.filter((campaign) => campaign.hinh_thuc_quyen_gop === 'ban_do_quyen_gop'));
      }
    }).finally(() => {
      if (isMounted) {
        setLoadingProducts(false);
        setLoadingActivityPosts(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!postFile) {
      setPostPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(postFile);
    setPostPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [postFile]);

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || Number(product.ma_danh_muc) === Number(activeCategory);

      if (!matchesCategory) return false;
      if (!keyword) return true;

      return [
        product.ten_san_pham,
        product.mo_ta,
        product.tinh_trang,
        product.ten_danh_muc,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }, [activeCategory, products, searchTerm]);

  const updateBuyQuantity = (nextValue) => {
    const maxQuantity = Math.max(1, selectedBuyStock);
    const nextQuantity = Math.min(Math.max(1, Number(nextValue) || 1), maxQuantity);
    setBuyQuantity(nextQuantity);
  };

  const openBuyDialog = (product) => {
    if (!isAuthenticated) {
      if (onLoginClick) onLoginClick();
      return;
    }

    const availableQuantity = Number(product.so_luong || 0);
    if (availableQuantity <= 0) return;

    setSelectedBuyProduct(product);
    setBuyQuantity(1);
  };

  const closeBuyDialog = () => {
    setSelectedBuyProduct(null);
    setBuyQuantity(1);
  };

  const confirmBuyQuantity = () => {
    if (!selectedBuyProduct || !onBuyProductClick) return;
    onBuyProductClick(selectedBuyProduct.ma_san_pham, normalizedBuyQuantity);
    closeBuyDialog();
  };

  const openPostModal = () => {
    if (!isAuthenticated) {
      if (onRegisterClick) onRegisterClick();
      return;
    }

    setPostModalOpen(true);
    setPostMessage('');
    setPostError('');
  };

  const closePostModal = () => {
    if (postSubmitting) return;
    setPostModalOpen(false);
    setPostForm(initialPostProductForm);
    setPostFile(null);
    setPostMessage('');
    setPostError('');
  };

  const updatePostForm = (event) => {
    const { name, value } = event.target;
    setPostForm((currentForm) => {
      if (name === 'ma_hoat_dong') {
        return {
          ...currentForm,
          ma_hoat_dong: value,
          so_phan_tram_quyen_gop: value
            ? (currentForm.so_phan_tram_quyen_gop || '40')
            : '',
        };
      }

      return { ...currentForm, [name]: value };
    });
  };

  const submitPostProduct = async (event) => {
    event.preventDefault();
    setPostMessage('');
    setPostError('');

    if (!token) {
      setPostError('Bạn cần đăng nhập để đăng sản phẩm.');
      return;
    }

    if (!String(user?.ma_ngan_hang || '').trim()) {
      setPostError('Bạn cần cập nhật mã ngân hàng/QR nhận tiền trước khi đăng bán sản phẩm.');
      return;
    }

    if (!postForm.ten_san_pham.trim()) {
      setPostError('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (!postForm.ma_danh_muc) {
      setPostError('Vui lòng chọn danh mục.');
      return;
    }

    if (Number(postForm.gia || 0) <= 0) {
      setPostError('Vui lòng nhập giá bán hợp lệ.');
      return;
    }

    if (Number(postForm.so_luong || 0) < 1) {
      setPostError('Số lượng phải lớn hơn 0.');
      return;
    }

    const hasDonationCampaign = Boolean(postForm.ma_hoat_dong);
    const donationPercent = hasDonationCampaign ? Number(postForm.so_phan_tram_quyen_gop || 40) : 0;
    if (hasDonationCampaign && (donationPercent < 40 || donationPercent > 100)) {
      setPostError('Phần trăm quyên góp phải từ 40% đến 100%.');
      return;
    }

    const formData = new FormData();
    if (postFile) {
      formData.append('anh', postFile);
    }
    formData.append('ten_san_pham', postForm.ten_san_pham);
    formData.append('gia', postForm.gia);
    formData.append('mo_ta', postForm.mo_ta);
    formData.append('ma_danh_muc', postForm.ma_danh_muc);
    formData.append('tinh_trang', postForm.tinh_trang);
    formData.append('so_luong', postForm.so_luong);
    formData.append('ma_hoat_dong', hasDonationCampaign ? postForm.ma_hoat_dong : '');
    formData.append('so_phan_tram_quyen_gop', hasDonationCampaign ? String(donationPercent) : '0');

    setPostSubmitting(true);

    try {
      const res = await axios.post(`${API}/products/create`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPostMessage(res.data.message || 'Đã gửi sản phẩm cho admin duyệt.');
      setPostForm(initialPostProductForm);
      setPostFile(null);
    } catch (err) {
      setPostError(err.response?.data?.error || 'Không thể đăng sản phẩm. Hãy kiểm tra backend và thử lại.');
    } finally {
      setPostSubmitting(false);
    }
  };

  return (
    <div className="app-wrapper">
      <button
        type="button"
        className="fab-button"
        onClick={openPostModal}
        aria-label="Đăng tin"
      >
        <span className="fab-icon">+</span>
      </button>

      <header className="navbar">
        <div className="nav-container">
          <button
            type="button"
            className="nav-logo nav-logo-button"
            onClick={onHomeClick}
            aria-label="Về trang chủ School Market"
          >
            <img
              src="/images/school-market-icon-v2.png"
              alt="School Market"
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 10px rgba(82, 167, 116, 0.2)' }}
            />
            <span className="logo-text">School Market</span>
          </button>

          <div className="nav-links">
            <button
              type="button"
              className="nav-link"
              onClick={isAuthenticated ? onDashboardClick : onLoginClick}
            >
              <LuShoppingBag size={18} /> Đăng bán cá nhân
            </button>
            <button type="button" className="nav-link" onClick={onDonationClick}><LuHeart size={18} /> Quyên góp</button>
            <button type="button" className="nav-link" onClick={onActivityClick}><LuCalendar size={18} /> Hoạt động</button>
          </div>

          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <button type="button" className="nav-user nav-user-button" onClick={onAccountClick}>
                  <span className="nav-user-name">{displayName}</span>
                  <span className="nav-user-role">{roleLabel}</span>
                </button>
                <button type="button" onClick={onLogout} className="btn-primary">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLoginClick}
                  style={{ background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', color: '#111827', fontSize: '15px' }}
                >
                  Đăng nhập
                </button>
                <button type="button" onClick={onRegisterClick} className="btn-primary">
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-badge">
          <span className="sparkle">✨</span> Nền tảng trao đổi đồ cũ uy tín
        </div>
        <h1 className="hero-title">
          Cho đi, Nhận lại, <span className="text-highlight">Yêu thương</span>
        </h1>
        <p className="hero-subtitle">
          Mua bán và quyên góp đồ cũ - Tạo giá trị mới cho vật phẩm cũ của bạn
        </p>

        <div className="hero-tabs">
          <button type="button" className="tab-btn active"><LuShoppingBag size={18} /> Mua bán</button>
          <button type="button" className="tab-btn" onClick={onDonationClick}><LuHeart size={18} /> Quyên góp</button>
        </div>

        <div className="search-container">
          <div className="search-input-wrapper">
            <LuSearch size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm đồ cũ, quần áo, điện tử..."
              className="search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button type="button" className="btn-filter"><LuFilter size={18} /> Lọc</button>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card bg-green-light">
            <div className="stat-icon-wrap text-green"><LuPackage size={24} /></div>
            <div className="stat-info">
              <h3>{formatNumber(stats.products)}</h3>
              <p>Sản phẩm</p>
            </div>
          </div>
          <div className="stat-card bg-pink-light">
            <div className="stat-icon-wrap text-pink"><LuHeart size={24} /></div>
            <div className="stat-info">
              <h3>{formatNumber(stats.campaigns)}</h3>
              <p>Quyên góp</p>
            </div>
          </div>
          <div className="stat-card bg-blue-light">
            <div className="stat-icon-wrap text-blue"><LuUsers size={24} /></div>
            <div className="stat-info">
              <h3>{formatNumber(stats.members)}</h3>
              <p>Thành viên</p>
            </div>
          </div>
          <div className="stat-card bg-orange-light">
            <div className="stat-icon-wrap text-orange"><LuTrendingUp size={24} /></div>
            <div className="stat-info">
              <h3>{formatNumber(stats.satisfaction)}%</h3>
              <p>Hài lòng</p>
            </div>
          </div>
        </div>
      </section>

      <section className="categories-section">
        <div className="category-list">
          <button
            type="button"
            className={`cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.ma_danh_muc}
              className={`cat-btn ${Number(activeCategory) === Number(category.ma_danh_muc) ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.ma_danh_muc)}
            >
              {category.ten_danh_muc}
            </button>
          ))}
        </div>
      </section>

      <section className="products-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Sản phẩm mới nhất</h2>
            <p className="section-subtitle">{filteredProducts.length} sản phẩm có sẵn</p>
          </div>
          <button type="button" className="btn-text"><LuClock size={16} /> Mới nhất</button>
        </div>

        {loadingProducts ? (
          <div className="empty-products">Đang tải sản phẩm...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-products">Chưa có sản phẩm phù hợp.</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div className="product-card" key={product.ma_san_pham}>
                <div className="product-image">
                  <img
                    src={getAssetUrl(product.anh)}
                    alt={product.ten_san_pham || 'Sản phẩm'}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/images/school-market-icon-v2.png';
                    }}
                  />
                  {isDonationProduct(product) && (
                    <span className="product-donation-tag">
                      Quyên góp {Number(product.so_phan_tram_quyen_gop || 0)}%
                    </span>
                  )}
                </div>
                <div className="product-content">
                  <h3 className="product-name">{product.ten_san_pham}</h3>
                  <div className="product-price-row">
                    <span className="product-price">{formatCurrency(product.gia)}</span>
                    <span className="product-badge">{product.tinh_trang || 'Chưa cập nhật'}</span>
                  </div>
                  <p className="product-description">{getDescription(product)}</p>
                  <div className="product-meta">
                    <span>{product.ten_danh_muc || 'Chưa phân loại'}</span>
                    <span>Số lượng: {formatNumber(product.so_luong || 0)}</span>
                  </div>
                  <button
                    type="button"
                    className="product-buy-btn"
                    onClick={() => openBuyDialog(product)}
                    disabled={Number(product.so_luong || 0) <= 0}
                  >
                    Mua hàng
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="load-more-container">
            <button type="button" className="btn-load-more">Xem thêm sản phẩm <LuChevronRight size={16} /></button>
          </div>
        )}
      </section>

      <section className="activity-home-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Hoạt động cộng đồng</h2>
            <p className="section-subtitle">{activityPosts.length} bài đăng đã duyệt</p>
          </div>
          <button type="button" className="btn-text" onClick={onActivityClick}>
            <LuMessagesSquare size={16} /> Xem hoạt động
          </button>
        </div>

        {loadingActivityPosts ? (
          <div className="empty-products">Đang tải bài đăng hoạt động...</div>
        ) : activityPosts.length === 0 ? (
          <div className="empty-products">Chưa có bài đăng hoạt động được duyệt.</div>
        ) : (
          <div className="activity-home-grid">
            {activityPosts.map((post) => (
              <article className="activity-home-card" key={post.ma_bai_dang}>
                <span className="activity-home-badge">{getPostTypeLabel(post.loai_bai_dang)}</span>
                <h3 className="activity-home-title">{post.tieu_de}</h3>
                <p className="activity-home-text">{post.noi_dung || 'Chưa có nội dung.'}</p>
                <div className="activity-home-meta">
                  <span>{post.ho_ten || 'Thành viên'}</span>
                  <span>{formatDate(post.ngay_dang)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cta-section">
        <div className="cta-banner">
          <h2>Sẵn sàng cho đi và nhận lại?</h2>
          <p>Tham gia cộng đồng và bắt đầu chia sẻ, mua bán đồ cũ một cách bền vững.</p>
          <div className="cta-buttons">
            <button type="button" className="btn-white" onClick={openPostModal}>
              Đăng tin miễn phí
            </button>
            <button type="button" className="btn-outline-white" onClick={isAuthenticated ? onActivityClick : onLoginClick}>
              Xem hoạt động
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <button
              type="button"
              className="nav-logo nav-logo-button"
              onClick={onHomeClick}
              aria-label="Về trang chủ School Market"
            >
              <img
                src="/images/school-market-icon-v2.png"
                alt="School Market"
                style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }}
              />
              <span className="logo-text">School Market</span>
            </button>
            <p className="brand-desc">Nền tảng trao đổi, mua bán và quyên góp đồ cũ uy tín.</p>
          </div>
          <div className="footer-col">
            <h4>Về chúng tôi</h4>
            <button type="button">Giới thiệu</button>
            <button type="button">Cách hoạt động</button>
            <button type="button">Tin tức</button>
            <button type="button">Tuyển dụng</button>
          </div>
          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <button type="button">Trung tâm trợ giúp</button>
            <button type="button">An toàn & Bảo mật</button>
            <button type="button">Chính sách</button>
            <button type="button">Liên hệ</button>
          </div>
          <div className="footer-col">
            <h4>Liên kết</h4>
            <button type="button">Facebook</button>
            <button type="button">Instagram</button>
            <button type="button">Zalo OA</button>
            <button type="button">YouTube</button>
          </div>
        </div>
      </footer>

      {postModalOpen && (
        <div className="post-modal-overlay" role="presentation">
          <form className="post-modal" onSubmit={submitPostProduct} role="dialog" aria-modal="true" aria-labelledby="post-modal-title">
            <div className="post-modal-header">
              <div>
                <h2 id="post-modal-title">Đăng bán sản phẩm</h2>
                <p>Gửi bài đăng cho admin duyệt trước khi hiển thị trên trang chủ.</p>
              </div>
              <button type="button" className="buy-modal-close" onClick={closePostModal} aria-label="Đóng">
                <LuX size={20} />
              </button>
            </div>

            {postMessage && <p className="post-form-alert success">{postMessage}</p>}
            {postError && <p className="post-form-alert error">{postError}</p>}

            <label className="post-form-field" htmlFor="homePostImage">
              <span>Ảnh sản phẩm</span>
              <div className="post-upload-box">
                <input
                  id="homePostImage"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => setPostFile(event.target.files?.[0] || null)}
                />
                {postPreviewUrl ? (
                  <img src={postPreviewUrl} alt="Xem trước ảnh sản phẩm" />
                ) : (
                  <strong>Nhấn để chọn ảnh sản phẩm</strong>
                )}
              </div>
            </label>

            <label className="post-form-field" htmlFor="homePostName">
              <span>Tên sản phẩm</span>
              <input
                id="homePostName"
                name="ten_san_pham"
                value={postForm.ten_san_pham}
                onChange={updatePostForm}
                placeholder="Nhập tên sản phẩm..."
              />
            </label>

            <div className="post-form-grid">
              <label className="post-form-field" htmlFor="homePostCategory">
                <span>Danh mục</span>
                <select id="homePostCategory" name="ma_danh_muc" value={postForm.ma_danh_muc} onChange={updatePostForm}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((category) => (
                    <option key={category.ma_danh_muc} value={category.ma_danh_muc}>
                      {category.ten_danh_muc}
                    </option>
                  ))}
                </select>
              </label>

              <label className="post-form-field" htmlFor="homePostCondition">
                <span>Tình trạng</span>
                <select id="homePostCondition" name="tinh_trang" value={postForm.tinh_trang} onChange={updatePostForm}>
                  <option value="Như mới">Như mới</option>
                  <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                </select>
              </label>
            </div>

            <div className="post-form-grid">
              <label className="post-form-field" htmlFor="homePostPrice">
                <span>Giá bán (đ)</span>
                <input
                  id="homePostPrice"
                  name="gia"
                  type="number"
                  min="1"
                  value={postForm.gia}
                  onChange={updatePostForm}
                  placeholder="Nhập giá bán"
                />
              </label>

              <label className="post-form-field" htmlFor="homePostQuantity">
                <span>Số lượng</span>
                <input
                  id="homePostQuantity"
                  name="so_luong"
                  type="number"
                  min="1"
                  value={postForm.so_luong}
                  onChange={updatePostForm}
                />
              </label>
            </div>

            <label className="post-form-field" htmlFor="homePostDescription">
              <span>Mô tả chi tiết</span>
              <textarea
                id="homePostDescription"
                name="mo_ta"
                value={postForm.mo_ta}
                onChange={updatePostForm}
                placeholder="Nhập mô tả chi tiết..."
              />
            </label>

            <div className="post-donation-box">
              <label className="post-form-field" htmlFor="homePostCampaign">
                <span>Bán cho hoạt động quyên góp nào</span>
                <select id="homePostCampaign" name="ma_hoat_dong" value={postForm.ma_hoat_dong} onChange={updatePostForm}>
                  <option value="">Không bán quyên góp</option>
                  {donationCampaigns.map((campaign) => (
                    <option key={campaign.ma_hoat_dong} value={campaign.ma_hoat_dong}>
                      {campaign.ten_hoat_dong}
                    </option>
                  ))}
                </select>
              </label>

              <label className="post-form-field" htmlFor="homePostDonationPercent">
                <span>Phần trăm quyên góp</span>
                <input
                  id="homePostDonationPercent"
                  name="so_phan_tram_quyen_gop"
                  type="number"
                  min="40"
                  max="100"
                  value={postForm.so_phan_tram_quyen_gop}
                  onChange={updatePostForm}
                  placeholder="Tối thiểu 40%"
                  disabled={!postForm.ma_hoat_dong}
                />
              </label>
            </div>

            <button type="submit" className="post-submit-btn" disabled={postSubmitting}>
              {postSubmitting ? 'Đang gửi...' : 'Gửi admin duyệt'}
            </button>
          </form>
        </div>
      )}

      {selectedBuyProduct && (
        <div className="buy-modal-overlay" role="presentation">
          <div className="buy-modal" role="dialog" aria-modal="true" aria-labelledby="buy-modal-title">
            <div className="buy-modal-header">
              <h2 id="buy-modal-title">Chọn số lượng</h2>
              <button type="button" className="buy-modal-close" onClick={closeBuyDialog} aria-label="Đóng">
                <LuX size={20} />
              </button>
            </div>

            <div className="buy-modal-product">
              <img
                src={getAssetUrl(selectedBuyProduct.anh)}
                alt={selectedBuyProduct.ten_san_pham || 'Sản phẩm'}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/images/school-market-icon-v2.png';
                }}
              />
              <div>
                <h3>{selectedBuyProduct.ten_san_pham}</h3>
                <p>{formatCurrency(selectedBuyProduct.gia)} / sản phẩm</p>
                <span>Còn {formatNumber(selectedBuyStock)} sản phẩm</span>
              </div>
            </div>

            <div className="buy-quantity-row">
              <span>Số lượng mua</span>
              <div className="quantity-stepper">
                <button
                  type="button"
                  onClick={() => updateBuyQuantity(normalizedBuyQuantity - 1)}
                  disabled={normalizedBuyQuantity <= 1}
                  aria-label="Giảm số lượng"
                >
                  <LuMinus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, selectedBuyStock)}
                  value={normalizedBuyQuantity}
                  onChange={(event) => updateBuyQuantity(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => updateBuyQuantity(normalizedBuyQuantity + 1)}
                  disabled={normalizedBuyQuantity >= selectedBuyStock}
                  aria-label="Tăng số lượng"
                >
                  <LuPlus size={16} />
                </button>
              </div>
            </div>

            <div className="buy-total-row">
              <span>Tổng tiền cần chuyển</span>
              <strong>{formatCurrency(selectedBuyTotal)}</strong>
            </div>

            <div className="buy-modal-actions">
              <button type="button" className="btn-secondary" onClick={closeBuyDialog}>
                Hủy
              </button>
              <button type="button" className="btn-primary" onClick={confirmBuyQuantity}>
                Tiếp tục mua hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
