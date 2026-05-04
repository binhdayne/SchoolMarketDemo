const db = require("../config/db");

exports.createCampaign = (req, res) => {
    const { name, description, start_date, end_date } = req.body;

    db.query(
        "INSERT INTO campaigns (name, description, start_date, end_date) VALUES (?, ?, ?, ?)",
        [name, description, start_date, end_date],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Campaign created" });
        }
    );
};

exports.getCampaigns = (req, res) => {
    db.query("SELECT * FROM campaigns", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};