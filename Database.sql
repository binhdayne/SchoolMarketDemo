CREATE DATABASE do_cu_quyen_gop
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE do_cu_quyen_gop;

CREATE TABLE thanh_vien (
    ma_thanh_vien INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    sdt VARCHAR(20) UNIQUE,
    ngay_sinh DATE,
    dia_chi VARCHAR(255),
    lop VARCHAR(50),
    ma_ngan_hang VARCHAR(50),
    so_tai_khoan VARCHAR(50),
    ten_ngan_hang VARCHAR(100),
    vai_tro VARCHAR(50),
    trang_thai VARCHAR(50),
    so_tien_phi_no DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE to_chuc (
    ma_to_chuc INT AUTO_INCREMENT PRIMARY KEY,
    ten_to_chuc VARCHAR(150) NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    sdt VARCHAR(20),
    dia_chi VARCHAR(255),
    mo_ta TEXT,
    trang_thai VARCHAR(50)
);

CREATE TABLE nguoi_kiem_duyet (
    ma_kiem_duyet INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255) NOT NULL
);

INSERT INTO nguoi_kiem_duyet (ho_ten, email, mat_khau) VALUES
('Quan tri vien', 'admin@schoolmarket.local', '$2b$10$IL7q1q5n8PTBZcDBG.ch7uLCFyeeOmLvW0MjMNKEusD5bJ356wnxS');

CREATE TABLE danh_muc (
    ma_danh_muc INT AUTO_INCREMENT PRIMARY KEY,
    ten_danh_muc VARCHAR(100) NOT NULL,
    mo_ta TEXT
);

CREATE TABLE hoat_dong_quyen_gop (
    ma_hoat_dong INT AUTO_INCREMENT PRIMARY KEY,
    ten_hoat_dong VARCHAR(150) NOT NULL,
    mo_ta TEXT,
    ngay_to_chuc DATETIME,
    dia_diem VARCHAR(255),
    trang_thai VARCHAR(50),
    ma_to_chuc INT,
    han_ket_thuc DATETIME,

    FOREIGN KEY (ma_to_chuc) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE san_pham (
    ma_san_pham INT AUTO_INCREMENT PRIMARY KEY,
    ten_san_pham VARCHAR(150) NOT NULL,
    anh VARCHAR(255),
    mo_ta TEXT,
    gia DECIMAL(12,2),
    tinh_trang VARCHAR(100),
    trang_thai VARCHAR(50),
    so_luong INT DEFAULT 1,
    ngay_dang DATETIME DEFAULT CURRENT_TIMESTAMP,
    ma_thanh_vien INT,
    ma_to_chuc INT,
    ma_danh_muc INT,
    ma_hoat_dong INT,
    so_phan_tram_quyen_gop INT DEFAULT 0,

    FOREIGN KEY (ma_thanh_vien) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_to_chuc) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_danh_muc) REFERENCES danh_muc(ma_danh_muc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_hoat_dong) REFERENCES hoat_dong_quyen_gop(ma_hoat_dong)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE bai_dang (
    ma_bai_dang INT AUTO_INCREMENT PRIMARY KEY,
    tieu_de VARCHAR(150) NOT NULL,
    noi_dung TEXT,
    loai_bai_dang VARCHAR(50),
    trang_thai VARCHAR(50),
    ngay_dang DATETIME DEFAULT CURRENT_TIMESTAMP,
    ma_thanh_vien INT,
    ma_to_chuc INT,

    FOREIGN KEY (ma_thanh_vien) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_to_chuc) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE to_cao_khieu_nai (
    ma_to_cao INT AUTO_INCREMENT PRIMARY KEY,
    noi_dung TEXT NOT NULL,
    loai_to_cao VARCHAR(50),
    trang_thai VARCHAR(50),
    ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
    ma_thanh_vien INT,
    ma_to_chuc INT,
    ma_bai_dang INT,
    ma_san_pham INT,

    FOREIGN KEY (ma_thanh_vien) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_to_chuc) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_bai_dang) REFERENCES bai_dang(ma_bai_dang)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE dong_phi_thanh_vien (
    ma_dong_phi INT AUTO_INCREMENT PRIMARY KEY,
    ma_thanh_vien INT,
    ma_to_chuc INT,
    so_tien DECIMAL(12,2) NOT NULL,
    anh_xac_nhan VARCHAR(255),
    trang_thai VARCHAR(50),
    ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
    han DATETIME,

    FOREIGN KEY (ma_thanh_vien) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_to_chuc) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE thanh_toan (
    ma_thanh_toan INT AUTO_INCREMENT PRIMARY KEY,
    ma_thanh_vien_gui INT,
    ma_thanh_vien_nhan INT,
    ma_to_chuc_nhan INT,
    ma_san_pham INT,
    so_tien_giao_dich DECIMAL(12,2) NOT NULL,
    anh_xac_nhan_giao_dich VARCHAR(255),
    ghi_chu TEXT,
    trang_thai VARCHAR(50),
    ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ma_thanh_vien_gui) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_thanh_vien_nhan) REFERENCES thanh_vien(ma_thanh_vien)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_to_chuc_nhan) REFERENCES to_chuc(ma_to_chuc)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
