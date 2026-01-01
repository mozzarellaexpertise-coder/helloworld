import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

dotenv.config();

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(new URL('./firebase-key.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

// 2. Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- ROUTES ---

// TARGETED PAGER: Sends to a specific user_id
app.post("/api/send-pager", async (req, res) => {
  const { from_user_id, to_user_id, message_text } = req.body;

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('fcm_token')
    .eq('user_id', to_user_id)
    .single();

  if (deviceError || !device) {
    return res.status(404).json({ error: "Recipient device not found" });
  }

  const payload = {
    token: device.fcm_token,
    notification: {
      title: 'New Pager!',
      body: message_text || 'Someone is paging you!',
    },
    data: { from_user_id: from_user_id || "anonymous" }
  };

  try {
    await admin.messaging().send(payload);
    res.json({ success: true, message: "Pager sent!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BROADCAST PAGER: Sends to EVERYONE in the devices table
app.post("/api/blast-pager", async (req, res) => {
  const { message_text } = req.body;

  try {
    // We fetch ALL tokens to ensure the test works!
    const { data: devices, error } = await supabase
      .from('devices')
      .select('fcm_token');

    if (error || !devices || devices.length === 0) {
      return res.status(404).json({ error: "No devices found in DB" });
    }

    const tokens = devices.map(d => d.fcm_token);

    const message = {
      notification: {
        title: '📟 PAGER KING ALERT',
        body: message_text || 'Emergency Broadcast!'
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    res.json({ 
      success: true, 
      sent_count: response.successCount,
      failure_count: response.failureCount 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/", (req, res) => res.send("📟 Pager King System: ONLINE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sucker running on port ${PORT}`);
});