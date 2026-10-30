# Electrical Isolation Assistant

เว็บแอป Static สำหรับ GitHub Pages ใช้ HTML, CSS และ JavaScript ล้วน ไม่ต้อง build และไม่ต้องมี server

## Deploy ไป GitHub Pages

1. สร้าง Repository ใหม่บน GitHub เช่น `electrical-isolation`.
2. อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดในชุดนี้ โดยให้ `index.html` อยู่ที่ root ของ repository.
3. เปิด **Settings → Pages**.
4. ใน **Build and deployment** เลือก **Deploy from a branch**.
5. เลือก branch `main` และ folder `/ (root)` แล้วกด **Save**.
6. รอ GitHub สร้างเว็บไซต์ จากนั้นเปิด URL ที่แสดงในหน้า Pages โดยปกติจะเป็น `https://ชื่อผู้ใช้.github.io/electrical-isolation/`.

## การใช้งาน

- แท็บ **อุปกรณ์** ใช้เพิ่ม/แก้ไข/ลบอุปกรณ์และกำหนด Upstream Parent.
- แท็บ **วิเคราะห์เหตุขัดข้อง** เลือกจุดเกิดเหตุเพื่อสร้างแผนตรวจสอบและรายการขั้นตอน.
- แท็บ **ตั้งค่า/ข้อมูล** ใช้ GPS หรือกรอกพิกัด และค้นหาอุปกรณ์ที่ใกล้ที่สุด.
- ปุ่ม **ส่งออกข้อมูล** สำรองทะเบียนอุปกรณ์เป็น JSON; **นำเข้าข้อมูล** คืนค่าจากไฟล์สำรอง.
- ข้อมูลปัจจุบันเก็บใน Local Storage ของเบราว์เซอร์แต่ละเครื่อง.

## ข้อจำกัดสำคัญ

- เป็นเครื่องมือช่วยวิเคราะห์/จัดทำแผน ไม่ใช่ SCADA และไม่มีคำสั่งควบคุมอุปกรณ์จริง.
- แบบจำลองใช้ความสัมพันธ์ Upstream Parent แบบ radial/tree เท่านั้น ยังไม่คำนวณ tie-switch, mesh network, protection coordination, fault current, load flow, DER/backfeed หรือ grounding.
- การระบุอุปกรณ์ต้นน้ำเป็นเพียง candidate จากข้อมูลที่ผู้ใช้ป้อน ไม่ได้ยืนยันว่าเป็นจุดตัดแยกที่ปลอดภัยหรือเพียงพอ.
- ยังไม่มี LINE Messaging API เพราะ GitHub Pages ไม่มี backend สำหรับเก็บ secret token อย่างปลอดภัย.
- Local Storage ไม่ซิงก์ข้อมูลระหว่างผู้ใช้/อุปกรณ์ และอาจถูกลบจาก browser settings.
- GPS บนเว็บต้องใช้ HTTPS และได้รับอนุญาตจากผู้ใช้.

**ห้ามใช้ผลลัพธ์นี้เป็น switching order ที่อนุมัติแล้ว หรือใช้แทนระเบียบปฏิบัติงาน การอนุมัติ และการตรวจสอบโดยผู้มีอำนาจของหน่วยงาน**.
