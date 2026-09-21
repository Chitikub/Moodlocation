'use client';
import { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar"; // ตรวจสอบ Path ให้ถูกต้อง
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminMessages from "./admin/AdminMessages";
import AdminAnnouncements from "./admin/AdminAnnouncements"; // 🌟 นำเข้าหน้าประกาศระบบที่สร้างใหม่
import { io } from "socket.io-client";

export default function Admin() {
  // 1. สร้าง State สำหรับควบคุมหน้าปัจจุบัน
  const [tab, setTab] = useState("dashboard");
  
  // 2. สร้าง State สำหรับจำนวนแชทที่ยังไม่ได้ตอบ
  const [contactsCount, setContactsCount] = useState(0);

  useEffect(() => {
    // 🔌 เชื่อมต่อ Socket กลางที่หน้าหลัก เพื่อรับแจ้งเตือนทุกหน้า
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socket.emit("join_admin_room");

    socket.on("receive_message", (data) => {
      setContactsCount(prev => prev + 1);
    });

    return () => socket.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF8F1] flex font-['Kanit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;800&display=swap');
        * { font-family: 'Kanit', sans-serif; }
      `}</style>

      {/* --- ส่วน Sidebar: จะอยู่คงที่ทุุกหน้าแอดมิน --- */}
      <AdminSidebar currentTab={tab} setTab={setTab} contactsCount={contactsCount} />

      {/* --- ส่วน Content: จะเปลี่ยนไปตาม Tab ที่เลือก --- */}
      <main className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <AdminDashboard setTab={setTab} />}
        {tab === "users" && <AdminUsers />}
        {tab === "messages" && <AdminMessages setContactsCount={setContactsCount} />}
        
        {/* 🌟 3. เพิ่มเงื่อนไขเปิดหน้าจอกล่องจัดการประกาศเมื่อแอดมินกดสลับแท็บเมนู */}
        {tab === "announcements" && <AdminAnnouncements />}
      </main>
    </div>
  );
}