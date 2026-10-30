=== วิธีติดตั้งและเรียกใช้งาน Full-Stack Web Application ===

โครงสร้างไฟล์ใน ZIP:
├── server.js            # Node.js + Express Backend REST API
├── package.json         # รายการโปรแกรมที่ต้องใช้ (Dependencies)
├── public/              # โฟลเดอร์สำหรับ Frontend
│   └── index.html       # หน้าจอหลัก (UI + SVG SLD Diagram)
└── README.txt           # คู่มือนี้

ขั้นตอนการรันบนเครื่องคอมพิวเตอร์ของคุณ (Localhost):
1. ตรวจสอบว่าในเครื่องมี Node.js ติดตั้งไว้เรียบร้อยแล้ว
2. แตกไฟล์ ZIP นี้ออกในโฟลเดอร์ที่ต้องการ
3. เปิด Terminal หรือ Command Prompt (CMD) ในโฟลเดอร์นั้น
4. พิมพ์คำสั่งติดตั้งตัวช่วย:
   npm install
5. พิมพ์คำสั่งสั่งรันโปรแกรม:
   npm start
6. เปิดเว็บเบราว์เซอร์ไปที่:
   http://localhost:3000

การนำไป Deploy ขึ้น Cloud ฟรี (เช่น Render.com):
1. อัปโหลดไฟล์ทั้งหมดใน ZIP นี้ขึ้นไปที่ GitHub Repository ของคุณ
2. ไปที่ Render.com -> เลือก New Web Service
3. เลือก Repository นั้น แล้วตั้งค่า:
   - Build Command: npm install
   - Start Command: node server.js
4. กด Deploy คุณจะได้ URL เว็บไซต์จริงที่พร้อมใช้งานสำหรับทีมงานทันที
