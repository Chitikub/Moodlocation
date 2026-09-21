"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Mail,
  Lock,
  UserCircle,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "@/api/axios";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleNavigation = (path) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
      setErrors({});
    }, 250);
  };

  const inputWrapperClass = (field) =>
    `flex items-center gap-3 w-full rounded-2xl border bg-white md:bg-[#f8fafc] px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-[#FF7F67]/40 focus-within:bg-white focus-within:border-[#FF7F67] shadow-sm md:shadow-none ${
      errors[field]
        ? "border-red-500 ring-1 ring-red-500"
        : "border-transparent md:border-transparent border-gray-100"
    }`;

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!form.email.trim()) e.email = "กรุณากรอกอีเมล";
    if (!form.gender) e.gender = "กรุณาเลือกเพศ";
    if (!form.password) {
      e.password = "กรุณากรอกรหัสผ่าน";
    } else if (form.password.length < 8) {
      e.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }else if (/[ก-๛]/.test(form.password)) {  // เพิ่มเงื่อนไขนี้เพื่อดักจับภาษาไทย
      e.password = "รหัสผ่านต้องไม่มีภาษาไทย";
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว";
    } else if (!/[0-9]/.test(form.password)) {
      e.password = "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      e.password = "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว";
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await api.post("/auth/register", form);

      if (response.data) {
        await Swal.fire({
          icon: "info",
          title: "สมัครสมาชิกสำเร็จ!",
          text: "กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ (หากหาไม่เจอโปรดดูที่จดหมายขยะ)",
          confirmButtonColor: "#FF7F67",
          customClass: { popup: "rounded-[30px]" },
        });
        handleNavigation("/login"); // ส่งไปหน้า Login หลังจากสมัครเสร็จ
      }
    } catch (error) {
      console.error("Auth Error:", error.response?.data);
      const msg = error.response?.data?.message || "";

      Swal.fire({
        icon: "error",
        title: "สมัครสมาชิกไม่สำเร็จ",
        text: msg || "เกิดข้อผิดพลาดในการสมัครสมาชิก โปรดลองใหม่อีกครั้ง",
        customClass: { popup: "rounded-[30px]" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#FDF8F1] py-8 md:py-12 px-4 relative overflow-hidden font-['Kanit',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;800&display=swap');
        * { font-family: 'Kanit', sans-serif; }
      `}</style>

      {/* Background blobs (Desktop only) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/10 rounded-full blur-[100px]" />
      </div>

      <div
        className={`w-full max-w-lg relative z-10 transition-all duration-500 transform ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"
        }`}
      >
        {/* Back Button (Desktop only) */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 hidden md:flex items-center gap-2 text-gray-500 hover:text-[#FF7F67] transition-colors font-medium group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />{" "}
          ย้อนกลับ
        </button>

        <div className="bg-transparent md:bg-white rounded-[40px] p-2 md:p-12 md:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:border md:border-white">
          
          {/* Top Switcher (Desktop only) */}
          <div className="hidden md:flex relative bg-gray-100 p-1.5 rounded-2xl mb-10 h-14 items-center border border-gray-200/50">
            <div className="absolute top-1.5 bottom-1.5 left-1/2 transition-all duration-500 rounded-xl shadow-md bg-gradient-to-r from-[#FF7F67] to-[#FFB385] w-[calc(50%-6px)]" />
            <button
              type="button"
              onClick={() => handleNavigation("/login")}
              className="relative flex-1 h-full font-bold z-10 transition-colors duration-300 text-gray-400"
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              className="relative flex-1 h-full font-bold z-10 transition-colors duration-300 text-white cursor-default"
            >
              สมัครสมาชิก
            </button>
          </div>

          {/* Logo & Title (Mobile only) */}
          <div className="md:hidden flex flex-col items-center mb-8 mt-4">
            <img 
              src="/logo1.png" 
              alt="Mood Location Logo" 
              className="w-[88px] h-[88px] rounded-[28px] shadow-sm mb-4 object-cover bg-white" 
            />
            <h1 className="text-2xl font-black text-[#4A453A] leading-tight mt-2">
              Mood Location
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              ค้นหาที่ที่ใช่ สำหรับใจคุณ
            </p>
          </div>

          {/* Title (Desktop only) */}
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-3xl font-black text-[#4A453A] leading-tight">
              สร้างบัญชีใหม่
            </h1>
            <p className="text-gray-500 mt-2">เริ่มต้นการเดินทางไปกับ Moodlocation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#475569] ml-1">ชื่อ</label>
                <div className={inputWrapperClass("firstName")}>
                  <User className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                  <input
                    type="text"
                    placeholder="ชื่อจริง"
                    autoComplete="given-name"
                    className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#475569] ml-1">นามสกุล</label>
                <div className={inputWrapperClass("lastName")}>
                  <UserCircle className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                  <input
                    type="text"
                    placeholder="นามสกุล"
                    autoComplete="family-name"
                    className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#475569] ml-1">อีเมล</label>
              <div className={inputWrapperClass("email")}>
                <Mail className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                <input
                  type="email"
                  placeholder="example@mail.com"
                  autoComplete="username"
                  className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#475569] ml-1">ตั้งรหัสผ่าน</label>
              <div className={inputWrapperClass("password")}>
                <Lock className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่านของคุณ"
                  autoComplete="new-password"
                  className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300 tracking-widest"
                  value={form.password}
                  onFocus={() => setIsPasswordFocused(true)}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password}</p>}
              {isPasswordFocused && (
                <div className="space-y-1 rounded-xl bg-[#FFF8F3] px-3 py-2 text-xs font-medium">
                  {[  
                    { valid: form.password.length >= 8, label: "มีอย่างน้อย 8 ตัวอักษร" },
                    { valid: /[A-Z]/.test(form.password), label: "มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว" },
                    { valid: !/[ก-๛]/.test(form.password), label: "รหัสผ่านต้องไม่มีภาษาไทย" },
                    { valid: /[0-9]/.test(form.password), label: "มีตัวเลขอย่างน้อย 1 ตัว" },
                    { valid: /[^A-Za-zก-์0-9]/.test(form.password), label: "มีอักขระพิเศษอย่างน้อย 1 ตัว" },
                  ].map((requirement) => (
                    <div key={requirement.label} className={`flex items-center gap-2 ${requirement.valid ? "text-green-600" : "text-red-500"}`}>
                      {requirement.valid ? <Check size={14} /> : <X size={14} />}
                      <span>{requirement.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5 animate-in fade-in duration-500">
              <label className="text-sm font-bold text-[#475569] ml-1">ยืนยันรหัสผ่านอีกครั้ง</label>
              <div className={inputWrapperClass("confirmPassword")}>
                <ShieldCheck className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="ยืนยันรหัสผ่าน"
                  autoComplete="new-password"
                  className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300 tracking-widest"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 ml-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Gender Field */}
            <div className="space-y-3 animate-in fade-in duration-700">
              <label className="text-sm font-bold text-[#475569] ml-1">เพศ</label>
              <div className="relative flex bg-white md:bg-gray-100 p-1 rounded-2xl h-11 items-center shadow-sm md:shadow-none border border-gray-100 md:border-none">
                <div
                  className={`absolute top-1 bottom-1 transition-all duration-500 rounded-xl z-0 ${
                    form.gender === "male"
                      ? "left-1 w-[32%] bg-blue-500"
                      : form.gender === "female"
                      ? "left-[34%] w-[32%] bg-pink-500"
                      : form.gender === "other"
                      ? "left-[67%] w-[32%] bg-purple-500"
                      : "opacity-0"
                  }`}
                />
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`relative flex-1 h-full font-bold z-10 transition-colors ${
                      form.gender === g ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {g === "male" ? "ชาย" : g === "female" ? "หญิง" : "อื่นๆ"}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-red-500 ml-1">{errors.gender}</p>}
            </div>

            {/* Submit Button */}
            <button
              className="w-full h-[52px] rounded-2xl font-bold bg-[#FF8C73] text-white shadow-[0_4px_14px_0_rgba(255,140,115,0.39)] hover:bg-[#FF7F67] hover:shadow-[0_6px_20px_rgba(255,127,103,0.23)] active:scale-95 transition-all mt-6 text-lg"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "กำลังประมวลผล..." : "สร้างบัญชีสมาชิก"}
            </button>
          </form>

  

            <div className="mt-10 text-center text-sm font-medium text-gray-500">
              มีบัญชีอยู่แล้ว?{" "}
              <button
                type="button"
                onClick={() => handleNavigation("/login")}
                className="text-[#FF7F67] font-bold hover:underline"
              >
                เข้าสู่ระบบที่นี่
              </button>
            </div>
          </div>

        </div>
    </main>
  );
}