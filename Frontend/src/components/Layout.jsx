"use client";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import AdminSidebar from "./AdminSidebar";
import FloatingChatWidget from "./FloatingChatWidget";
import MobileBottomNav from "./MobileBottomNav";

// ✨ คอมโพเนนต์พื้นหลังฟองสบู่ลอยไปมา
const BubbleBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#FDF8F1]">
      <style>{`
        .bubble {
          position: absolute;
          bottom: -150px;
          /* สีฟองสบู่โทนส้ม-พีช เข้ากับธีมแอป */
          background: radial-gradient(circle at 30% 30%, rgba(255, 142, 110, 0.15), rgba(255, 179, 133, 0.05));
          border-radius: 50%;
          backdrop-filter: blur(2px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          animation: floatUp infinite linear;
        }
        
        /* แอนิเมชันให้ลอยขึ้นไปข้างบนและส่ายเล็กน้อย */
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) translateX(50px) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* สร้างฟองสบู่หลายๆ ขนาดและความเร็วต่างกัน เพื่อให้ดูเป็นธรรมชาติ */}
      <div className="bubble" style={{ left: '10%', width: '80px', height: '80px', animationDuration: '12s', animationDelay: '0s' }} />
      <div className="bubble" style={{ left: '25%', width: '150px', height: '150px', animationDuration: '18s', animationDelay: '4s' }} />
      <div className="bubble" style={{ left: '45%', width: '60px', height: '60px', animationDuration: '10s', animationDelay: '1s' }} />
      <div className="bubble" style={{ left: '65%', width: '110px', height: '110px', animationDuration: '15s', animationDelay: '7s' }} />
      <div className="bubble" style={{ left: '85%', width: '90px', height: '90px', animationDuration: '14s', animationDelay: '2s' }} />
      <div className="bubble" style={{ left: '50%', width: '130px', height: '130px', animationDuration: '20s', animationDelay: '10s' }} />
      <div className="bubble" style={{ left: '80%', width: '50px', height: '50px', animationDuration: '9s', animationDelay: '5s' }} />
    </div>
  );
};

function Layout() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className="flex flex-col min-h-screen relative z-0">
      {/* ✨ นำพื้นหลังฟองสบู่มาใส่ตรงนี้ (จะอยู่ลึกสุดของหน้าจอเสมอ) */}
      <BubbleBackground />

      {/* 1. แสดง Header เฉพาะหน้าบ้านปกติ */}
      {!isAdminPage && <Header />}

      <div className={isAdminPage ? "flex flex-1" : "flex flex-col flex-grow"}>
        {/* 2. แสดง Sidebar เฉพาะหน้าแอดมิน (อยู่ซ้ายมือ) */}
        {isAdminPage && <AdminSidebar />}

        {/* 3. ส่วนเนื้อหาหลัก */}
        <main className="flex-grow w-full bg-transparent">
          <Outlet />
        </main>
      </div>

      {/* 4. แสดง Footer เฉพาะหน้าบ้านปกติ */}
      {!isAdminPage && <Footer />}

      {/* 5. แสดง Bottom Nav เฉพาะมือถือ */}
      {!isAdminPage && <MobileBottomNav />}

      <FloatingChatWidget />
    </div>
  );
}

export default Layout;