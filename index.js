import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load your secret key
const serviceAccount = JSON.parse(
  readFileSync(new URL('./firebase-key.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

dotenv.config();

const fruits = ['apple', 'banana', 'orange'];

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Initialize Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/api/send-pager", async (req, res) => {
  const { from_user_id, to_user_id, message_text } = req.body;

  // 1. Get the recipient's FCM token from your 'devices' table
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('fcm_token')
    .eq('user_id', to_user_id)
    .eq('active', true)
    .single();

  if (deviceError || !device) {
    return res.status(404).json({ error: "User device not found or inactive" });
  }

  // 2. Prepare the notification payload
  const payload = {
    token: device.fcm_token,
    notification: {
      title: 'New Pager!',
      body: message_text || 'Someone is paging you!',
    },
    data: {
      from_user_id: from_user_id
    }
  };

  try {
    // 3. Send via Firebase
    await admin.messaging().send(payload);
    
    // 4. Update your DB to say it's sent/delivered
    // (We can add the logic here to update your 'messages' table)

    res.json({ success: true, message: "Pager sent to device!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/blast-pager", async (req, res) => {
  const { message_text } = req.body;

  try {
    // 1. Pull all active tokens from Supabase
    const { data: devices, error } = await supabase
      .from('devices')
      .select('fcm_token')
      .eq('active', true);

    if (error || !devices || devices.length === 0) {
      return res.status(404).json({ error: "No active devices found in DB" });
    }

    // 2. Map them into a list of tokens
    const tokens = devices.map(d => d.fcm_token);

    // 3. Create the message payload
    const message = {
      notification: {
        title: '📟 PAGER KING ALERT',
        body: message_text || 'Emergency Broadcast!'
      },
      tokens: tokens, // Firebase can send to multiple tokens at once
    };

    // 4. Send via Firebase Admin
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

app.get("/api/fruits", async (req, res) => {
  // This line asks Supabase for everything in the fruits table
  const { data, error } = await supabase
    .from('fruits')
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // This returns the REAL data you just inserted with SQL!
  res.json({ source: "Supabase Database", fruits: data });
});

// --- Health check ---
app.get("/", (req, res) => res.send("Server is running with Supabase!"));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});