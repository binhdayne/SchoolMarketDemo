const express = require("express");
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));

// --- PHẦN THÊM MỚI (ĐỂ XỬ LÝ LỖI UPLOAD) ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log("Đã tạo thư mục uploads thành công!");
}
app.use('/uploads', express.static('uploads'));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
