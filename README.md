# School Market Demo

<p align="center">
  <img src="frontend/public/images/school-market-logo-source.png" alt="School Market" width="180" />
</p>

<p align="center">
  <strong>Nền tảng trao đổi, mua bán và quyên góp đồ cũ trong môi trường học đường.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19.2.5-61DAFB?logo=react&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4.18.2-111827?logo=express&logoColor=white" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" />
</p>

## Giới thiệu

School Market Demo là một hệ thống marketplace nhỏ cho trường học, nơi thành viên có thể đăng bán đồ cũ, mua sản phẩm, đóng góp cho các sự kiện quyên góp và tham gia các hoạt động cộng đồng. Dự án có trang quản trị để kiểm duyệt tài khoản, sản phẩm, sự kiện, bài đăng và xử lý tố cáo/khiếu nại.

Mục tiêu của dự án là mô phỏng một quy trình đầy đủ: đăng ký tài khoản, admin duyệt, đăng sản phẩm hoặc sự kiện, giao dịch có biên lai, thông báo trạng thái và quản lý thanh toán.

## Tính năng chính

| Vai trò | Tính năng |
| --- | --- |
| Khách | Xem sản phẩm công khai, tìm kiếm/lọc danh mục, xem sự kiện quyên góp và bài đăng cộng đồng |
| Thành viên | Đăng bán sản phẩm, mua hàng, tải biên lai, xác nhận giao dịch, cập nhật thông tin nhận tiền/QR, gửi tố cáo khiếu nại |
| Tổ chức | Tạo sự kiện quyên góp, đăng sản phẩm gây quỹ, xác nhận đóng góp, quản lý thanh toán cho người bán |
| Admin | Duyệt/từ chối tài khoản, sản phẩm, sự kiện, bài đăng; cấm/mở cấm tài khoản; xem và xóa tố cáo khiếu nại |

## Công nghệ sử dụng

| Phần | Công nghệ |
| --- | --- |
| Frontend | React, Create React App, Axios, React Icons |
| Backend | Node.js, Express, JWT, bcrypt, Multer |
| Database | MySQL, mysql2 |
| Upload | Lưu file ảnh trong `backend/uploads`, giới hạn 5MB/file |

## Cấu trúc thư mục

```text
SchoolMarketDemo/
|-- Database.sql                 # Script khởi tạo database chính
|-- backend/
|   |-- app.js                   # Express server, mount API routes
|   |-- config/db.js             # Cấu hình kết nối MySQL
|   |-- controllers/             # Xử lý nghiệp vụ
|   |-- middleware/              # Auth JWT và upload ảnh
|   |-- routes/                  # API endpoints
|   `-- uploads/                 # Ảnh/biên lai được upload
`-- frontend/
    |-- public/images/           # Logo và ảnh tĩnh
    `-- src/
        |-- components/          # Component dùng chung
        |-- pages/               # Các màn hình chính
        |-- App.js               # Điều hướng và state tổng
        `-- LandingPage.jsx      # Trang marketplace công khai
```

## Yêu cầu môi trường

- Node.js 18 trở lên
- npm
- MySQL 8.x hoặc tương đương
- Trình duyệt hiện đại

## Cài đặt và chạy dự án

### 1. Clone hoặc mở source

```bash
cd SchoolMarketDemo
```

### 2. Tạo database

Đăng nhập MySQL và import file `Database.sql`:

```bash
mysql -u root -p < Database.sql
```

Database mặc định được tạo với tên:

```text
do_cu_quyen_gop
```

### 3. Cấu hình backend

Mở `backend/config/db.js` và chỉnh thông tin MySQL theo máy của bạn:

```js
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "your_mysql_password",
  database: "do_cu_quyen_gop",
});
```

### 4. Cài dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 5. Chạy backend

Mở terminal thứ nhất:

```bash
cd backend
npm start
```

Backend chạy tại:

```text
http://localhost:5000
```

### 6. Chạy frontend

Mở terminal thứ hai:

```bash
cd frontend
npm start
```

Frontend chạy tại:

```text
http://localhost:3000
```

Frontend đang gọi API mặc định tại `http://localhost:5000/api`.

## Tài khoản admin

File `Database.sql` có seed sẵn tài khoản admin:

| Email | Ghi chú |
| --- | --- |
| `admin@schoolmarket.local` | Dùng để đăng nhập trang quản trị sau khi biết/đặt lại mật khẩu |

Nếu cần đặt lại mật khẩu admin, tạo hash bcrypt mới:

```bash
cd backend
node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync('Admin@123', 10));"
```

Sau đó cập nhật trong MySQL:

```sql
UPDATE nguoi_kiem_duyet
SET mat_khau = '<hash_vua_tao>'
WHERE email = 'admin@schoolmarket.local';
```

Bạn có thể thay `Admin@123` bằng mật khẩu mong muốn.

## Luồng demo gợi ý

1. Import database và chạy backend/frontend.
2. Đăng ký một tài khoản thành viên hoặc tổ chức.
3. Đăng nhập admin để duyệt tài khoản mới.
4. Đăng nhập bằng tài khoản đã duyệt.
5. Thành viên đăng sản phẩm, tổ chức tạo sự kiện quyên góp.
6. Admin duyệt sản phẩm/sự kiện/bài đăng.
7. Thành viên mua hàng hoặc gửi đóng góp, tải biên lai và theo dõi thông báo.

## API chính

| Nhóm | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Admin tài khoản | `GET /api/auth/pending-accounts`, `PUT /api/auth/approve-account/:type/:id`, `PUT /api/auth/reject-account/:type/:id` |
| Sản phẩm | `GET /api/products/public`, `POST /api/products/create`, `PUT /api/products/:id/approve`, `POST /api/products/:id/purchase` |
| Sự kiện quyên góp | `GET /api/campaigns`, `POST /api/campaigns`, `PUT /api/campaigns/:id/approve`, `POST /api/campaigns/:id/contributions` |
| Bài đăng cộng đồng | `GET /api/posts`, `POST /api/posts`, `PUT /api/posts/approve/:id` |
| Khiếu nại | `POST /api/complaints`, `GET /api/complaints`, `DELETE /api/complaints/:id` |
| Thông báo | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/read-all` |

Các endpoint cần đăng nhập sử dụng header:

```http
Authorization: Bearer <token>
```

## Ghi chú phát triển

- Backend đang dùng JWT secret hardcode là `"secret"`. Khi triển khai thật, nên đưa secret vào biến môi trường.
- Cấu hình MySQL hiện nằm trực tiếp trong `backend/config/db.js`. Nên chuyển sang `.env` nếu deploy hoặc chia sẻ public.
- Frontend đang hardcode API base URL trong các file React là `http://localhost:5000/api`.
- File upload được lưu local trong `backend/uploads`; khi deploy cần cấu hình storage bền vững hơn.
- Một số bảng/cột được controller tự bổ sung bằng `ALTER TABLE` khi chạy để tương thích dữ liệu cũ.

## Scripts

| Thư mục | Lệnh | Mô tả |
| --- | --- | --- |
| `backend` | `npm start` | Chạy Express server tại port 5000 |
| `frontend` | `npm start` | Chạy React development server tại port 3000 |
| `frontend` | `npm run build` | Build frontend cho production |
| `frontend` | `npm test` | Chạy test runner của Create React App |

## Tác giả

Dự án demo School Market, xây dựng cho mục tiêu học tập và mô phỏng quy trình marketplace/quyên góp trong trường học.
