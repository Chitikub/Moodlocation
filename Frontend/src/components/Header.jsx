"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "bootstrap-icons/font/bootstrap-icons.css";
import api from "@/api/axios";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

// เชื่อมต่อ Socket
const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // 🌟 แจ้งเตือนจริงจาก Socket (ถ้าไม่มีจะปล่อยว่าง 100%)
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const dropdownRef = useRef(null);
  const notiRef = useRef(null);

  const colors = {
    warmCream: "#F9F4E8",
    coral: "#FF8E6E",
    darkPaper: "#4A453A",
    softSand: "#EFE9D9",
  };

  const loadUserFromLocal = () => {
    const data = localStorage.getItem("user");
    setUser(data ? JSON.parse(data) : null);
  };

  const verifyTokenWithBackend = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      handleForceLogout();
      return;
    }
    try {
      const response = await api.get("/auth/me");
      const userData = response.data.user || response.data;
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        Swal.fire({
          icon: "warning",
          title: "เซสชันหมดอายุ!",
          text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
          confirmButtonColor: "#FF8E6E",
        }).then(() => {
          handleForceLogout();
          navigate("/login");
        });
      } else {
        handleForceLogout();
      }
    }
  };

  const handleForceLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeRoomId");
    setUser(null);
    setIsProfileOpen(false);
    setIsNotiOpen(false);
  };

  useEffect(() => {
    loadUserFromLocal();
    verifyTokenWithBackend();

    const handleAuthChange = () => {
      loadUserFromLocal();
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authChange", handleAuthChange);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setIsNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, [location.pathname]);

  // 🌟 ระบบดักฟัง Real-time แจ้งเตือนแชท และ ประกาศข่าวสารจากแอดมิน
  useEffect(() => {
    // 1. ดักฟังประกาศข่าวสารจากระบบ (แอดมิน Broadcast)
    socket.on("receive_announcement", (data) => {
      console.log("📢 ได้รับประกาศระบบใหม่:", data);
      setNotifications((prev) => [
        {
          id: data.id || Date.now(),
          type: "announcement",
          title: data.title || "📢 ประกาศจากผู้พัฒนา",
          description: data.content || data.message || "",
          isRead: false,
          createdAt: new Date()
        },
        ...prev
      ]);
    });

    // 2. ดักฟังข้อความแชทใหม่ส่วนตัวจากแอดมิน
    const activeRoomId = localStorage.getItem("activeRoomId");
    if (activeRoomId && user) {
      socket.emit("join_room", activeRoomId);

      socket.on("receive_message", (newMessage) => {
        const msgSenderId = newMessage.senderId || (newMessage.sender && (newMessage.sender._id || newMessage.sender.id || newMessage.sender));
        const currentUserId = user?._id || user?.id;

        if (String(msgSenderId) !== String(currentUserId)) {
          setNotifications((prev) => [
            {
              id: newMessage._id || newMessage.id || Date.now(),
              type: "message",
              title: "💬 มีข้อความใหม่จาก Admin",
              description: newMessage.message || newMessage.text || "ส่งข้อความถึงคุณ...",
              isRead: false,
              createdAt: new Date()
            },
            ...prev
          ]);
        }
      });
    }

    return () => {
      socket.off("receive_announcement");
      socket.off("receive_message");
    };
  }, [user, roomIdMatches => localStorage.getItem("activeRoomId")]);

  const handleLogout = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: colors.coral,
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
    }).then((res) => {
      if (res.isConfirmed) {
        handleForceLogout();
        window.dispatchEvent(new Event("authChange"));
        navigate("/login");
      }
    });
  };

  const handleClearAllNoti = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isActive = (path) => location.pathname === path;

  return (
    <header style={headerWrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600&display=swap');
        * { font-family: 'Prompt', sans-serif; }
        
        .nav-item { position: relative; transition: 0.3s; padding: 10px 15px; border-radius: 12px; text-decoration: none; color: #7E7869; font-size: 1.1rem; }
        .nav-item:hover { background: ${colors.softSand}; color: ${colors.coral} !important; }
        .active-nav { color: ${colors.coral} !important; font-weight: 600; }
        
        .cta-btn { transition: 0.3s; cursor: pointer; border: none; white-space: nowrap; }
        .cta-btn:hover { transform: scale(1.02); }

        .hamburger-icon { font-size: 1.6rem; color: ${colors.darkPaper}; cursor: pointer; display: flex; align-items: center; }
        
        .drop-item { width: 100%; padding: 12px 20px; border: none; background: none; text-align: left; cursor: pointer; font-size: 0.95rem; color: #4A453A; display: block; text-decoration: none; }
        .drop-item:hover { background-color: ${colors.softSand}; color: ${colors.coral}; }

        @media (max-width: 768px) {
          header { top: 10px !important; }
          .nav-card { height: 60px !important; padding: 0 15px !important; width: 95% !important; }
          .menu-center { display: none !important; }
          .logo-img { height: 65px !important; position: static !important; transform: none !important; }
          .logout-btn-text { display: none; } 
          .start-btn { padding: 8px 14px !important; font-size: 0.85rem !important; border-radius: 12px !important; }
          .login-link { font-size: 0.8rem !important; padding: 5px !important; }
          .dropdown-menu { width: 180px !important; top: 50px !important; }
          .noti-panel { width: 280px !important; right: -50px !important; }
        }
      `}</style>

      <nav style={navCard} className="nav-card hidden sm:flex">
        <Link to="/" style={logoContainer}>
          <img src="/logo1.png" alt="MoodPlace Logo" style={logoImageStyle} className="logo-img" />
        </Link>

        <div style={menuCenter} className="menu-center">
          <Link to="/guide" className={`nav-item ${isActive("/guide") ? "active-nav" : ""}`}>คู่มือ</Link>
          <Link to="/contact" className={`nav-item ${isActive("/contact") ? "active-nav" : ""}`}>ศูนย์ช่วยเหลือ</Link>
        </div>

        <div style={userSection}>
          {user ? (
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              
              {/* กระดิ่งรับแจ้งเตือนข้อมูล Real-time */}
              <div ref={notiRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <button onClick={() => setIsNotiOpen(!isNotiOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  <i className={`bi ${isNotiOpen ? "bi-bell-fill" : "bi-bell"}`} style={{ fontSize: "1.3rem", color: isNotiOpen ? colors.coral : colors.darkPaper, transition: "0.2s" }}></i>
                </button>

                {unreadCount > 0 && (
                  <span style={notiBadgeStyle}>{unreadCount}</span>
                )}

                <AnimatePresence>
                  {isNotiOpen && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="noti-panel" style={notiDropdownStyle}>
                      <div style={notiHeaderStyle}>
                        <h4 style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem", color: colors.darkPaper }}>การแจ้งเตือน</h4>
                        {notifications.length > 0 && (
                          <button onClick={handleClearAllNoti} style={clearNotiBtnStyle}>ล้างทั้งหมด</button>
                        )}
                      </div>
                      
                      <div style={notiBodyStyle}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: "40px 20px", color: "#7E7869", fontSize: "0.85rem", textAlign: "center" }}>
                            <i className="bi bi-bell-slash" style={{ fontSize: "1.6rem", display: "block", marginBottom: "8px", opacity: 0.4 }}></i>
                            ไม่มีการแจ้งเตือนในขณะนี้
                          </div>
                        ) : (
                          notifications.map((noti) => (
                            <div 
                              key={noti.id} 
                              style={notiItemStyle}
                              onClick={() => {
                                if (noti.type === "message") navigate("/contact");
                                setIsNotiOpen(false);
                              }}
                            >
                              <p style={{ margin: "0 0 3px 0", fontWeight: "600", fontSize: "0.85rem", color: colors.darkPaper }}>{noti.title}</p>
                              <p style={{ margin: 0, fontSize: "0.8rem", color: "#7E7869", lineHeight: "1.3", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{noti.description}</p>
                              <span style={{ fontSize: "0.7rem", color: "#A8A294", display: "block", marginTop: "4px" }}>
                                {new Date(noti.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/favorites" style={{ display: "flex" }}>
                <i className={`bi ${isActive("/favorites") ? "bi-heart-fill" : "bi-heart"}`} style={{ fontSize: "1.2rem", color: isActive("/favorites") ? colors.coral : colors.darkPaper }}></i>
              </Link>

              <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="hamburger-icon" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                  <i className={`bi ${isProfileOpen ? "bi-x-lg" : "bi-list"}`}></i>
                </div>

                <Link to="/profile" className="profile-avatar-container">
                  <img src={user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}&background=FF7F67&color=fff`} style={avatarStyle} alt="Profile" />
                </Link>

                {isProfileOpen && (
                  <div style={dropdownStyle} className="dropdown-menu">
                    <div className="md:hidden" style={{ display: window.innerWidth <= 768 ? "block" : "none" }}>
                      <Link to="/guide" className="drop-item" onClick={() => setIsProfileOpen(false)}>คู่มือการใช้งาน</Link>
                      <Link to="/contact" className="drop-item" onClick={() => setIsProfileOpen(false)}>ติดต่อเรา</Link>
                      <hr style={{ margin: "5px 10px", opacity: 0.1 }} />
                    </div>
                    <Link to="/profile" className="drop-item" onClick={() => setIsProfileOpen(false)}>โปรไฟล์ของฉัน</Link>
                    <Link to="/favorites" className="drop-item" onClick={() => setIsProfileOpen(false)}>รายการโปรด</Link>
                    <Link to="/history" className="drop-item" onClick={() => setIsProfileOpen(false)}>ประวัติการนำทาง</Link>
                    <Link to="/planner" className="drop-item" onClick={() => setIsProfileOpen(false)}>วางแผนการเดินทาง</Link>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className="cta-btn" style={logoutBtnStyle}>
                <i className="bi bi-arrow-bar-right" style={{ fontSize: "1.2rem" }}></i>
                <span className="logout-btn-text" style={{ marginLeft: "4px" }}>ออกจากระบบ</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <div ref={dropdownRef} className="md:hidden" style={{ position: "relative", display: window.innerWidth <= 768 ? "block" : "none" }}>
                <div className="hamburger-icon" style={{ marginRight: "8px" }} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                  <i className="bi bi-list"></i>
                </div>
                {isProfileOpen && (
                  <div style={dropdownStyle} className="dropdown-menu">
                    <Link to="/guide" className="drop-item" onClick={() => setIsProfileOpen(false)}>คู่มือการใช้งาน</Link>
                    <Link to="/contact" className="drop-item font-large" onClick={() => setIsProfileOpen(false)}>ศูนย์ช่วยเหลือ</Link>
                  </div>
                )}
              </div>
              <Link to="/login" className="login-link" style={loginLinkStyle}>เข้าสู่ระบบ</Link>
              <Link to="/register" className="cta-btn start-btn" style={signUpBtn}>เริ่มใช้งาน</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

// --- Styles ---
const headerWrapper = { position: "fixed", top: "15px", left: "0", right: "0", display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" };
const navCard = { alignItems: "center", justifyContent: "space-between", width: "90%", maxWidth: "1200px", backgroundColor: "rgba(249, 244, 232, 0.9)", backdropFilter: "blur(15px)", padding: "0 25px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(74, 69, 58, 0.1)", pointerEvents: "auto", height: "70px" };
const logoContainer = { display: "flex", alignItems: "center", flex: 1, height: "100%" };
const logoImageStyle = { height: "100px", width: "auto", position: "absolute", top: "50%", transform: "translateY(-50%)", transition: "0.3s" };
const menuCenter = { display: "flex", gap: "10px", justifyContent: "center", flex: 2 };
const userSection = { display: "flex", alignItems: "center", justifyContent: "flex-end", flex: 1 };
const loginLinkStyle = { textDecoration: "none", color: "#7E7869", fontSize: "0.9rem", padding: "10px", fontWeight: 500 };
const signUpBtn = { background: "linear-gradient(135deg, #FF8E6E 0%, #FFB385 100%)", color: "white", padding: "10px 20px", borderRadius: "14px", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(255, 127, 103, 0.2)" };
const avatarStyle = { width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #FF8E6E" };
const dropdownStyle = { position: "absolute", top: "55px", right: "0", width: "200px", backgroundColor: "#F9F4E8", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", overflow: "hidden", border: "1px solid #EFE9D9", zIndex: 1100 };
const logoutBtnStyle = { color: "#FF6B6B", padding: "8px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: "600", border: "none", background: "none", display: "flex", alignItems: "center" };
const notiBadgeStyle = { position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#E63946", color: "white", fontSize: "0.65rem", fontWeight: "bold", borderRadius: "50%", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "1.5px solid #F9F4E8" };
const notiDropdownStyle = { position: "absolute", top: "45px", right: "-20px", width: "320px", maxHeight: "400px", backgroundColor: "#F9F4E8", borderRadius: "20px", boxShadow: "0 12px 35px rgba(74, 69, 58, 0.15)", border: "1px solid #EFE9D9", zIndex: 1200, overflow: "hidden", display: "flex", flexDirection: "column" };
const notiHeaderStyle = { padding: "15px 20px", borderBottom: "1px solid #EFE9D9", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(239, 233, 217, 0.3)" };
const clearNotiBtnStyle = { background: "none", border: "none", color: "#FF8E6E", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer" };
const notiBodyStyle = { overflowY: "auto", maxHeight: "330px" };
const notiItemStyle = { padding: "15px 20px", borderBottom: "1px solid #EFE9D9", cursor: "pointer", transition: "0.2s", backgroundColor: "white" };