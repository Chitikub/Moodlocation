# MoodLocation

<p align="center">
	<img src="Frontend/public/logo1.png" alt="MoodLocation logo" width="220" />
</p>

[ภาษาไทย](README.md) | [English](README.en.md)

เว็บแอปค้นหาและแนะนำสถานที่ให้เหมาะกับอารมณ์ ความต้องการ และตำแหน่งของผู้ใช้ ผู้ใช้สามารถค้นหาสถานที่ ดูรายละเอียดและแผนที่ จัดการรายการโปรดและประวัติ รวมถึงติดต่อผู้ดูแลผ่านแชทแบบเรียลไทม์

## สารบัญ

- [ความสามารถหลัก](#ความสามารถหลัก)
- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [เริ่มต้นใช้งานแบบ Local](#เริ่มต้นใช้งานแบบ-local)
- [ตั้งค่า Environment Variables](#ตั้งค่า-environment-variables)
- [รันด้วย Docker Compose](#รันด้วย-docker-compose)
- [API โดยสรุป](#api-โดยสรุป)

## ความสามารถหลัก

- สมัครสมาชิก เข้าสู่ระบบด้วยบัญชีทั่วไปหรือ Google ยืนยันอีเมล และรีเซ็ตรหัสผ่าน
- ค้นหาสถานที่ใกล้เคียงและดูรายละเอียดผ่าน Google Maps Platform
- วิเคราะห์ข้อความและอารมณ์เพื่อแนะนำแนวทางค้นหาสถานที่ด้วย Groq AI
- จัดการรายการโปรด ประวัติการเข้าชม และข้อมูลโปรไฟล์
- ติดต่อผู้ดูแลผ่านห้องแชทแบบเรียลไทม์ด้วย Socket.IO
- จัดการผู้ใช้ ประกาศ และห้องติดต่อสำหรับผู้ดูแลระบบ
- รองรับการเก็บรูปภาพผ่าน Supabase Storage เมื่อกำหนดค่าบริการ

## Tech Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, DaisyUI |
| Backend | Node.js 22, Express 4 |
| Database | PostgreSQL, Sequelize 6 |
| Real-time และ Cache | Socket.IO, Redis และ Socket.IO Redis Adapter |
| แผนที่และสถานที่ | Google Maps JavaScript API, Google Maps Places API |
| วิเคราะห์อารมณ์ | Groq API (`groq-sdk`) |
| จัดเก็บไฟล์ | Supabase Storage (ตั้งค่าเพิ่มเติมได้) |
| Deploy แบบ Container | Docker, Docker Compose, Nginx |

## โครงสร้างโปรเจกต์

```text
Moodlocation/
├── Backend/
│   ├── config/          # การตั้งค่าฐานข้อมูลและ Supabase
│   ├── controllers/     # Business logic ของ API
│   ├── lib/             # Socket.IO และการเชื่อมต่อ Redis
│   ├── middleware/      # Authentication และการอัปโหลดไฟล์
│   ├── models/          # Sequelize models
│   ├── routes/          # เส้นทาง API
│   ├── utils/           # ตัวช่วยตรวจสอบและจัดหมวดหมู่อารมณ์/สถานที่
│   ├── uploads/         # ไฟล์อัปโหลดในเครื่อง
│   └── server.js        # จุดเริ่มต้น Backend
├── Frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── api/         # การตั้งค่า Axios
│       ├── components/  # UI components ที่ใช้ซ้ำ
│       ├── data/        # ข้อมูลประกอบหน้าจอ
│       ├── pages/        # หน้าผู้ใช้และหน้าผู้ดูแล
│       ├── Routers/      # การกำหนดเส้นทางหน้าเว็บ
│       ├── App.jsx       # Root component
│       └── main.jsx      # จุดเริ่มต้น Frontend
├── docker-compose.yml   # Frontend, Backend, PostgreSQL, Redis และ pgAdmin
└── README.md
```

## เริ่มต้นใช้งานแบบ Local

### สิ่งที่ต้องมี

- Node.js 22 และ npm
- PostgreSQL ที่ใช้งานได้
- API keys สำหรับ Google Maps และ Groq เพื่อใช้ค้นหาสถานที่และวิเคราะห์อารมณ์
- Redis เป็นตัวเลือกสำหรับการพัฒนาในเครื่อง; Socket.IO มี in-memory fallback หากไม่ได้ตั้งค่า Redis

### 1. ตั้งค่า Backend

สร้างไฟล์ `Backend/.env` และกำหนดค่าตามหัวข้อ [Environment Variables](#ตั้งค่า-environment-variables) จากนั้นติดตั้งและรัน Backend:

```bash
cd Backend
npm install
npm run dev
```

Backend ทำงานที่ `http://localhost:5000` และตรวจสอบสถานะได้ที่ `/` เมื่อเริ่มระบบจะเชื่อมต่อ PostgreSQL และซิงก์ Sequelize models

### 2. ตั้งค่า Frontend

สร้างไฟล์ `Frontend/.env` แล้วกำหนด URL ของ Backend และคีย์ที่ Frontend ใช้:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_IMAGE_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

จากนั้นติดตั้งและเปิด Vite:

```bash
cd Frontend
npm install --legacy-peer-deps
npm run dev
```

เปิด URL ที่ Vite แสดงใน Terminal (โดยปกติคือ `http://localhost:5173`) เพิ่ม origin นี้ใน `CORS_ORIGIN` ของ Backend ด้วย

คำสั่งตรวจสอบ Frontend เพิ่มเติม:

```bash
npm run lint
npm run build
```

## ตั้งค่า Environment Variables

### Backend (`Backend/.env`)

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=moodlocation
DB_USER=postgres
DB_PASSWORD=your-local-db-password
DB_SSL=false

JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=qwen/qwen3.8-27b

# Optional: ใช้ Redis สำหรับ Socket.IO และ cache
REDIS_URL=redis://localhost:6379

# Optional: ใช้ Supabase Storage
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-key
```

`DATABASE_URL` ใช้แทน `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` และ `DB_PASSWORD` ได้ในสภาพแวดล้อมที่ให้ connection string มา เช่น production โดยตั้ง `DB_SSL` ตามข้อกำหนดของผู้ให้บริการฐานข้อมูล

การเข้าสู่ระบบด้วย Google ต้องตั้ง `GOOGLE_CLIENT_ID` ใน Backend และ `VITE_GOOGLE_CLIENT_ID` ใน Frontend ให้เป็น OAuth Client ID เดียวกัน พร้อมเพิ่ม origin ของเว็บใน Google Cloud Console

### Frontend (`Frontend/.env`)

ตัวแปรที่ Frontend ใช้ ได้แก่ `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_IMAGE_BASE_URL`, `VITE_GOOGLE_MAPS_API_KEY` และ `VITE_GOOGLE_CLIENT_ID` ค่า `VITE_*` จะถูกรวมอยู่ในไฟล์ build จึงไม่ควรใส่ secret key ของ Backend ไว้ใน Frontend

## รันด้วย Docker Compose

Compose ที่ root ใช้ `.env` จาก root ของโปรเจกต์เพื่อกำหนดค่าบริการ สร้างไฟล์ดังกล่าวก่อนเริ่ม โดยอย่างน้อยกำหนดค่าฐานข้อมูลและ secret/API keys ที่ต้องใช้ ตัวอย่าง:

```env
DB_NAME=moodlocation_db
DB_USER=postgres
DB_PASSWORD=replace-with-a-local-password
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
FRONTEND_URL=http://localhost:8080

GROQ_API_KEY=your-groq-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_IMAGE_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

ต้องกำหนด `DB_NAME` ค่าเดียวกันให้ PostgreSQL และ Backend ใช้ หากไม่กำหนด ค่าเริ่มต้นของสอง service ใน Compose ไม่ตรงกัน
การเข้าสู่ระบบด้วย Google ตั้งค่าได้ในโหมด Local ตามตัวอย่างด้านบน แต่ Compose ปัจจุบันยังไม่ได้ส่ง `VITE_GOOGLE_CLIENT_ID` เข้า build ของ Frontend จึงยังใช้ Google login ผ่าน Frontend image ที่สร้างด้วย Compose ไม่ได้

เริ่มระบบ:

```bash
docker compose up --build
```

เมื่อ container พร้อมใช้งาน:

- เว็บแอป: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- pgAdmin: `http://localhost:5050`
- PostgreSQL จากเครื่อง host: `localhost:5433`
- Redis: `localhost:6379`

หยุดระบบโดยเก็บข้อมูลใน volumes ไว้:

```bash
docker compose down
```

อย่าเพิ่มไฟล์ `.env` ที่มี credentials จริงลงใน Git

## API โดยสรุป

API หลักใช้ prefix `/api/v1`:

| Prefix | ความสามารถ |
| --- | --- |
| `/auth` | สมัครสมาชิก เข้าสู่ระบบ Google ยืนยันอีเมล และรีเซ็ตรหัสผ่าน |
| `/maps` | ค้นหาสถานที่และดูรายละเอียดสถานที่ |
| `/ai` | วิเคราะห์อารมณ์และสร้างแนวทางค้นหาสถานที่ |
| `/favorites` | เพิ่ม/นำสถานที่ออกจากรายการโปรด และดูรายการโปรด |
| `/history` | บันทึก ดู และลบประวัติการเข้าชม |
| `/users` | แก้ไขโปรไฟล์และเปลี่ยนรหัสผ่าน |
| `/contact` | สร้างห้องติดต่อและจัดการข้อความแชท |
| `/admin` | จัดการผู้ใช้สำหรับผู้ดูแลระบบ |
| `/announcements` | ดูประกาศ และจัดการประกาศสำหรับผู้ดูแลระบบ |

ตัวอย่าง endpoint:

```text
GET  /api/v1/maps/search
GET  /api/v1/maps/details/:place_id
POST /api/v1/ai/analyze-emotion
GET  /api/v1/favorites
POST /api/v1/favorites/toggle
GET  /api/v1/history
```

การแชทใช้ REST API ภายใต้ `/api/v1/contact` ร่วมกับ Socket.IO สำหรับการสื่อสารแบบเรียลไทม์


##Enviroment ของโปรเจกต์

```bash
https://docs.google.com/document/d/1FK0tYeW1HWt6QQCImI7x7xrK-JHjEGapHUiRCV8Vu-w/edit?usp=sharing
```


