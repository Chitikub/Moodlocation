"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Camera,
  ArrowLeft,
  Save,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import api, { IMAGE_BASE_URL } from "@/api/axios";
import Swal from "sweetalert2";

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
  const [loading, setLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
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

  // ✅ เปลี่ยนมาเช็ค MIME Type ให้รองรับ .jpg, .jpeg, .png, .webp
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    Swal.fire({
      icon: "error",
      title: "ประเภทไฟล์ไม่ถูกต้อง",
      text: "กรุณาเลือกไฟล์รูปภาพ (.png, .jpg, .jpeg, .webp) เท่านั้น",
    });
    e.target.value = "";
    return;
  }

  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > 10) {
    Swal.fire({
      icon: "error",
      title: "ไฟล์ใหญ่เกินไป!",
      text: "กรุณาเลือกไฟล์ที่ไม่เกิน 10MB",
      confirmButtonColor: "#FF7F67",
    });
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    setUser((prev) => ({
      ...prev,
      profileImage: reader.result, // preview รูปทันที
      imageFile: file,
    }));
  };
  reader.readAsDataURL(file);
};

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!user.firstName?.trim() || !user.lastName?.trim()) {
        Swal.fire({
          icon: "warning",
          title: "ข้อมูลไม่ครบ",
          text: "กรุณากรอกชื่อและนามสกุล",
        });
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("firstName", user.firstName.trim());
      formData.append("lastName", user.lastName.trim());
      formData.append("gender", user.gender || "other");

      if (user.imageFile) {
        formData.append("profileImage", user.imageFile);
      }

      const res = await api.put("/users/profile", formData);

      const updatedUser = res.data.user || res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      window.dispatchEvent(new Event("authChange"));

      Swal.fire({
        icon: "success",
        title: "อัปเดตข้อมูลเรียบร้อย!",
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: "rounded-[30px]" },
      });
    } catch (err) {
      console.error("Update Error:", err);
      const errorMessage = err.response?.data?.message || err.message || "ไม่สามารถอัปเดตข้อมูลได้";
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };
  const newPass = passwords.newPassword;

  const passwordRequirements = [
  { valid: newPass.length >= 8, label: "มีอย่างน้อย 8 ตัวอักษร" },
  { valid: /[A-Z]/.test(newPass), label: "มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว" },
  { valid: !/[ก-๛]/.test(newPass), label: "รหัสผ่านต้องไม่มีภาษาไทย" },
  { valid: /[0-9]/.test(newPass), label: "มีตัวเลขอย่างน้อย 1 ตัว" },
  { valid: /[^A-Za-z0-9ก-๛]/.test(newPass), label: "มีอักขระพิเศษอย่างน้อย 1 ตัว" },
];

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
   const isPasswordValid = passwordRequirements.every((req) => req.valid);
   if (!passwords.newPassword) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกรหัสผ่านใหม่",
        confirmButtonColor: "#FF7F67",
      });
    }

    if (!isPasswordValid) {
      return Swal.fire({
        icon: "warning",
        title: "รหัสผ่านไม่รัดกุม",
        text: "กรุณากรอกรหัสผ่านใหม่ให้ครบตามเงื่อนไขด้านล่าง",
        confirmButtonColor: "#FF7F67",
      });
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        text: "กรุณาตรวจสอบการยืนยันรหัสผ่านใหม่",
        confirmButtonColor: "#FF7F67",
      });
    }

    try {
      const payload = {
        currentPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      };

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

  const getProfileImage = () => {
  if (!user.profileImage)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || 'User')}&background=FF7F67&color=fff&size=200`;
  
  // รูป Preview จาก FileReader (Data URL) ไม่ต้องติด timestamp
  if (user.profileImage.startsWith("data:")) return user.profileImage;
  
  // รูป URL เต็ม (เช่น Cloudinary หรือ URL ภายนอก)
  if (user.profileImage.startsWith("http")) return `${user.profileImage}?t=${Date.now()}`;
  
  // รูปจาก Backend Server ตัวเอง
  return `${IMAGE_BASE_URL}${user.profileImage}?t=${Date.now()}`;
};

  return (
    <div className="min-h-screen bg-[#F6F0E8] pt-5 pb-20 px-4 font-['Prompt',sans-serif]">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#4A453A] shadow-sm hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-[#4A453A]">โปรไฟล์คุณ</h1>
          
        </div>

        {/* Profile Info Card */}
        
        <div className="mt-12 bg-white rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center border border-[#F0E8DF]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div
            className="relative group cursor-pointer mb-4"
            onClick={() => fileInputRef.current.click()}
          >
            <div className="w-24 h-24 rounded-full border-4 border-[#FF8E6E] overflow-hidden shadow-md bg-gray-100">
              <img
                src={getProfileImage()}
                alt="Profile"
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
              />
            </div>
            
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-[#4A453A] text-center">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-[#7E7869] text-center break-all mt-1">
            {user.email}
          </p>
          
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F0E8DF]">
          
          {!isPasswordMode ? (
            
            <div className="space-y-4 animate-in fade-in duration-300">
              
              <button
            onClick={() => setIsPasswordMode(!isPasswordMode)}
            className="px-4 py-2 rounded-full bg-white text-[#FF8E6E] font-bold text-xs shadow-sm hover:shadow-md transition-all ml-51 sm:ml-[300px]"
          >
            
            {isPasswordMode ? "ข้อมูลส่วนตัว" : "เปลี่ยนรหัส"}
          </button>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  ชื่อ
                </label>
                <div className="flex items-center gap-3 bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5]">
                  <User className="w-4 h-4 text-[#FF8E6E] shrink-0" />
                  <input
                    type="text"
                    value={user.firstName}
                    className="bg-transparent outline-none w-full text-sm text-[#4A453A] font-medium"
                    onChange={(e) =>
                      setUser({ ...user, firstName: e.target.value })
                    }
                  />
                </div>
                
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  นามสกุล
                </label>
                <div className="flex items-center gap-3 bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5]">
                  <User className="w-4 h-4 text-[#FF8E6E] shrink-0" />
                  <input
                    type="text"
                    value={user.lastName}
                    className="bg-transparent outline-none w-full text-sm text-[#4A453A] font-medium"
                    onChange={(e) =>
                      setUser({ ...user, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  เพศ
                </label>
                <select
                  value={user.gender}
                  onChange={(e) =>
                    setUser({ ...user, gender: e.target.value })
                  }
                  className="w-full bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5] outline-none text-sm text-[#4A453A] font-medium cursor-pointer"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  อีเมล
                </label>
                <div className="flex items-center gap-3 bg-gray-100 px-3 py-2.5 rounded-xl border border-gray-200 opacity-70">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="email"
                    value={user.email}
                    className="bg-transparent outline-none w-full text-sm text-gray-500 font-medium"
                    readOnly
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full mt-6 py-3 rounded-2xl font-bold bg-[#FF8E6E] text-white shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60 text-sm"
              >
                {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleUpdatePassword}
              className="space-y-4 animate-in fade-in duration-300"
            >
              <h3 className="text-sm font-black text-[#4A453A]">
                ตั้งค่ารหัสผ่านใหม่
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  รหัสผ่านเดิม
                </label>
                <div className="relative flex items-center bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5]">
                  <Lock className="w-4 h-4 text-[#FF8E6E] mr-2 shrink-0" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    className="bg-transparent outline-none w-full text-sm text-[#4A453A] font-medium"
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
                    className="text-[#7E7869]"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  รหัสผ่านใหม่
                </label>
                <div className="flex items-center gap-3 bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5]">
                  <Lock className="w-4 h-4 text-[#FF8E6E] shrink-0" />
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    className="bg-transparent outline-none w-full text-sm text-[#4A453A] font-medium"
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                  />
                <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="text-[#7E7869]"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="space-y-1 rounded-xl bg-[#FFF8F3] px-3 py-2 text-xs font-medium">
    {passwordRequirements.map((requirement) => (
      <div
        key={requirement.label}
        className={`flex items-center gap-2 ${
          requirement.valid ? "text-green-600" : "text-red-500"
        }`}
      >
        {requirement.valid ? <Check size={14} /> : <X size={14} />}
        <span>{requirement.label}</span>
      </div>
    ))}
  </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6F665F] block">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="flex items-center gap-3 bg-[#F8F6F3] px-3 py-2.5 rounded-xl border border-[#E8DED5]">
                  <ShieldCheck className="w-4 h-4 text-[#FF8E6E] shrink-0" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    className="bg-transparent outline-none w-full text-sm text-[#4A453A] font-medium"
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="text-[#7E7869]"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPasswordMode(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-[#7E7869] text-sm hover:bg-gray-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-[#FF8E6E] text-white text-sm hover:shadow-md active:scale-95 transition-all"
                >
                  อัปเดต
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
