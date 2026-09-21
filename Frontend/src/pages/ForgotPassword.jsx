import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import api from "@/api/axios";
import { distance } from "framer-motion";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      Swal.fire({
        icon: "success",
        title: "ส่งลิงก์สำเร็จ",
        text: response.data.message,
        confirmButtonColor: "#FF7F67",
        customClass: { popup: "rounded-[30px]" },
      });
      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.response?.data?.message || "ไม่สามารถดำเนินการได้",
        confirmButtonColor: "#FF7F67",
        customClass: { popup: "rounded-[30px]" },
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
        <button onClick={() => navigate("/login")} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-[#FF7F67] font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับไปหน้าเข้าสู่ระบบ
        </button>

        <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-[#4A453A] leading-tight">ลืมรหัสผ่าน?</h1>
            <p className="text-gray-500 mt-2 text-sm">
              กรุณากรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้ทางกล่องจดหมาย
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#475569] ml-1">อีเมล</label>
              <div className="flex items-center gap-3 w-full rounded-2xl border bg-[#f8fafc] px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-[#FF7F67]/40 focus-within:bg-white focus-within:border-[#FF7F67]">
                <Mail className="w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="กรอกอีเมลที่ลงทะเบียนไว้"
                  required
                  className="bg-transparent outline-none w-full text-[#4A453A]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl font-bold bg-gradient-to-r from-[#FF7F67] to-[#FFB385] text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? "กำลังส่งข้อมูล..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}