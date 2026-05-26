const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
