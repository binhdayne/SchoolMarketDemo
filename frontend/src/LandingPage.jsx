import React from 'react';
// ĐÃ ĐỔI THÀNH react-icons/lu Ở ĐÂY 👇
import { 
  LuSearch, LuFilter, LuHeart, LuShoppingBag, LuCalendar, 
  LuMapPin, LuClock, LuChevronRight, LuTrendingUp, LuUsers, LuPackage 
} from 'react-icons/lu';
import './LandingPage.css';

// 1. THÊM { onLoginClick } VÀO ĐÂY ĐỂ NHẬN LỆNH TỪ APP.JS
export default function LandingPage({ onLoginClick, onRegisterClick }) {
  return (
    <div className="app-wrapper">
      {/* NÚT FLOAT ACTION THÊM MỚI (Góc dưới phải) */}
      <button className="fab-button">
        <span className="fab-icon">+</span>
      </button>

      {/* HEADER / NAVBAR */}
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
              <img 
                src="/images/school-market-icon-v2.png" 
                alt="School Market" 
                style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 10px rgba(82, 167, 116, 0.2)' }} 
              />
              <span className="logo-text">School Market</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link active"><LuShoppingBag size={18} /> Mua bán</a>
            <a href="#" className="nav-link"><LuHeart size={18} /> Quyên góp</a>
            <a href="#" className="nav-link"><LuCalendar size={18} /> Hoạt động</a>
          </div>

          {/* 2. NÚT ĐĂNG NHẬP */}
          <div className="nav-actions">
            <button 
              onClick={onLoginClick} 
              style={{background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', color: '#111827', fontSize: '15px'}}
            >
              Đăng nhập
            </button>
            <button onClick={onRegisterClick} className="btn-primary">
              Đăng ký
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="sparkle">✨</span> Nền tảng trao đổi đồ cũ uy tín
        </div>
        <h1 className="hero-title">
          Cho đi, Nhận lại, <span className="text-highlight">Yêu thương</span>
        </h1>
        <p className="hero-subtitle">
          Mua bán và quyên góp đồ cũ — Tạo giá trị mới cho vật phẩm cũ của bạn
        </p>

        {/* TABS */}
        <div className="hero-tabs">
          <button className="tab-btn active"><LuShoppingBag size={18} /> Mua bán</button>
          <button className="tab-btn"><LuHeart size={18} /> Quyên góp</button>
        </div>

        {/* SEARCH BAR */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <LuSearch size={20} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm đồ cũ, quần áo, điện tử..." className="search-input" />
          </div>
          <button className="btn-filter"><LuFilter size={18} /> Lọc</button>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card bg-green-light">
            <div className="stat-icon-wrap text-green"><LuPackage size={24} /></div>
            <div className="stat-info">
              <h3>12,543</h3>
              <p>Sản phẩm</p>
            </div>
          </div>
          <div className="stat-card bg-pink-light">
            <div className="stat-icon-wrap text-pink"><LuHeart size={24} /></div>
            <div className="stat-info">
              <h3>3,421</h3>
              <p>Quyên góp</p>
            </div>
          </div>
          <div className="stat-card bg-blue-light">
            <div className="stat-icon-wrap text-blue"><LuUsers size={24} /></div>
            <div className="stat-info">
              <h3>8,932</h3>
              <p>Thành viên</p>
            </div>
          </div>
          <div className="stat-card bg-orange-light">
            <div className="stat-icon-wrap text-orange"><LuTrendingUp size={24} /></div>
            <div className="stat-info">
              <h3>95%</h3>
              <p>Hài lòng</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="categories-section">
        <div className="category-list">
          <button className="cat-btn">Tất cả</button>
          <button className="cat-btn">👕 Quần áo</button>
          <button className="cat-btn">💻 Điện tử</button>
          <button className="cat-btn">🏠 Nội thất</button>
          <button className="cat-btn">📖 Sách</button>
          <button className="cat-btn active">🚲 Thể thao</button>
          <button className="cat-btn">👶 Trẻ em</button>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section className="products-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Sản phẩm mới nhất</h2>
            <p className="section-subtitle">1 sản phẩm có sẵn</p>
          </div>
          <button className="btn-text"><LuClock size={16} /> Mới nhất</button>
        </div>

        <div className="products-grid">
          {/* Card Sản Phẩm */}
          <div className="product-card">
            <div className="product-image">
              <img src="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800" alt="Xe đạp" />
            </div>
            <div className="product-content">
              <h3 className="product-name">Xe đạp thể thao Giant</h3>
              <div className="product-price-row">
                <span className="product-price">2.800.000đ</span>
                <span className="product-badge">Như mới</span>
              </div>
              <div className="product-meta">
                <span><LuMapPin size={14} /> Q.10, TP.HCM</span>
                <span><LuClock size={14} /> 4 giờ trước</span>
              </div>
            </div>
          </div>
        </div>

        <div className="load-more-container">
          <button className="btn-load-more">Xem thêm sản phẩm <LuChevronRight size={16} /></button>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-section">
        <div className="cta-banner">
          <h2>Sẵn sàng cho đi và nhận lại?</h2>
          <p>Tham gia cộng đồng và bắt đầu chia sẻ, mua bán đồ cũ một cách bền vững.</p>
          <div className="cta-buttons">
            <button className="btn-white">Đăng tin miễn phí</button>
            <button className="btn-outline-white">Xem hoạt động</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="nav-logo">
              <img 
                src="/images/school-market-icon-v2.png" 
                alt="School Market" 
                style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover'}} 
              />
              <span className="logo-text">School Market</span>
          </div>
            <p className="brand-desc">Nền tảng trao đổi, mua bán và quyên góp đồ cũ uy tín.</p>
          </div>
          <div className="footer-col">
            <h4>Về chúng tôi</h4>
            <a href="#">Giới thiệu</a>
            <a href="#">Cách hoạt động</a>
            <a href="#">Tin tức</a>
            <a href="#">Tuyển dụng</a>
          </div>
          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <a href="#">Trung tâm trợ giúp</a>
            <a href="#">An toàn & Bảo mật</a>
            <a href="#">Chính sách</a>
            <a href="#">Liên hệ</a>
          </div>
          <div className="footer-col">
            <h4>Liên kết</h4>
            <a href="#">Facebook</a>
            <a href="#">Instagram</a>
            <a href="#">Zalo OA</a>
            <a href="#">YouTube</a>
          </div>
        </div>
      </footer>
    </div>
  );
}