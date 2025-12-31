import express from "express";
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- MySQL connection ---
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("⚠️ DB connection failed:", err.message);
  } else {
    console.log("✅ MySQL connected");
  }
});

// --- Test insert route ---
app.post("/api/test-insert", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  db.query(
    "INSERT INTO test_table (name) VALUES (?)",
    [name],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Inserted successfully!", id: results.insertId });
    }
  );
});

// --- Health check ---
app.get("/", (req, res) => res.send("Server is running for Pager King Backend"));

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
