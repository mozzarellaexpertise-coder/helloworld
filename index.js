import express from "express";
import { createClient } from "@supabase/supabase-js";
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// 1. FIREBASE CONFIG
const keyPath = '/home/u967580869/domains/plum-antelope-651151.hostingersite.com/public_html/firebase-key.json';
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// 2. SUPABASE CONFIG - USE YOUR SERVICE_ROLE KEY HERE
const SUPABASE_URL = 'https://uygdeyofmqhfnpyrqtpf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z2RleW9mbXFoZm5weXJxdHBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4MjYzMywiZXhwIjoyMDgyMzU4NjMzfQ.Xs9JJx4QcNp-6T531Kf1CuV7pQg-tD0af79LQtNwEvM'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const app = express();
app.use(express.json());

// ROOT ROUTE (To check if server is alive in browser)
app.get("/", (req, res) => {
    res.send("📟 PAGER KING SYSTEM: ONLINE");
});

// THE BLAST ROUTE
app.post("/api/blast-pager", async (req, res) => {
    const { message_text } = req.body;
    console.log("🚀 Blast Request Received!");

    try {
        // Fetch all tokens from the devices table
        const { data: devices, error } = await supabase
            .from('devices')
            .select('fcm_token');

        console.log("DB Data:", devices);
        if (error) console.error("DB Error:", error);

        if (error || !devices || devices.length === 0) {
            return res.status(404).json({ error: "No devices found", details: error });
        }

        const tokens = devices.map(d => d.fcm_token).filter(t => t != null);
        
        const message = {
            notification: {
                title: '📟 PAGER KING',
                body: message_text || 'Wake up!'
            },
            tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log("Firebase Response:", response.successCount, "sent.");
        
        res.json({ success: true, sent: response.successCount });

    } catch (err) {
        console.error("Critical Crash:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sucker running on port ${PORT}`);
});