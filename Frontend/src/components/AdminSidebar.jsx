"use client";
import { useState, useEffect } from "react";
import {
  Users,
  LogOut,
  LayoutDashboard,
  MessageCircle,
  User,
  Menu,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [contactsCount, setContactsCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const userStored = JSON.parse(localStorage.getItem("user"));
    if (userStored?.role !== "admin") return;

    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socket.emit("join_admin_room");
    socket.on("receive_message", () => setContactsCount((prev) => prev + 1));

    return () => socket.close();
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    Swal.fire({
      title: "ต้องการออกจากระบบใช่ไหม?",
      text: "คุณจะต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#FF8E6E",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ใช่, ออกจากระบบ",
      background: "#F9F4E8",
      customClass: { popup: "rounded-[2rem]" },
    }).then((result) => {
      if (result.isConfirmed) {
        document.cookie =
          "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.clear();
        window.dispatchEvent(new Event("authChange"));
        navigate("/login", { replace: true });
      }
    });
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "แดชบอร์ด",
      icon: LayoutDashboard,
      path: "/admin",
    },
    { id: "users", label: "จัดการสมาชิก", icon: Users, path: "/admin/users" },
    {
      id: "messages",
      label: "ตอบแชทผู้ใช้",
      icon: MessageCircle,
      path: "/admin/messages",
      badge: contactsCount,
    },
    {
      id: "profile",
      label: "โปรไฟล์ของฉัน",
      icon: User,
      path: "/admin/profile",
    },
    {
      id: "announcements",
      label: "จัดการประกาศ",
      icon: LayoutDashboard,
      path: "/admin/announcements",
    },
  ];

  return (
    <>
      {/* 🍔 Mobile Toggle — ฝั่งขวา */}
      <div className="md:hidden fixed top-4 right-4 z-[60]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-[#FF8E6E] text-white rounded-2xl shadow-[0_8px_20px_rgba(255,142,110,0.3)] active:scale-90 transition-transform"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — ฝั่งขวา */}
      <aside
        className={`
          fixed md:sticky top-0 right-0 h-screen w-64
          bg-[#FDF8F1] text-[#4A453A] p-5 shadow-[0_12px_35px_rgba(74,69,58,0.12)] border-l border-[#EFE4D8] z-[58]
          transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 mt-12 md:mt-0">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-[#F1E5DA] overflow-hidden">
            <img src="/logo1.png" alt="Mood Location" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="block text-lg font-black tracking-tight font-['Kanit']">Mood Location</span>
            <span className="block text-[11px] font-bold tracking-[0.16em] uppercase text-[#A09690]">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all relative group ${
                  isActive
                    ? "bg-[#FF8E6E] font-bold shadow-[0_8px_18px_rgba(255,142,110,0.25)] text-white"
                    : "text-[#7E7869] hover:bg-white hover:text-[#FF8E6E] hover:shadow-sm"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "scale-110" : "group-hover:scale-110"} transition-transform`}
                />
                <span className="font-medium text-[15px]">{item.label}</span>

                {item.badge > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1 bg-[#E85D5D] text-[10px] flex items-center justify-center rounded-full font-bold animate-bounce text-white border-2 border-[#FDF8F1]">
                    {item.badge}
                  </span>
                )}
              </button>
              
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 text-[#D95D5D] hover:bg-[#FFF0EE] rounded-2xl transition-all mt-auto font-bold border border-[#F3C7C1] active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[15px]">ออกจากระบบ</span>
        </button>
      </aside>
    </>
  );
}
