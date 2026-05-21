const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
    const authorization = req.headers["authorization"];
    const token = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : authorization;

    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded = jwt.verify(token, "secret");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid token" });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
};

module.exports = { auth, isAdmin };
