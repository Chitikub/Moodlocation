"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import api from "@/api/axios";
import Swal from "sweetalert2";

export default function AdminProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States ข้อมูลแอดมิน
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    profileImage: "",
  });
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUser({ ...user, profileImage: reader.result, imageFile: file });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("firstName", user.firstName);
      formData.append("lastName", user.lastName);
      if (user.gender) formData.append("gender", user.gender);

      // ถ้ามีการเลือกรูปใหม่ ให้แนบไฟล์ไปพร้อมกับ FormData
      if (user.imageFile) {
        formData.append("profileImage", user.imageFile);
      }

      // ยิง API ไปอัปเดตข้อมูลที่ Backend
      const res = await api.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // นำข้อมูลใหม่ที่ได้จาก Backend (ซึ่งมี URL ของ Supabase ที่ถูกต้อง) มาบันทึก
      const updatedUser = res.data.user || res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      window.dispatchEvent(new Event("authChange"));

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ!",
        text: "ข้อมูลโปรไฟล์ผู้ดูแลระบบถูกอัปเดตแล้ว",
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: "rounded-[2rem]" },
      });
    } catch (err) {
      console.error("Update Admin Profile Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลได้",
      });
    }
  };
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        text: "กรุณาตรวจสอบการยืนยันรหัสผ่านใหม่",
        confirmButtonColor: "#FF7F67",
      });
    }

    try {
      // 🌟 ใช้ api.put (Interceptor จะจัดการแนบ Bearer Token ให้อัตโนมัติจาก localStorage)

      const payload = {
        currentPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      };

      // ใช้ api instance ที่เราดึง token จาก localStorage ให้อัตโนมัติแล้ว

      await api.put("/users/change-password", payload);

      Swal.fire({
        icon: "success",
        title: "เปลี่ยนรหัสผ่านสำเร็จ!",
        showConfirmButton: false,
        timer: 1500,
      });
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setIsPasswordMode(false);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";

      if (err.response?.status === 401) {
        Swal.fire({
          icon: "error",
          title: "เซสชั่นหมดอายุ",
          text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        });
        navigate("/login");
      } else {
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: errorMsg });
      }
    }
  };
  return (
    <div className="p-6 md:p-10 animate-fade-in font-['Kanit'] bg-[#FDF8F1] min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-[#4A453A] leading-tight">
              โปรไฟล์ <span className="text-[#FF8E6E]">ผู้ดูแลระบบ</span>
            </h1>
            <p className="text-base text-[#7E7869] font-medium opacity-80">
              จัดการข้อมูลส่วนตัวและรหัสผ่านเข้าสู่ระบบหลังบ้าน
            </p>
          </div>
          <button
            onClick={() => setIsPasswordMode(!isPasswordMode)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isPasswordMode ? "bg-[#4A453A] text-white shadow-lg" : "bg-white text-[#FF8E6E] shadow-sm hover:shadow-md"}`}
          >
            {isPasswordMode ? <User size={18} /> : <Lock size={18} />}
            {isPasswordMode ? "กลับไปแก้ไขข้อมูล" : "ตั้งค่ารหัสผ่านใหม่"}
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Card ฝั่งซ้าย: รูปภาพแอดมิน */}
          <div className="w-full lg:w-1/3 flex flex-col items-center">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white w-full flex flex-col items-center text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div
                className="relative group cursor-pointer mb-6"
                onClick={() => fileInputRef.current.click()}
              >
                <div className="w-44 h-44 rounded-full border-[8px] border-[#FDF8F1] overflow-hidden shadow-2xl">
                  <img
                    src={
                      user.profileImage ||
                      `https://ui-avatars.com/api/?name=${user.firstName}&background=4A453A&color=fff&size=200`
                    }
                    alt="Admin Profile"
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="text-white w-10 h-10" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-[#4A453A]">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center gap-2 justify-center mt-2 px-4 py-1.5 bg-[#4A453A] text-white rounded-full text-xs font-bold uppercase tracking-wider">
                <BadgeCheck size={14} className="text-[#FF8E6E]" />{" "}
                Administrator
              </div>
              <p className="text-[#7E7869] text-sm mt-4 font-medium italic">
                {user.email}
              </p>
            </div>
          </div>

          {/* Card ฝั่งขวา: ฟอร์ม (สลับโหมดได้) */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-xl border border-white min-h-[500px]">
              {!isPasswordMode ? (
                /* --- โหมดแก้ไขโปรไฟล์ --- */
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-[#4A453A] ml-2">
                        ชื่อแอดมิน
                      </label>
                      <div className="flex items-center gap-4 bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 transition-all">
                        <User className="w-5 h-5 text-[#FF8E6E]" />
                        <input
                          type="text"
                          value={user.firstName}
                          className="bg-transparent outline-none w-full text-[#4A453A] font-bold"
                          onChange={(e) =>
                            setUser({ ...user, firstName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-[#4A453A] ml-2">
                        นามสกุล
                      </label>
                      <div className="flex items-center gap-4 bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 transition-all">
                        <User className="w-5 h-5 text-[#FF8E6E]" />
                        <input
                          type="text"
                          value={user.lastName}
                          className="bg-transparent outline-none w-full text-[#4A453A] font-bold"
                          onChange={(e) =>
                            setUser({ ...user, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-black text-[#4A453A] ml-2">
                      เพศ
                    </label>
                    <select
                      value={user.gender}
                      onChange={(e) =>
                        setUser({ ...user, gender: e.target.value })
                      }
                      className="w-full bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 outline-none text-[#4A453A] font-bold cursor-pointer"
                    >
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-black text-[#4A453A] ml-2 opacity-50">
                      อีเมล (ใช้เป็น Username สำหรับ Admin - แก้ไขไม่ได้)
                    </label>
                    <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-[1.5rem] border-2 border-gray-100 opacity-60">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={user.email}
                        className="bg-transparent outline-none w-full text-gray-500 font-bold"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleUpdateProfile}
                      className="w-full py-5 rounded-[1.5rem] font-black text-lg bg-gradient-to-r from-[#FF8E6E] to-[#FFB385] text-white shadow-2xl shadow-[#FF8E6E]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Save className="w-6 h-6" /> บันทึกข้อมูลแอดมิน
                    </button>
                  </div>
                </div>
              ) : (
                /* --- โหมดเปลี่ยนรหัสผ่าน --- */
                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-8 animate-fade-in"
                >
                  <div>
                    <h3 className="text-2xl font-black text-[#4A453A]">
                      ตั้งค่ารหัสผ่านผู้ดูแล
                    </h3>
                    <p className="text-sm text-[#7E7869] mt-1 font-medium">
                      เพื่อความปลอดภัย แนะนำให้เปลี่ยนรหัสผ่านทุกๆ 3 เดือน
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-black text-[#4A453A] ml-2">
                      รหัสผ่านปัจจุบัน
                    </label>
                    <div className="relative flex items-center bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 transition-all">
                      <Lock className="w-5 h-5 text-[#FF8E6E] mr-3" />
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        className="bg-transparent outline-none w-full text-[#4A453A] font-bold"
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            oldPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-6 text-[#7E7869]"
                      >
                        {showPass ? <EyeOff size={22} /> : <Eye size={22} />}
                      </button>
                    </div>
                  </div>

                  <hr className="border-dashed border-gray-200" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-[#4A453A] ml-2">
                        รหัสผ่านใหม่
                      </label>
                      <div className="flex items-center bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 transition-all">
                        <Lock className="w-5 h-5 text-[#FF8E6E] mr-3" />
                        <input
                          type="password"
                          required
                          className="bg-transparent outline-none w-full text-[#4A453A] font-bold"
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              newPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-[#4A453A] ml-2">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <div className="flex items-center bg-[#FDF8F1] px-6 py-4 rounded-[1.5rem] border-2 border-transparent focus-within:border-[#FF7F67]/30 transition-all">
                        <ShieldCheck className="w-5 h-5 text-[#FF8E6E] mr-3" />
                        <input
                          type="password"
                          required
                          className="bg-transparent outline-none w-full text-[#4A453A] font-bold"
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setIsPasswordMode(false)}
                      className="flex-1 py-5 rounded-[1.5rem] font-bold bg-gray-100 text-[#7E7869] hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-5 rounded-[1.5rem] font-black text-lg bg-[#4A453A] text-white shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      อัปเดตรหัสผ่านใหม่
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
