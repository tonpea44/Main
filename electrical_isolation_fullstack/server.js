const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Master Data ค่าเริ่มต้น
const initialDevices = [
    { id: "SUB-01", type: "Substation", lat: 13.7563, lng: 100.5018, upstream: "", status: "closed", x: 100, y: 250 },
    { id: "CB-01", type: "Circuit Breaker", lat: 13.7600, lng: 100.5050, upstream: "SUB-01", status: "closed", x: 260, y: 250 },
    { id: "REC-01", type: "Recloser", lat: 13.7650, lng: 100.5100, upstream: "CB-01", status: "closed", x: 440, y: 250 },
    { id: "LBS-01", type: "Load Break Switch", lat: 13.7700, lng: 100.5150, upstream: "REC-01", status: "closed", x: 620, y: 180 },
    { id: "DO-01", type: "Fused Cutout", lat: 13.7750, lng: 100.5200, upstream: "LBS-01", status: "closed", x: 780, y: 180 },
    { id: "LBS-02", type: "Load Break Switch", lat: 13.7710, lng: 100.5180, upstream: "REC-01", status: "closed", x: 620, y: 320 },
    { id: "DO-02", type: "Fused Cutout", lat: 13.7760, lng: 100.5220, upstream: "LBS-02", status: "closed", x: 780, y: 320 }
];

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ devices: initialDevices, token: "" }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function sendLineNotify(token, message) {
    if (!token) return;
    try {
        await axios.post('https://notify-api.line.me/api/notify', 
            `message=${encodeURIComponent(message)}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`
                }
            });
    } catch (err) {
        console.error("LINE Notify Error:", err.message);
    }
}

// REST APIs
app.get('/api/devices', (req, res) => {
    const db = readData();
    res.json(db.devices);
});

app.post('/api/devices', (req, res) => {
    const db = readData();
    const newDev = req.body;
    
    const existingIndex = db.devices.findIndex(d => d.id === newDev.id);
    if (existingIndex >= 0) {
        db.devices[existingIndex] = { ...db.devices[existingIndex], ...newDev };
    } else {
        newDev.x = 200 + (db.devices.length * 100) % 600;
        newDev.y = 150 + (db.devices.length * 70) % 300;
        db.devices.push(newDev);
    }
    
    saveData(db);
    res.json({ success: true, devices: db.devices });
});

app.delete('/api/devices/:id', (req, res) => {
    const db = readData();
    db.devices = db.devices.filter(d => d.id !== req.params.id);
    saveData(db);
    res.json({ success: true, devices: db.devices });
});

app.post('/api/gps/nearest', (req, res) => {
    const { lat, lng } = req.body;
    const db = readData();
    let nearest = null;
    let minDist = Infinity;

    db.devices.forEach(dev => {
        const dist = getDistanceKm(lat, lng, dev.lat, dev.lng);
        if (dist < minDist) {
            minDist = dist;
            nearest = dev;
        }
    });

    if (nearest && db.token) {
        sendLineNotify(db.token, `\n📍 เช็คอินพิกัด GPS หน้างาน:\nอยู่ใกล้เขตอุปกรณ์ ${nearest.id} (${nearest.type})\nระยะห่างประมาณ ${(minDist * 1000).toFixed(0)} เมตร`);
    }

    res.json({ nearest, distanceMeters: (minDist * 1000).toFixed(0) });
});

app.post('/api/isolation/analyze', (req, res) => {
    const { faultId } = req.body;
    const db = readData();
    const faultDev = db.devices.find(d => d.id === faultId);

    if (!faultDev) {
        return res.status(400).json({ error: "ไม่พบรหัสอุปกรณ์ที่ระบุ" });
    }

    let upstreamDev = db.devices.find(d => d.id === faultDev.upstream);

    const steps = [
        { step: 1, action: `ยืนยันจุดเกิดเหตุสายขาด/ชำรุด บริเวณอุปกรณ์ ${faultId}`, status: 'pending' },
        { step: 2, action: `ปลดอุปกรณ์ป้องกันต้นน้ำ (${upstreamDev ? upstreamDev.id : 'SUB-01'}) เพื่อตัดแยกกระแสไฟ (Isolation)`, status: 'pending' },
        { step: 3, action: `ตรวจสอบสโคปพื้นที่ดับไฟ และแจ้งทีมช่างเข้าดำเนินการแก้ไข`, status: 'pending' },
        { step: 4, action: `เมื่อซ่อมแซมเสร็จสิ้น ให้ทำการสับอุปกรณ์ต้นน้ำเพื่อจ่ายไฟคืนระบบ`, status: 'pending' }
    ];

    if (db.token) {
        sendLineNotify(db.token, `\n🚨 แจ้งเหตุสายขาดในระบบ!\nจุดเกิดเหตุ: ${faultId} (${faultDev.type})\nระบบวางขั้นตอน Isolation ปลดสวิตช์ต้นน้ำเรียบร้อยแล้ว`);
    }

    res.json({ faultId, steps });
});

app.post('/api/line/config', (req, res) => {
    const { token } = req.body;
    const db = readData();
    db.token = token;
    saveData(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
