import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";
import api from "@/api/axios";

export default function ResetPassword() {
  // ดึง Token จาก URL รูปแบบ ?token=...
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); 
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return Swal.fire({ 
        icon: "error", title: "รหัสผ่านไม่ตรงกัน", text: "กรุณาตรวจสอบการยืนยันรหัสผ่านอีกครั้ง", 
        confirmButtonColor: "#FF7F67", customClass: { popup: "rounded-[30px]" } 
      });
    }
    if (form.password.length < 6) {
      return Swal.fire({ 
        icon: "warning", title: "รหัสผ่านสั้นเกินไป", text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", 
        confirmButtonColor: "#FF7F67", customClass: { popup: "rounded-[30px]" } 
      });
    }
    if (!token) {
      return Swal.fire({ 
        icon: "error", title: "ไม่พบ Token", text: "ลิงก์ไม่สมบูรณ์ กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง", 
        confirmButtonColor: "#FF7F67", customClass: { popup: "rounded-[30px]" } 
      });
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/auth/reset-password/${token}`, {
        newPassword: form.password,
      });
      
      await Swal.fire({
        icon: "success",
        title: "สำเร็จ!",
        text: response.data.message,
        confirmButtonColor: "#FF7F67",
        customClass: { popup: "rounded-[30px]" }
      });
      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.message || "ลิงก์อาจหมดอายุ หรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่",
        confirmButtonColor: "#FF7F67",
        customClass: { popup: "rounded-[30px]" }
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#FDF8F1] py-12 px-4 relative font-['Kanit',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;800&display=swap');
        * { font-family: 'Kanit', sans-serif; }
      `}</style>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-[#4A453A] leading-tight">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-gray-500 mt-2 text-sm">กรุณากำหนดรหัสผ่านใหม่เพื่อเข้าสู่ระบบ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#475569] ml-1">รหัสผ่านใหม่</label>
              <div className="flex items-center gap-3 w-full rounded-2xl border bg-[#f8fafc] px-4 py-3 focus-within:ring-2 focus-within:ring-[#FF7F67]/40 focus-within:border-[#FF7F67]">
                <Lock className="w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่านใหม่"
                  required
                  className="bg-transparent outline-none w-full text-[#4A453A]"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#475569] ml-1">ยืนยันรหัสผ่านใหม่</label>
              <div className="flex items-center gap-3 w-full rounded-2xl border bg-[#f8fafc] px-4 py-3 focus-within:ring-2 focus-within:ring-[#FF7F67]/40 focus-within:border-[#FF7F67]">
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                  required
                  className="bg-transparent outline-none w-full text-[#4A453A]"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl font-bold bg-gradient-to-r from-[#FF7F67] to-[#FFB385] text-white shadow-lg mt-6 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}