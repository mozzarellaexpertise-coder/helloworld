import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Initialize Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- Test insert route ---
app.post("/api/test-insert", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const { data, error } = await supabase
    .from('fruits')
    .insert([{ name }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Big Apple New York!", data });
});

// --- Health check ---
app.get("/", (req, res) => res.send("Server is running with Supabase!"));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});