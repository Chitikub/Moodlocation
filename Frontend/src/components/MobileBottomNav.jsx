import { useState, useEffect } from "react";
import { 
  Home, 
  Search, 
  Plus, 
  Heart, 
  Menu, 
  User, 
  History, 
  HelpCircle,
  LogOut,
  LogIn
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  // State สำหรับเปิด/ปิด Dropdown เมนู "อื่นๆ"
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // State สำหรับเช็คว่าล็อกอินหรือยัง
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // ดักจับการเปลี่ยนหน้าเพื่อปิด Dropdown
  useEffect(() => {
    setShowMoreMenu(false);
  }, [currentPath]);

  // ดักจับ Event authChange เพื่ออัปเดตสถานะล็อกอินแบบเรียลไทม์
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };
    
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    setShowMoreMenu(false);
    Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      text: "คุณแน่ใจหรือไม่ที่จะออกจากระบบ",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF7F67',
      cancelButtonColor: '#6E7881',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[30px]' }
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberedEmail");
        window.dispatchEvent(new Event("authChange")); // แจ้ง component อื่นๆ ให้รู้ว่าล็อกเอาต์แล้ว
        
        Swal.fire({
          icon: 'success',
          title: 'ออกจากระบบสำเร็จ',
          showConfirmButton: false,
          timer: 1500,
          customClass: { popup: 'rounded-[30px]' }
        });
        navigate("/login");
      }
    });
  };

  const navItems = [
    { to: "/", label: "หน้าแรก", icon: Home },
    { to: "/guide", label: "สำรวจ", icon: Search },
    { to: "/planner", label: "สร้าง", icon: Plus, isCenter: true },
    { to: "/favorites", label: "รายการโปรด", icon: Heart },
    { id: "more", label: "อื่นๆ", icon: Menu }, 
  ];

  // ตรวจสอบว่าหน้าปัจจุบันอยู่ในหมวดหมู่ "อื่นๆ" หรือไม่
  const isMoreActive = showMoreMenu || ["/history", "/profile", "/contact"].includes(currentPath);

  return (
    <>
      {/* 🌟 Overlay พื้นหลังสีดำจางๆ สำหรับคลิกเพื่อปิด Dropdown */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm sm:hidden"
            onClick={() => setShowMoreMenu(false)}
          />
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        {/* 🌟 Dropdown Menu ของ "อื่นๆ" (เด้งขึ้นด้านบน) */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-[95px] right-6 z-50 w-48 rounded-2xl bg-white p-2 shadow-[0_15px_40px_-10px_rgba(74,69,58,0.3)] border border-[#F0E5D8]"
            >
              <Link
                to="/history"
                className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#4A453A] hover:bg-[#FFE7E0] hover:text-[#FF8E6E] transition-colors"
              >
                <History size={18} /> ประวัติ
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#4A453A] hover:bg-[#FFE7E0] hover:text-[#FF8E6E] transition-colors"
              >
                <User size={18} /> โปรไฟล์
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#4A453A] hover:bg-[#FFE7E0] hover:text-[#FF8E6E] transition-colors"
              >
                <HelpCircle size={18} /> ศูนย์ช่วยเหลือ
              </Link>

              {/* เส้นคั่น */}
              <div className="my-1 border-t border-gray-100" />

              {/* 🌟 เช็คสถานะเพื่อแสดงปุ่ม ล็อกเอาต์(สีแดง) หรือ ล็อกอิน(สีเขียว) */}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut size={18} /> ออกจากระบบ
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setShowMoreMenu(false)}
                  className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <LogIn size={18} /> เข้าสู่ระบบ
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 pb-4">
          <div className="w-full rounded-[2rem] bg-white/95 px-3 py-3 shadow-[0_15px_40px_-20px_rgba(74,69,58,0.5)] border border-[#F0E5D8] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                
                // 1. กรณีเป็นปุ่ม "อื่นๆ" (เปิด/ปิด Dropdown)
                if (item.id === "more") {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-all ${
                        isMoreActive ? "text-[#FF8E6E]" : "text-[#7E7869] hover:text-[#FF8E6E]"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${isMoreActive ? "bg-[#FFE7E0]" : "bg-[#F9F4E8]"}`}>
                        <Icon size={18} />
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                }

                // 2. กรณีเป็นปุ่ม "สร้าง" ตรงกลาง (โดดเด่น)
                if (item.isCenter) {
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8E6E] to-[#FFB385] text-white shadow-[0_15px_30px_-20px_rgba(255,142,110,0.7)] transition-transform duration-200 hover:scale-105"
                    >
                      <Icon size={20} />
                    </Link>
                  );
                }

                // 3. กรณีเป็นปุ่มอื่นๆ (หน้าแรก, สำรวจ, รายการโปรด)
                const isActive = currentPath === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-all ${
                      isActive ? "text-[#FF8E6E]" : "text-[#7E7869] hover:text-[#FF8E6E]"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${isActive ? "bg-[#FFE7E0]" : "bg-[#F9F4E8]"}`}>
                      <Icon size={18} />
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}