import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (req, res) => {
  res.send("<h1>Hello World 🦏</h1>");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hello World server running on port ${PORT}`);
});