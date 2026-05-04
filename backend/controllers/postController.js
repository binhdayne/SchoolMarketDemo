const db = require("../config/db");

exports.createPost = (req, res) => {
    const { title, description, price, type } = req.body;

    db.query(
        "INSERT INTO posts (title, description, price, type, status, user_id) VALUES (?, ?, ?, ?, 'pending', ?)",
        [title, description, price, type, req.user.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Post created, waiting approval" });
        }
    );
};

exports.getApprovedPosts = (req, res) => {
    db.query(
        "SELECT * FROM posts WHERE status='approved'",
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result);
        }
    );
};

exports.getPendingPosts = (req, res) => {
    db.query(
        "SELECT * FROM posts WHERE status='pending'",
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result);
        }
    );
};

exports.approvePost = (req, res) => {
    const { id } = req.params;

    db.query(
        "UPDATE posts SET status='approved' WHERE id=?",
        [id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Approved" });
        }
    );
};

exports.rejectPost = (req, res) => {
    const { id } = req.params;

    db.query(
        "UPDATE posts SET status='rejected' WHERE id=?",
        [id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Rejected" });
        }
    );
};