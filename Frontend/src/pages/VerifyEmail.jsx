'use client';
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import api from "@/api/axios";
import Swal from "sweetalert2";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token"); // ดึง ?token=xxxx จาก URL

  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("กำลังตรวจสอบการยืนยันอีเมลของคุณ...");

  useEffect(() => {
    const verifyToken = async () => {
      // 1. เช็คว่ามี Token ใน URL ไหม
      if (!token) {
        setStatus("error");
        setMessage("ไม่พบรหัสยืนยันตัวตน (Token) กรุณาตรวจสอบลิงก์ในอีเมลของคุณอีกครั้ง");
        return;
      }

      try {
        // 2. ยิง API ไปหา Backend
        // 💡 ลองเปลี่ยนรูปแบบการยิง API ดูว่า Backend ของคุณรับแบบไหน

        // แบบที่ 1: ส่ง Token ผ่าน URL Params (เช่น /api/v1/auth/verify-email/xxxx)
        const res = await api.get(`/auth/verify-email/${token}`);

        // ⚠️ ถ้า Backend ของคุณรับเป็น Query String ให้เปิดคอมเมนต์บรรทัดล่างแล้วปิดบรรทัดบน
        // const res = await api.get(`/auth/verify-email?token=${token}`);

        setStatus("success");
        setMessage(res.data.message || "ยืนยันอีเมลสำเร็จแล้ว! บัญชีของคุณพร้อมใช้งาน");
        
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'ยืนยันอีเมลเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ',
          confirmButtonColor: '#FF7F67',
          customClass: { popup: 'rounded-[30px]' }
        });
      } catch (error) {
        console.error("Verify Error:", error);
        setStatus("error");
        // แสดงข้อความ Error จาก Backend ถ้ามี หรือแสดงข้อความ Default
        setMessage(error.response?.data?.message || "ลิงก์ยืนยันตัวตนไม่ถูกต้อง หมดอายุ หรือเกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
      }
    };

    verifyToken();
  }, [token]);

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#FDF8F1] px-4 font-['Kanit',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white text-center">
        
        {/* ส่วนแสดงไอคอน */}
        <div className="flex justify-center mb-8">
          {status === "loading" && (
            <div className="relative">
              <Loader2 className="w-20 h-20 text-[#FF7F67] animate-spin" />
              <Mail className="w-8 h-8 text-[#FF7F67] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
          {status === "success" && (
            <div className="bg-green-50 p-6 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="bg-red-50 p-6 rounded-full">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
          )}
        </div>

        {/* ข้อความสถานะ */}
        <h1 className={`text-2xl font-black mb-4 ${
          status === "error" ? "text-red-500" : "text-[#4A453A]"
        }`}>
          {status === "loading" ? "กรุณารอสักครู่" : status === "success" ? "ยืนยันตัวตนสำเร็จ" : "เกิดข้อผิดพลาด"}
        </h1>
        
        <p className="text-[#7E7869] font-medium mb-10 leading-relaxed">
          {message}
        </p>

        {/* ปุ่ม */}
        {status !== "loading" && (
          <button 
            onClick={() => navigate('/login')}
            className="w-full h-14 rounded-2xl font-bold bg-gradient-to-r from-[#FF7F67] to-[#FFB385] text-white shadow-lg shadow-[#FF7F67]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            ไปหน้าเข้าสู่ระบบ <ArrowRight size={20} />
          </button>
        )}
      </div>
    </main>
  );
}