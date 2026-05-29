import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LuArrowLeft,
  LuCalendar,
  LuClock,
  LuHeart,
  LuMapPin,
  LuPackagePlus,
  LuShoppingBag,
  LuUpload,
} from "react-icons/lu";
import "./CommunityPages.css";

const API = "http://localhost:5000/api";

const initialDonationProductForm = {
  ten_san_pham: "",
  gia: "",
  mo_ta: "",
  ma_danh_muc: "",
  tinh_trang: "Như mới",
  so_luong: 1,
  so_phan_tram_quyen_gop: 40,
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getDonationTypeLabel(type) {
  if (type === "nhan_tien_chuyen_khoan") return "Nhận tiền chuyển khoản";
  if (type === "ban_do_quyen_gop") return "Bán đồ quyên góp";
  if (type === "nhan_do_vat") return "Nhận đồ vật";
  return type || "Chưa cập nhật";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function getAssetUrl(path) {
  if (!path) return "/images/school-market-icon-v2.png";
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`;
}

function isTransferEvent(event) {
  return event.hinh_thuc_quyen_gop === "nhan_tien_chuyen_khoan";
}

function isDonationSaleEvent(event) {
  return event.hinh_thuc_quyen_gop === "ban_do_quyen_gop";
}

function isItemDonationEvent(event) {
  return event.hinh_thuc_quyen_gop === "nhan_do_vat";
}

function canJoinTransferEvent(event) {
  return isTransferEvent(event) && Boolean(event.ma_qr_quyen_gop) && Number(event.so_tien_toi_thieu || 0) > 0;
}

function DonorList({ donors }) {
  return (
    <div className="donor-list-box">
      <h4>Người đã quyên góp</h4>
      {donors.length === 0 ? (
        <p>Chưa có thành viên nào được xác nhận quyên góp.</p>
      ) : (
        <ul className="donor-list">
          {donors.map((donor, index) => (
            <li key={`${donor.ho_ten}-${donor.lop}-${index}`}>
              {donor.anh_bien_lai && donor.loai_dong_gop === "nhan_do_vat" && (
                <img className="donor-item-image" src={getAssetUrl(donor.anh_bien_lai)} alt="Đồ vật quyên góp" />
              )}
              <strong>{donor.ho_ten}</strong>
              {Number(donor.so_luong_do_vat || 0) > 0 && <em>{donor.so_luong_do_vat} món</em>}
              <span>{donor.lop || "Chưa cập nhật lớp"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventProducts({ products, token, accountType, onLoginRequired, onBuyProductClick, onError }) {
  const handleBuy = (product) => {
    if (!token) {
      onLoginRequired?.();
      return;
    }

    if (accountType !== "thanh_vien") {
      onError?.("Chỉ thành viên mới có thể mua sản phẩm quyên góp.");
      return;
    }

    onBuyProductClick?.(product.ma_san_pham, 1);
  };

  return (
    <div className="event-products-box">
      <h4>Sản phẩm quyên góp đã duyệt</h4>
      {products.length === 0 ? (
        <p>Chưa có sản phẩm nào được admin duyệt cho sự kiện này.</p>
      ) : (
        <div className="event-products-grid">
          {products.map((product) => (
            <article className="event-product-card" key={product.ma_san_pham}>
              <img
                src={getAssetUrl(product.anh)}
                alt={product.ten_san_pham || "Sản phẩm quyên góp"}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/school-market-icon-v2.png";
                }}
              />
              <div className="event-product-body">
                <div>
                  <span className="event-product-category">{product.ten_danh_muc || "Chưa phân loại"}</span>
                  <h5>{product.ten_san_pham}</h5>
                </div>
                <strong className="event-product-price">{formatCurrency(product.gia)}</strong>
                <div className="event-product-meta">
                  <span>Tình trạng: {product.tinh_trang || "Chưa cập nhật"}</span>
                  <span>Số lượng: {product.so_luong || 0}</span>
                  <span>Người bán: {product.ten_nguoi_ban || "Thành viên"}</span>
                  <span>Quyên góp: {Number(product.so_phan_tram_quyen_gop || 0)}%</span>
                </div>
                {product.mo_ta && <p>{product.mo_ta}</p>}
                <button
                  type="button"
                  className="community-primary-button"
                  onClick={() => handleBuy(product)}
                  disabled={Boolean(token) && accountType !== "thanh_vien"}
                >
                  <LuShoppingBag size={16} /> Mua để quyên góp
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DonationEventsPage({
  token,
  accountType,
  onBackHome,
  onLoginRequired,
  onBuyProductClick,
}) {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contributionMessage, setContributionMessage] = useState("");
  const [contributionError, setContributionError] = useState("");
  const [itemEvent, setItemEvent] = useState(null);
  const [itemFile, setItemFile] = useState(null);
  const [itemPreview, setItemPreview] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemMessage, setItemMessage] = useState("");
  const [itemError, setItemError] = useState("");
  const [productFormEvent, setProductFormEvent] = useState(null);
  const [productForm, setProductForm] = useState(initialDonationProductForm);
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState("");
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productMessage, setProductMessage] = useState("");
  const [productError, setProductError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`${API}/campaigns`);
        const campaignList = Array.isArray(res.data) ? res.data : [];
        const campaignsWithProducts = await Promise.all(
          campaignList.map(async (event) => {
            if (!isDonationSaleEvent(event)) {
              return { ...event, san_pham_quyen_gop: [] };
            }

            try {
              const productsRes = await axios.get(`${API}/products/campaign/${event.ma_hoat_dong}`);
              return {
                ...event,
                san_pham_quyen_gop: Array.isArray(productsRes.data) ? productsRes.data : [],
              };
            } catch {
              return { ...event, san_pham_quyen_gop: [] };
            }
          })
        );

        if (mounted) setEvents(campaignsWithProducts);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Không thể tải danh sách sự kiện quyên góp.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    axios.get(`${API}/products/categories`)
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!receipt) {
      setReceiptPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(receipt);
    setReceiptPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receipt]);

  useEffect(() => {
    if (!itemFile) {
      setItemPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(itemFile);
    setItemPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [itemFile]);

  useEffect(() => {
    if (!productFile) {
      setProductPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(productFile);
    setProductPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [productFile]);

  const refreshCampaignProducts = async (campaignId) => {
    try {
      const productsRes = await axios.get(`${API}/products/campaign/${campaignId}`);
      const nextProducts = Array.isArray(productsRes.data) ? productsRes.data : [];
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.ma_hoat_dong === campaignId ? { ...event, san_pham_quyen_gop: nextProducts } : event
        )
      );
      setProductFormEvent((currentEvent) =>
        currentEvent?.ma_hoat_dong === campaignId
          ? { ...currentEvent, san_pham_quyen_gop: nextProducts }
          : currentEvent
      );
    } catch {
      // Product is still pending admin review, so the public list may legitimately stay unchanged.
    }
  };

  const openContributionPage = (event) => {
    if (!canJoinTransferEvent(event)) return;

    if (!token) {
      onLoginRequired?.();
      return;
    }

    if (accountType !== "thanh_vien") {
      setError("Chỉ thành viên mới có thể tham gia quyên góp.");
      return;
    }

    setSelectedEvent(event);
    setAmount(String(Number(event.so_tien_toi_thieu || 0)));
    setReceipt(null);
    setNote("");
    setContributionMessage("");
    setContributionError("");
  };

  const closeContributionPage = () => {
    setSelectedEvent(null);
    setReceipt(null);
    setReceiptPreview("");
    setAmount("");
    setNote("");
    setContributionMessage("");
    setContributionError("");
  };

  const openItemContributionPage = (event) => {
    if (!isItemDonationEvent(event)) return;

    if (!token) {
      onLoginRequired?.();
      return;
    }

    if (accountType !== "thanh_vien") {
      setError("Chỉ thành viên mới có thể tham gia quyên góp.");
      return;
    }

    setItemEvent(event);
    setItemFile(null);
    setItemQuantity(1);
    setItemNote("");
    setItemMessage("");
    setItemError("");
  };

  const closeItemContributionPage = () => {
    setItemEvent(null);
    setItemFile(null);
    setItemPreview("");
    setItemQuantity(1);
    setItemNote("");
    setItemMessage("");
    setItemError("");
  };

  const openDonationProductForm = (event) => {
    if (!isDonationSaleEvent(event)) return;

    if (!token) {
      onLoginRequired?.();
      return;
    }

    if (accountType !== "thanh_vien") {
      setError("Chỉ thành viên mới có thể đăng sản phẩm quyên góp.");
      return;
    }

    setProductFormEvent(event);
    setProductForm(initialDonationProductForm);
    setProductFile(null);
    setProductMessage("");
    setProductError("");
  };

  const closeDonationProductForm = () => {
    setProductFormEvent(null);
    setProductForm(initialDonationProductForm);
    setProductFile(null);
    setProductPreview("");
    setProductMessage("");
    setProductError("");
  };

  const submitContribution = async () => {
    setContributionMessage("");
    setContributionError("");

    if (!selectedEvent) return;

    if (!receipt) {
      setContributionError("Vui lòng tải lên biên lai chuyển khoản.");
      return;
    }

    const numericAmount = Number(amount || 0);
    const minimumAmount = Number(selectedEvent.so_tien_toi_thieu || 0);
    if (!Number.isFinite(numericAmount) || numericAmount < minimumAmount) {
      setContributionError(`Số tiền tối thiểu là ${formatCurrency(minimumAmount)}.`);
      return;
    }

    const formData = new FormData();
    formData.append("receipt", receipt);
    formData.append("so_tien", String(numericAmount));
    formData.append("ghi_chu", note);

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/campaigns/${selectedEvent.ma_hoat_dong}/contributions`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContributionMessage(res.data.message || "Đã gửi biên lai cho tổ chức xác nhận.");
      setReceipt(null);
      setNote("");
    } catch (err) {
      setContributionError(err.response?.data?.message || "Không thể gửi biên lai quyên góp.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitItemContribution = async () => {
    setItemMessage("");
    setItemError("");

    if (!itemEvent) return;

    if (!itemFile) {
      setItemError("Vui lòng tải lên ảnh đồ vật quyên góp.");
      return;
    }

    const numericQuantity = Number(itemQuantity || 0);
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      setItemError("Vui lòng nhập số lượng hợp lệ.");
      return;
    }

    const formData = new FormData();
    formData.append("receipt", itemFile);
    formData.append("so_luong_do_vat", String(numericQuantity));
    formData.append("ghi_chu", itemNote);

    setItemSubmitting(true);

    try {
      const res = await axios.post(`${API}/campaigns/${itemEvent.ma_hoat_dong}/contributions`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const nextDonor = {
        ho_ten: "Bạn",
        lop: "",
        loai_dong_gop: "nhan_do_vat",
        so_luong_do_vat: numericQuantity,
        anh_bien_lai: res.data.anh_bien_lai,
        ghi_chu: itemNote,
      };
      setItemEvent((currentEvent) => currentEvent ? {
        ...currentEvent,
        nguoi_quyen_gop: [nextDonor, ...(currentEvent.nguoi_quyen_gop || [])],
      } : currentEvent);
      setEvents((currentEvents) => currentEvents.map((event) => (
        event.ma_hoat_dong === itemEvent.ma_hoat_dong
          ? { ...event, nguoi_quyen_gop: [nextDonor, ...(event.nguoi_quyen_gop || [])] }
          : event
      )));
      setItemMessage(res.data.message || "Đã ghi nhận đồ vật quyên góp.");
      setItemFile(null);
      setItemQuantity(1);
      setItemNote("");
    } catch (err) {
      setItemError(err.response?.data?.message || "Không thể gửi thông tin đồ vật quyên góp.");
    } finally {
      setItemSubmitting(false);
    }
  };

  const submitDonationProduct = async () => {
    setProductMessage("");
    setProductError("");

    if (!productFormEvent) return;

    if (!productForm.ten_san_pham.trim()) {
      setProductError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!productForm.ma_danh_muc) {
      setProductError("Vui lòng chọn danh mục.");
      return;
    }

    if (Number(productForm.gia || 0) <= 0) {
      setProductError("Vui lòng nhập giá bán hợp lệ.");
      return;
    }

    if (Number(productForm.so_luong || 0) < 1) {
      setProductError("Số lượng phải lớn hơn 0.");
      return;
    }

    const donationPercent = Number(productForm.so_phan_tram_quyen_gop || 0);
    if (donationPercent < 40 || donationPercent > 100) {
      setProductError("Phần trăm quyên góp phải từ 40% đến 100%.");
      return;
    }

    const formData = new FormData();
    if (productFile) {
      formData.append("anh", productFile);
    }
    Object.entries(productForm).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("ma_hoat_dong", String(productFormEvent.ma_hoat_dong));

    setProductSubmitting(true);

    try {
      const res = await axios.post(`${API}/products/create`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductMessage(res.data.message || "Đã gửi sản phẩm quyên góp cho admin duyệt.");
      setProductForm(initialDonationProductForm);
      setProductFile(null);
      await refreshCampaignProducts(productFormEvent.ma_hoat_dong);
    } catch (err) {
      setProductError(err.response?.data?.error || "Không thể đăng sản phẩm quyên góp.");
    } finally {
      setProductSubmitting(false);
    }
  };

  if (itemEvent) {
    return (
      <main className="community-page">
        <section className="community-hero">
          <div>
            <p className="community-kicker">Nhận đồ vật</p>
            <h2 className="community-title">{itemEvent.ten_hoat_dong}</h2>
            <p className="community-subtitle">{itemEvent.chi_tiet_do_vat || itemEvent.mo_ta || "Chưa có chi tiết đồ vật."}</p>
          </div>
          <button type="button" className="community-secondary-button" onClick={closeItemContributionPage}>
            <LuArrowLeft size={16} /> Danh sách sự kiện
          </button>
        </section>

        <section className="community-panel contribution-layout">
          <div className="contribution-event">
            <img
              src={getAssetUrl(itemEvent.anh_minh_hoa)}
              alt={itemEvent.ten_hoat_dong || "Sự kiện quyên góp"}
              className="community-card-image"
            />
            <div className="community-card-body">
              <span className="community-badge"><LuHeart size={14} /> {getDonationTypeLabel(itemEvent.hinh_thuc_quyen_gop)}</span>
              <p className="community-card-text">{itemEvent.mo_ta || "Chưa có mô tả."}</p>
              <div className="community-meta">
                <span><LuMapPin size={15} /> {itemEvent.dia_diem || "Chưa cập nhật địa điểm"}</span>
                <span><LuCalendar size={15} /> Ngày tổ chức: {formatDate(itemEvent.ngay_to_chuc)}</span>
                <span><LuClock size={15} /> Hạn kết thúc: {formatDate(itemEvent.han_ket_thuc)}</span>
                <span>Tổ chức: {itemEvent.ten_to_chuc || "-"}</span>
              </div>
              <div className="contribution-summary inline">
                <span>Đồ vật cần nhận</span>
                <strong>{itemEvent.chi_tiet_do_vat || "Chưa cập nhật"}</strong>
              </div>
              <DonorList donors={itemEvent.nguoi_quyen_gop || []} />
            </div>
          </div>

          <aside className="contribution-payment">
            <h3>Thông tin đồ vật</h3>
            {itemMessage && <p className="community-alert success">{itemMessage}</p>}
            {itemError && <p className="community-alert error">{itemError}</p>}

            <label className="receipt-uploader" htmlFor="itemDonationImageInput">
              <input
                id="itemDonationImageInput"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setItemFile(event.target.files?.[0] || null)}
                disabled={Boolean(itemMessage)}
              />
              {itemPreview ? (
                <img src={itemPreview} alt="Ảnh đồ vật quyên góp" />
              ) : (
                <span><LuUpload size={18} /> Tải lên ảnh đồ vật</span>
              )}
            </label>

            <label className="community-field">
              <span className="community-label">Số lượng</span>
              <input
                className="community-input"
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(event) => setItemQuantity(event.target.value)}
                disabled={Boolean(itemMessage)}
              />
            </label>

            <textarea
              className="community-textarea"
              placeholder="Ghi chú thêm nếu cần..."
              value={itemNote}
              onChange={(event) => setItemNote(event.target.value)}
              disabled={Boolean(itemMessage)}
            />

            <button
              type="button"
              className="community-primary-button"
              onClick={submitItemContribution}
              disabled={itemSubmitting || Boolean(itemMessage)}
            >
              {itemSubmitting ? "Đang gửi..." : "Xác nhận quyên góp"}
            </button>
          </aside>
        </section>
      </main>
    );
  }

  if (productFormEvent) {
    return (
      <main className="community-page">
        <section className="community-hero">
          <div>
            <p className="community-kicker">Bán đồ quyên góp</p>
            <h2 className="community-title">{productFormEvent.ten_hoat_dong}</h2>
            <p className="community-subtitle">
              Sản phẩm đăng lên sự kiện sẽ chờ admin duyệt trước khi hiển thị công khai.
            </p>
          </div>
          <button type="button" className="community-secondary-button" onClick={closeDonationProductForm}>
            <LuArrowLeft size={16} /> Danh sách sự kiện
          </button>
        </section>

        <section className="community-panel donation-product-form-panel">
          {productMessage && <p className="community-alert success">{productMessage}</p>}
          {productError && <p className="community-alert error">{productError}</p>}

          <div className="community-form">
            <label className="community-field">
              <span className="community-label">Ảnh sản phẩm</span>
              <div className="donation-product-image-picker" onClick={() => document.getElementById("donationProductImageInput")?.click()}>
                <input
                  id="donationProductImageInput"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => setProductFile(event.target.files?.[0] || null)}
                />
                {productPreview ? (
                  <img src={productPreview} alt="Xem trước sản phẩm quyên góp" />
                ) : (
                  <span><LuUpload size={18} /> Nhấn để chọn ảnh sản phẩm</span>
                )}
              </div>
            </label>

            <label className="community-field">
              <span className="community-label">Tên sản phẩm</span>
              <input
                className="community-input"
                value={productForm.ten_san_pham}
                onChange={(event) => setProductForm({ ...productForm, ten_san_pham: event.target.value })}
                placeholder="Nhập tên sản phẩm..."
              />
            </label>

            <div className="community-form-grid">
              <label className="community-field">
                <span className="community-label">Danh mục</span>
                <select
                  className="community-select"
                  value={productForm.ma_danh_muc}
                  onChange={(event) => setProductForm({ ...productForm, ma_danh_muc: event.target.value })}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((category) => (
                    <option key={category.ma_danh_muc} value={category.ma_danh_muc}>
                      {category.ten_danh_muc}
                    </option>
                  ))}
                </select>
              </label>

              <label className="community-field">
                <span className="community-label">Tình trạng</span>
                <select
                  className="community-select"
                  value={productForm.tinh_trang}
                  onChange={(event) => setProductForm({ ...productForm, tinh_trang: event.target.value })}
                >
                  <option value="Như mới">Như mới</option>
                  <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                </select>
              </label>
            </div>

            <div className="community-form-grid">
              <label className="community-field">
                <span className="community-label">Giá bán (đ)</span>
                <input
                  className="community-input"
                  type="number"
                  min="1"
                  value={productForm.gia}
                  onChange={(event) => setProductForm({ ...productForm, gia: event.target.value })}
                  placeholder="Nhập giá bán"
                />
              </label>

              <label className="community-field">
                <span className="community-label">Số lượng</span>
                <input
                  className="community-input"
                  type="number"
                  min="1"
                  value={productForm.so_luong}
                  onChange={(event) => setProductForm({ ...productForm, so_luong: event.target.value })}
                />
              </label>
            </div>

            <label className="community-field">
              <span className="community-label">Phần trăm quyên góp</span>
              <input
                className="community-input"
                type="number"
                min="40"
                max="100"
                value={productForm.so_phan_tram_quyen_gop}
                onChange={(event) => setProductForm({ ...productForm, so_phan_tram_quyen_gop: event.target.value })}
              />
            </label>

            <label className="community-field">
              <span className="community-label">Mô tả chi tiết</span>
              <textarea
                className="community-textarea"
                value={productForm.mo_ta}
                onChange={(event) => setProductForm({ ...productForm, mo_ta: event.target.value })}
                placeholder="Nhập mô tả sản phẩm..."
              />
            </label>

            <button
              type="button"
              className="community-primary-button"
              onClick={submitDonationProduct}
              disabled={productSubmitting}
            >
              <LuPackagePlus size={16} /> {productSubmitting ? "Đang gửi..." : "Gửi admin duyệt"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (selectedEvent) {
    return (
      <main className="community-page">
        <section className="community-hero">
          <div>
            <p className="community-kicker">Tham gia quyên góp</p>
            <h2 className="community-title">{selectedEvent.ten_hoat_dong}</h2>
            <p className="community-subtitle">{selectedEvent.mo_ta || "Chưa có mô tả."}</p>
          </div>
          <button type="button" className="community-secondary-button" onClick={closeContributionPage}>
            <LuArrowLeft size={16} /> Danh sách sự kiện
          </button>
        </section>

        <section className="community-panel contribution-layout">
          <div className="contribution-event">
            <img
              src={getAssetUrl(selectedEvent.anh_minh_hoa)}
              alt={selectedEvent.ten_hoat_dong || "Sự kiện quyên góp"}
              className="community-card-image"
            />
            <div className="community-card-body">
              <span className="community-badge"><LuHeart size={14} /> {getDonationTypeLabel(selectedEvent.hinh_thuc_quyen_gop)}</span>
              <div className="community-meta">
                <span><LuMapPin size={15} /> {selectedEvent.dia_diem || "Chưa cập nhật địa điểm"}</span>
                <span><LuCalendar size={15} /> Ngày tổ chức: {formatDate(selectedEvent.ngay_to_chuc)}</span>
                <span><LuClock size={15} /> Hạn kết thúc: {formatDate(selectedEvent.han_ket_thuc)}</span>
                <span>Tổ chức: {selectedEvent.ten_to_chuc || "-"}</span>
              </div>

              <DonorList donors={selectedEvent.nguoi_quyen_gop || []} />
            </div>
          </div>

          <aside className="contribution-payment">
            <h3>Thông tin chuyển khoản</h3>
            <div className="event-qr-box">
              <img src={getAssetUrl(selectedEvent.ma_qr_quyen_gop)} alt="QR quyên góp sự kiện" />
            </div>
            <div className="contribution-summary">
              <span>Số tiền tối thiểu</span>
              <strong>{formatCurrency(selectedEvent.so_tien_toi_thieu)}</strong>
            </div>

            {contributionMessage && <p className="community-alert success">{contributionMessage}</p>}
            {contributionError && <p className="community-alert error">{contributionError}</p>}

            <label className="community-field">
              <span className="community-label">Số tiền đã chuyển</span>
              <input
                className="community-input"
                type="number"
                min={Number(selectedEvent.so_tien_toi_thieu || 0)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={Boolean(contributionMessage)}
              />
            </label>

            <label className="receipt-uploader" htmlFor="eventReceiptInput">
              <input
                id="eventReceiptInput"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setReceipt(event.target.files?.[0] || null)}
                disabled={Boolean(contributionMessage)}
              />
              {receiptPreview ? (
                <img src={receiptPreview} alt="Biên lai chuyển khoản" />
              ) : (
                <span><LuUpload size={18} /> Tải lên biên lai chuyển khoản</span>
              )}
            </label>

            <textarea
              className="community-textarea"
              placeholder="Ghi chú cho tổ chức nếu cần..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={Boolean(contributionMessage)}
            />

            <button
              type="button"
              className="community-primary-button"
              onClick={submitContribution}
              disabled={submitting || Boolean(contributionMessage)}
            >
              {submitting ? "Đang gửi..." : "Gửi biên lai xác nhận"}
            </button>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="community-page">
      <section className="community-hero">
        <div>
          <p className="community-kicker">Quyên góp</p>
          <h2 className="community-title">Sự kiện từ các tổ chức</h2>
          <p className="community-subtitle">
            Danh sách sự kiện quyên góp đã được admin duyệt và đang hiển thị công khai.
          </p>
        </div>
        {onBackHome && (
          <button type="button" className="community-secondary-button" onClick={onBackHome}>
            Về trang chủ
          </button>
        )}
      </section>

      <section className="community-panel">
        <div className="community-section-header">
          <div>
            <h3 className="community-section-title">Danh sách sự kiện</h3>
            <p className="community-section-description">{events.length} sự kiện đang hiển thị</p>
          </div>
        </div>

        {loading ? (
          <p className="community-empty">Đang tải sự kiện...</p>
        ) : error ? (
          <p className="community-alert error">{error}</p>
        ) : events.length === 0 ? (
          <p className="community-empty">Chưa có sự kiện quyên góp nào được duyệt.</p>
        ) : (
          <div className="community-grid">
            {events.map((event) => {
              const saleEvent = isDonationSaleEvent(event);
              const itemDonationEvent = isItemDonationEvent(event);
              const transferEvent = isTransferEvent(event);
              const transferReady = canJoinTransferEvent(event);
              const actionDisabled = transferEvent
                ? !transferReady || (Boolean(token) && accountType !== "thanh_vien")
                : saleEvent
                  ? Boolean(token) && accountType !== "thanh_vien"
                  : itemDonationEvent
                    ? Boolean(token) && accountType !== "thanh_vien"
                    : true;
              const actionLabel = itemDonationEvent
                ? (token && accountType !== "thanh_vien"
                    ? "Chỉ thành viên"
                    : token
                      ? "Tham gia"
                      : "Đăng nhập để tham gia")
                : saleEvent
                ? (token && accountType !== "thanh_vien"
                    ? "Chỉ thành viên"
                    : token
                      ? "Đăng sản phẩm quyên góp"
                      : "Đăng nhập để tham gia")
                : (!transferEvent
                    ? "Chưa hỗ trợ"
                    : !transferReady
                      ? "Chưa sẵn sàng"
                      : token && accountType !== "thanh_vien"
                        ? "Chỉ thành viên"
                        : token
                          ? "Tham gia"
                          : "Đăng nhập để tham gia");

              return (
                <article key={event.ma_hoat_dong} className="community-card">
                  <img
                    src={getAssetUrl(event.anh_minh_hoa)}
                    alt={event.ten_hoat_dong || "Sự kiện quyên góp"}
                    className="community-card-image"
                    onError={(imageEvent) => {
                      imageEvent.currentTarget.onerror = null;
                      imageEvent.currentTarget.src = "/images/school-market-icon-v2.png";
                    }}
                  />
                  <div className="community-card-body">
                    <span className="community-badge"><LuHeart size={14} /> {getDonationTypeLabel(event.hinh_thuc_quyen_gop)}</span>
                    <h3 className="community-card-title">{event.ten_hoat_dong}</h3>
                    <p className="community-card-text">{event.mo_ta || "Chưa có mô tả."}</p>
                    <div className="community-meta">
                      <span><LuMapPin size={15} /> {event.dia_diem || "Chưa cập nhật địa điểm"}</span>
                      <span><LuCalendar size={15} /> Ngày tổ chức: {formatDate(event.ngay_to_chuc)}</span>
                      <span><LuClock size={15} /> Hạn kết thúc: {formatDate(event.han_ket_thuc)}</span>
                      <span>Tổ chức: {event.ten_to_chuc || "-"}</span>
                    </div>
                    {transferEvent && (
                      <div className="contribution-summary inline">
                        <span>Số tiền tối thiểu</span>
                        <strong>{formatCurrency(event.so_tien_toi_thieu)}</strong>
                      </div>
                    )}
                    {itemDonationEvent && (
                      <div className="contribution-summary inline">
                        <span>Đồ vật cần nhận</span>
                        <strong>{event.chi_tiet_do_vat || "Chưa cập nhật"}</strong>
                      </div>
                    )}
                    {saleEvent ? (
                      <EventProducts
                        products={event.san_pham_quyen_gop || []}
                        token={token}
                        accountType={accountType}
                        onLoginRequired={onLoginRequired}
                        onBuyProductClick={onBuyProductClick}
                        onError={setError}
                      />
                    ) : (
                      <DonorList donors={event.nguoi_quyen_gop || []} />
                    )}
                    <button
                      type="button"
                      className="community-primary-button"
                      onClick={() => (
                        saleEvent
                          ? openDonationProductForm(event)
                          : itemDonationEvent
                            ? openItemContributionPage(event)
                            : openContributionPage(event)
                      )}
                      disabled={actionDisabled}
                    >
                      {(saleEvent || itemDonationEvent) && <LuPackagePlus size={16} />}
                      {actionLabel}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
