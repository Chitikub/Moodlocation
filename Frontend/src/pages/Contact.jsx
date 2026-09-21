"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, MessageCircle, AlertCircle, ArrowLeft,  Paperclip } from "lucide-react";
import Swal from "sweetalert2";
import api from "@/api/axios";
import { io } from "socket.io-client";

// 🌟 เชื่อมต่อ Socket
const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function ContactPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [roomId, setRoomId] = useState(() => {
    return localStorage.getItem("activeRoomId") || null;
  });

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ตรวจสอบ User และสร้าง/ดึงห้องแชททันทีที่เข้าหน้าเว็บ
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      initOrCreateRoom();
    }
  }, []);

  // ฟังก์ชันสร้างหรือดึงห้องแชทอัตโนมัติทันทีที่เข้าหน้าเว็บ (ไม่ต้องกดเปิดช่องแชท)
  const initOrCreateRoom = async () => {
    setLoading(true);
    try {
      let currentRoomId = localStorage.getItem("activeRoomId");
      
      if (!currentRoomId) {
        // ถ้ายังไม่มีห้อง ให้สร้างห้องแชทให้อัตโนมัติ
        const response = await api.post("/contact", {
          topic: "ติดต่อสอบถามทั่วไป",
          detail: "ผู้ใช้เริ่มต้นสนทนาผ่านหน้าศูนย์ช่วยเหลือ"
        }); 
        currentRoomId = response.data._id || response.data.id || response.data.roomId;
        if (currentRoomId) {
          localStorage.setItem("activeRoomId", currentRoomId);
        }
      }

      if (currentRoomId) {
        setRoomId(currentRoomId);
        await fetchChatHistory(currentRoomId);
      }
    } catch (error) {
      console.error("Failed to init chat room", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อห้องสนทนาได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันโหลดประวัติข้อความ
  const fetchChatHistory = async (targetRoomId) => {
    try {
      const resMessages = await api.get(`/contact/${targetRoomId}/messages`);
      const msgs = resMessages.data.messages || resMessages.data;
      if (Array.isArray(msgs)) setMessages(msgs);
    } catch (error) {
      console.error("Failed to fetch chat history", error);
    }
  };

  // 🌟 จัดการ Socket Events
  useEffect(() => {
    if (roomId) {
      socket.emit("join_room", roomId);

      socket.on("receive_message", (newMessage) => {
        setMessages((prev) => {
          if (prev.some(msg => msg._id === newMessage._id || msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        setIsAdminTyping(false);
      });

      socket.on("display_typing", (data) => {
        if (data.senderRole === "admin") {
          setIsAdminTyping(data.isTyping);
        }
      });

      socket.on("room_closed", () => {
        Swal.fire({
          icon: "info",
          title: "หมดเวลาสนทนา",
          text: "ห้องแชทนี้ถูกปิดเนื่องจากไม่มีการโต้ตอบเกิน 10 นาที",
          confirmButtonColor: "#FF8E6E"
        });
        handleResetRoom();
      });

      socket.on("admin_closed_chat", (closedRoomId) => {
        if (roomId === closedRoomId) {
          Swal.fire({
            icon: "info",
            title: "แชทสิ้นสุดลง",
            text: "แอดมินได้ทำการปิดเคสนี้แล้ว ระบบได้สร้างห้องแชทใหม่ให้คุณเรียบร้อย",
            confirmButtonColor: "#FF8E6E"
          });
          handleResetRoom();
          initOrCreateRoom();
        }
      });
    }

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
      socket.off("room_closed");
      socket.off("admin_closed_chat"); 
    };
  }, [roomId]);

  const handleResetRoom = () => {
    setRoomId(null);
    setMessages([]);
    localStorage.removeItem("activeRoomId");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAdminTyping]);

  // พิมพ์ข้อความแจ้งเตือนสถานะกำลังพิมพ์
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (!roomId) return;

    socket.emit("typing", { roomId, isTyping: true, senderRole: "user" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { roomId, isTyping: false, senderRole: "user" });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || !roomId) return;

    const textToSend = inputMessage;
    setInputMessage(""); 
    
    socket.emit("typing", { roomId, isTyping: false, senderRole: "user" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      await api.post(`/contact/${roomId}/send`, { 
        message: textToSend,
        text: textToSend,
        content: textToSend
      });
      await fetchChatHistory(roomId);
    } catch (error) {
      Swal.fire("ผิดพลาด", "ไม่สามารถส่งข้อความได้", "error");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F4E8] flex flex-col items-center justify-center font-['Prompt'] text-[#4A453A]">
        <AlertCircle size={64} className="text-[#FF8E6E] mb-4" />
        <h2 className="text-2xl font-black mb-4">กรุณาเข้าสู่ระบบก่อนติดต่อแอดมิน</h2>
        <button onClick={() => navigate('/login')} className="px-8 py-3 bg-[#FF8E6E] text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
          ไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  // 🌟 UI หน้าจอแชทหลัก (ปรับแต่งให้ตรงกับ Mockup และรองรับ Responsive / Desktop สมบูรณ์)
  return (
    <div className="min-h-screen bg-[#FDF8F1] flex items-center justify-center py-6 sm:py-12 px-4 font-['Prompt']">
      <div className="w-full max-w-lg bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white flex flex-col h-[85vh] max-h-[780px] min-h-[550px] overflow-hidden relative">
        
        {/* Header แชท (ดีไซน์โค้งมนตาม Mockup มีปุ่มย้อนกลับ, รูปโปรไฟล์, ชื่อ Admin, สถานะออนไลน์ และปุ่มโทร) */}
        <div className="bg-white px-6 pt-6 pb-4 flex items-center justify-between z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 bg-[#FDF8F1] rounded-full flex items-center justify-center text-[#4A453A] hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3 flex-1 mx-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF3EE] overflow-hidden flex items-center justify-center shadow-sm">
                <img src="/logo1.png" alt="Admin Support" className="w-full h-full object-cover" />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h1 className="text-base font-black text-[#4A453A] leading-tight">Admin Support</h1>
              <p className="text-xs text-green-600 font-bold mt-0.5">ออนไลน์</p>
            </div>
          </div>


        </div>

        {/* ── ส่วนแสดงรายการข้อความ ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#FAFAFA]/40 flex flex-col gap-4">
          
          {/* วันที่ดึงดูดสายตาตรงกลาง */}
          <div className="flex justify-center my-2">
            <span className="bg-[#F2EFE9] text-[#7E7869] text-[11px] font-bold px-4 py-1 rounded-full shadow-2xs">
              วันนี้
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-full text-gray-400 font-bold">กำลังโหลดข้อความ...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
              <MessageCircle size={48} className="mb-2" />
              <p className="text-sm font-bold">เริ่มพิมพ์ข้อความพูดคุยกับแอดมินได้เลยครับ</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const msgSenderId = msg.senderId || (msg.sender && (msg.sender._id || msg.sender.id || msg.sender));
              const userId = user._id || user.id;
              const isUser = msgSenderId === userId; 
              
              const adminFirstName = msg.sender?.firstName || "Admin";
              const adminProfileImg = msg.sender?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminFirstName)}&background=4A453A&color=fff`;

              return (
                <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                  {isUser ? (
                    // ── ฝั่ง User (สีส้ม) ──
                    <div className="flex gap-2.5 max-w-[80%] flex-row-reverse items-end">
                      <div className="flex flex-col items-end">
                        <div className="bg-[#FF8E6E] text-white px-5 py-3 rounded-[24px] rounded-br-sm shadow-sm">
                          <p className="font-medium leading-relaxed text-[14px] whitespace-pre-line">{msg.message || msg.text || msg.content || ""}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-white/80">
                            <span className="text-[10px]">
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ── ฝั่ง Admin (สีขาว พร้อมรูปโปรไฟล์ชิดซ้าย) ──
                    <div className="flex gap-2.5 max-w-[80%] items-end">
                      <img 
                        src={adminProfileImg} 
                        alt="Admin" 
                        className="w-9 h-9 rounded-full shadow-sm border border-gray-100 flex-shrink-0 object-cover mb-1" 
                      />
                      <div className="flex flex-col">
                        <div className="bg-white border border-[#EFE9D9]/60 text-[#4A453A] px-5 py-3 rounded-[24px] rounded-bl-sm shadow-sm">
                          <p className="font-medium leading-relaxed text-[14px] whitespace-pre-line">{msg.message || msg.text || msg.content || ""}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-gray-400">
                            <span className="text-[10px]">
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* แอดมินกำลังพิมพ์... */}
          {isAdminTyping && (
            <div className="flex justify-start gap-2.5 w-full max-w-[80%] items-end animate-in fade-in slide-in-from-bottom-2">
              <div className="w-9 h-9 rounded-full shadow-sm border border-gray-100 flex-shrink-0 overflow-hidden mb-1 bg-[#FFF3EE]">
                <img src="/logo1.png" alt="Admin" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white border border-[#EFE9D9]/60 px-4 py-3 rounded-[24px] rounded-bl-sm shadow-sm flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 bg-[#FF8E6E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-[#FF8E6E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-[#FF8E6E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── กล่องพิมพ์ข้อความด้านล่าง (ดีไซน์ปุ่มแนบไฟล์ + ช่องพิมพ์สีนวล + ปุ่มส่งสีส้มกลม) ── */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#F9F6F0] p-1.5 rounded-full border border-gray-200/40">
            <button 
              type="button" 
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              <Paperclip size={18} />
            </button>

            <input 
              type="text" 
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 bg-transparent px-2 outline-none font-medium text-[14px] text-[#4A453A] placeholder:text-gray-400"
              value={inputMessage} 
              onChange={handleInputChange} 
            />

            <button 
              type="submit" 
              disabled={!inputMessage.trim()} 
              className="bg-[#FF8E6E] text-white w-11 h-11 rounded-full flex items-center justify-center shadow-md hover:bg-[#ff7a55] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
          
          {/* ขีดตกแต่งด้านล่างสุดเหมือนหน้าจอมือถือจริง */}
          <div className="w-32 h-1 bg-gray-200 rounded-full mx-auto mt-3"></div>
        </div>

      </div>
    </div>
  );
}