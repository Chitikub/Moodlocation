"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Mail,
  Lock,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "@/api/axios";
import Cookies from "js-cookie";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // 🌟 State สำหรับจดจำรหัสผ่าน/บัญชี
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

  // 🌟 ดึงข้อมูลอีเมลที่เคยจำไว้ตอนเปิดหน้าเว็บ
  useEffect(() => {
    setIsVisible(true);
    if (isLogin) {
      const savedEmail = localStorage.getItem("rememberedEmail");
      if (savedEmail) {
        setForm((prev) => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    }
  }, [location.pathname, isLogin]);

  const handleNavigation = (path) => {
    if (location.pathname === path) return;
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
    if (!isLogin) {
      if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
      if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
      if (!form.gender) e.gender = "กรุณาเลือกเพศ";
      if (form.password !== form.confirmPassword) {
        e.confirmPassword = "รหัสผ่านไม่ตรงกัน";
      }
    }
    if (!form.email.trim()) e.email = "กรุณากรอกอีเมล";
    if (!form.password) e.password = "กรุณากรอกรหัสผ่าน";
    else if (form.password.length < 8)
      e.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : form;

      const response = await api.post(endpoint, payload);

      if (response.data) {
        // กรณีสมัครสมาชิกสำเร็จ
        if (!isLogin) {
          await Swal.fire({
            icon: "info",
            title: "สมัครสมาชิกสำเร็จ!",
            text: "กรุณาตรวจสอบอีเมลของคุณ และคลิกลิงก์ยืนยันตัวตนก่อนเข้าสู่ระบบ",
            confirmButtonColor: "#FF7F67",
            customClass: { popup: "rounded-[30px]" },
          });
          handleNavigation("/login");
          return;
        }

        // กรณี Login สำเร็จ
        const token = response.data.token;
        const userData = response.data.user || response.data;

        // 🌟 ถ้ายกเลิกการจำฉัน ให้ลบอีเมลทิ้ง แต่ถ้าเลือกไว้ให้บันทึกอีเมล (รหัสผ่านเบราว์เซอร์จะจำให้ผ่าน autoComplete)
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", form.email);
          Cookies.set("token", token, { expires: 7 });
        } else {
          localStorage.removeItem("rememberedEmail");
          Cookies.set("token", token); // ลบเมื่อปิดเบราว์เซอร์
        }

        localStorage.setItem("token", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        localStorage.setItem("user", JSON.stringify(userData));

        window.dispatchEvent(new Event("authChange"));

        await Swal.fire({
          icon: "success",
          title: "เข้าสู่ระบบสำเร็จ!",
          showConfirmButton: false,
          timer: 1500,
          customClass: { popup: "rounded-[30px]" },
        });

        if (userData.role === "admin") navigate("/admin");
        else navigate("/");
      }
    } catch (error) {
      console.error("Auth Error:", error.response?.data);
      const message = error.response?.data?.message || "";

      if (message.includes("verify") || message.includes("ยืนยัน")) {
        Swal.fire({
          icon: "warning",
          title: "ยังไม่ได้ยืนยันอีเมล",
          text: "กรุณายืนยันอีเมลของคุณในกล่องจดหมายก่อนเข้าสู่ระบบ",
          confirmButtonColor: "#FF7F67",
          customClass: { popup: "rounded-[30px]" },
        });
      } else {
        Swal.fire({
          icon: "error",
          title: isLogin ? "เข้าสู่ระบบไม่สำเร็จ" : "สมัครสมาชิกไม่สำเร็จ",
          text: message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          customClass: { popup: "rounded-[30px]" },
        });
      }
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

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF7F67]/10 rounded-full blur-[100px]" />
      </div>

      <div
        className={`w-full max-w-lg relative z-10 transition-all duration-500 transform ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"
        }`}
      >


        {/* ตัด bg-white, padding, shadow, border ออกในหน้าจอ Mobile เพื่อให้โปร่งตามภาพอ้างอิง */}
        <div className="bg-transparent md:bg-white rounded-[40px] p-2 md:p-12 md:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:border md:border-white">
          
          {/* Top Toggle: แสดงเฉพาะ Desktop */}
          <div className="hidden md:flex relative bg-gray-100 p-1.5 rounded-2xl mb-10 h-14 items-center border border-gray-200/50">
            <div
              className={`absolute top-1.5 bottom-1.5 transition-all duration-500 rounded-xl shadow-md bg-gradient-to-r from-[#FF7F67] to-[#FFB385] w-[calc(50%-6px)] ${
                isLogin ? "left-1.5" : "left-1/2"
              }`}
            />
            <button
              type="button"
              onClick={() => handleNavigation("/login")}
              className={`relative flex-1 h-full font-bold z-10 transition-colors duration-300 ${
                isLogin ? "text-white" : "text-gray-400"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/register")}
              className={`relative flex-1 h-full font-bold z-10 transition-colors duration-300 ${
                !isLogin ? "text-white" : "text-gray-400"
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          {/* Logo & Title: แสดงเฉพาะ Mobile */}
          <div className="md:hidden flex flex-col items-center mb-8 mt-4">
            <img 
              src="/logo1.png" 
              alt="Mood Location Logo" 
              className="w-[88px] h-[88px] rounded-[28px] shadow-sm mb-4 object-cover bg-white" 
            />
            <h1 className="text-2xl font-black text-[#4A453A] leading-tight">
              Mood Location
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              ค้นหาที่ที่ใช่ สำหรับใจคุณ
            </p>
          </div>

          {/* Title: แสดงเฉพาะ Desktop */}
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-3xl font-black text-[#4A453A] leading-tight">
              {isLogin ? "ยินดีต้อนรับกลับมา" : "สร้างบัญชีใหม่"}
            </h1>
            <p className="text-gray-500 mt-2">เริ่มต้นการเดินทางไปกับ Moodlocation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
            {!isLogin && (
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
            )}

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
              {errors.email && (
                <p className="text-xs text-red-500 ml-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-[#475569]">
                  {isLogin ? "รหัสผ่าน" : "ตั้งรหัสผ่าน"}
                </label>
                {/* ลืมรหัสผ่าน: จัดตำแหน่งอยู่มุมขวาบนของ input ใน Mobile */}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="md:hidden text-xs font-bold text-[#FF7F67] hover:text-[#FFB385] transition-colors"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
              
              <div className={inputWrapperClass("password")}>
                <Lock className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "••••••••" : "รหัสผ่านของคุณ"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300 tracking-widest"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[1.5]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[1.5]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 ml-1">{errors.password}</p>
              )}
            </div>

            {/* 🌟 Checkbox จดจำรหัสผ่าน และ ลืมรหัสผ่าน (ของ Desktop) */}
            {isLogin && (
              <div className="flex items-center justify-between mt-2 pt-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-[#FF7F67] checked:border-[#FF7F67] transition-colors cursor-pointer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <svg
                      className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-500 group-hover:text-[#4A453A] transition-colors select-none">
                    จดจำรหัสผ่าน
                  </span>
                </label>

                {/* ลืมรหัสผ่านของ Desktop */}
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="hidden md:block text-sm font-medium text-gray-500 hover:text-[#FF7F67] transition-colors"
                >
                  ลืมรหัสผ่านใช่หรือไม่?
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in duration-500">
                <label className="text-sm font-bold text-[#475569] ml-1">
                  ยืนยันรหัสผ่านอีกครั้ง
                </label>
                <div className={inputWrapperClass("confirmPassword")}>
                  <ShieldCheck className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                    autoComplete="new-password"
                    className="bg-transparent outline-none w-full text-[#4A453A] placeholder:text-gray-300"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 stroke-[1.5]" />
                    ) : (
                      <Eye className="w-5 h-5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {!isLogin && (
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
                {errors.gender && (
                  <p className="text-xs text-red-500 ml-1">{errors.gender}</p>
                )}
              </div>
            )}

            <button
              className="w-full h-[52px] rounded-2xl font-bold bg-[#FF8C73] text-white shadow-[0_4px_14px_0_rgba(255,140,115,0.39)] hover:bg-[#FF7F67] hover:shadow-[0_6px_20px_rgba(255,127,103,0.23)] active:scale-95 transition-all mt-6 text-lg"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "กำลังประมวลผล..."
                : isLogin
                ? "เข้าสู่ระบบ"
                : "สร้างบัญชีสมาชิก"}
            </button>
          </form>

    

            <div className="mt-10 text-center text-sm font-medium text-gray-500">
              {isLogin ? (
                <>
                  ยังไม่มีบัญชีใช่ไหม?{" "}
                  <button
                    type="button"
                    onClick={() => handleNavigation("/register")}
                    className="text-[#FF7F67] font-bold hover:underline"
                  >
                    สมัครสมาชิกที่นี่
                  </button>
                </>
              ) : (
                <>
                  มีบัญชีอยู่แล้ว?{" "}
                  <button
                    type="button"
                    onClick={() => handleNavigation("/login")}
                    className="text-[#FF7F67] font-bold hover:underline"
                  >
                    เข้าสู่ระบบที่นี่
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
    </main>
  );
}