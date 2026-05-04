const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = (req, res) => {
    const { name, email, password } = req.body;

    const hashed = bcrypt.hashSync(password, 10);

    db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
        [name, email, hashed],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Registered" });
        }
    );
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0) return res.status(404).json({ message: "User not found" });

            const user = result[0];
            const isMatch = bcrypt.compareSync(password, user.password);

            if (!isMatch) return res.status(401).json({ message: "Wrong password" });

            const token = jwt.sign({ id: user.id, role: user.role }, "secret");

            res.json({ token });
        }
    );
};