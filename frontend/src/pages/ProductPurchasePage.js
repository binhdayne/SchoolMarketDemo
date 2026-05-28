import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LuArrowLeft, LuCircleCheck, LuUpload } from 'react-icons/lu';
import './ProductPurchasePage.css';

const API = 'http://localhost:5000/api';

function getAssetUrl(path) {
  if (!path) return '/images/school-market-icon-v2.png';
  if (/^(https?:|data:image\/)/i.test(path)) return path;
  return `http://localhost:5000${path.startsWith('/') ? path : `/${path}`}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
}

export default function ProductPurchasePage({ productId, purchaseQuantity = 1, token, onBackHome }) {
  const [product, setProduct] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedQuantity = product
    ? Math.min(Math.max(1, Number(purchaseQuantity) || 1), Math.max(1, Number(product.so_luong || 0)))
    : Math.max(1, Number(purchaseQuantity) || 1);
  const totalPrice = Number(product?.gia || 0) * selectedQuantity;

  useEffect(() => {
    if (!receipt) {
      setReceiptPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(receipt);
    setReceiptPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receipt]);

  useEffect(() => {
    let isMounted = true;

    if (!productId || !token) {
      setError('Bạn cần đăng nhập bằng tài khoản thành viên để mua hàng.');
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    setError('');

    axios.get(`${API}/products/${productId}/purchase-detail`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (isMounted) setProduct(res.data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.error || 'Không thể tải thông tin sản phẩm.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, token]);

  const submitPurchase = async () => {
    setError('');
    setMessage('');

    if (!receipt) {
      setError('Vui lòng tải lên biên lai chuyển khoản.');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', receipt);
    formData.append('ghi_chu', note);
    formData.append('so_luong_mua', String(selectedQuantity));

    setSubmitting(true);

    try {
      const res = await axios.post(`${API}/products/${productId}/purchase`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message || 'Đã gửi biên lai cho người bán xác nhận.');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xác nhận giao dịch mua hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="purchase-shell">Đang tải thông tin mua hàng...</div>;
  }

  return (
    <div className="purchase-shell">
      <button type="button" className="purchase-back" onClick={onBackHome}>
        <LuArrowLeft size={18} /> Về trang chủ
      </button>

      {error && <p className="purchase-alert error">{error}</p>}
      {message && (
        <div className="purchase-alert success">
          <LuCircleCheck size={18} /> {message}
        </div>
      )}

      {product && (
        <div className="purchase-layout">
          <section className="purchase-product">
            <img
              className="purchase-product-image"
              src={getAssetUrl(product.anh)}
              alt={product.ten_san_pham || 'Sản phẩm'}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/school-market-icon-v2.png';
              }}
            />
            <div className="purchase-product-body">
              <p className="purchase-category">{product.ten_danh_muc || 'Chưa phân loại'}</p>
              <h2>{product.ten_san_pham}</h2>
              <p className="purchase-price">{formatCurrency(totalPrice)}</p>
              <div className="purchase-info-grid">
                <span>Đơn giá</span>
                <strong>{formatCurrency(product.gia)}</strong>
                <span>Số lượng mua</span>
                <strong>{selectedQuantity}</strong>
                <span>Tình trạng</span>
                <strong>{product.tinh_trang || 'Chưa cập nhật'}</strong>
                <span>Còn lại</span>
                <strong>{product.so_luong || 1}</strong>
                <span>Người bán</span>
                <strong>{product.ten_nguoi_ban || 'Thành viên'}</strong>
              </div>
              <p className="purchase-description">{product.mo_ta || 'Chưa có mô tả.'}</p>
            </div>
          </section>

          <aside className="purchase-payment">
            <h3>Thông tin chuyển khoản</h3>
            <div className="seller-qr-box">
              <img src={getAssetUrl(product.ma_ngan_hang)} alt="QR nhận tiền của người bán" />
            </div>
            <div className="purchase-info-grid compact">
              <span>Ngân hàng</span>
              <strong>{product.ten_ngan_hang || 'Chưa cập nhật'}</strong>
              <span>Số tài khoản</span>
              <strong>{product.so_tai_khoan || 'Chưa cập nhật'}</strong>
              <span>Số lượng</span>
              <strong>{selectedQuantity}</strong>
              <span>Số tiền</span>
              <strong>{formatCurrency(totalPrice)}</strong>
            </div>

            <label className="receipt-uploader" htmlFor="receiptInput">
              <input
                id="receiptInput"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setReceipt(event.target.files?.[0] || null)}
                disabled={Boolean(message)}
              />
              {receiptPreview ? (
                <img src={receiptPreview} alt="Biên lai chuyển khoản" />
              ) : (
                <span><LuUpload size={18} /> Tải lên biên lai chuyển khoản</span>
              )}
            </label>

            <textarea
              className="purchase-note"
              placeholder="Ghi chú cho người bán nếu cần..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={Boolean(message)}
            />

            <button
              type="button"
              className="purchase-submit"
              onClick={submitPurchase}
              disabled={submitting || Boolean(message)}
            >
              {submitting ? 'Đang gửi...' : 'Xác nhận đã chuyển khoản'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
