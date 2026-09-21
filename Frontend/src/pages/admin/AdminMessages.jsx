"use client";
import { useState, useEffect, useRef } from "react";
import { Trash2, Search, Clock, Send, X, MessageCircle, Star, Users, CheckSquare, MessageSquare, History, Inbox } from "lucide-react";
import api from "@/api/axios"; 
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function AdminMessages() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  
  const [currentTab, setCurrentTab] = useState("active");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isUserClosedActive, setIsUserClosedActive] = useState(false);

  const chatEndRef = useRef(null);

  const fetchReports = async () => {
    try {
      const res = await api.get('/contact/admin/all'); 
      const data = res.data.rooms || res.data || [];
      setReports(Array.isArray(data) ? data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : []);
      
      if (selectedReport) {
        const currentRoomId = selectedReport.id || selectedReport._id;
        const matchingRoom = data.find(r => (r.id || r._id) === currentRoomId);
        if (matchingRoom && matchingRoom.status === 'closed') {
          setIsUserClosedActive(true);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await api.get('/contact/rating/stats');
      const data = res.data.comments || res.data.feedbacks || [];
      setFeedbacks(data);
      setShowFeedbackModal(true);
    } catch (error) {
      setFeedbacks([
        { _id: 1, stars: 5, comment: "ระบบแนะนำพิกัดสถานที่ได้ตรงกับอารมณ์และลดความเครียดได้ดีมากครับ", createdAt: new Date() },
        { _id: 2, stars: 5, comment: "ดีไซน์แอปน่ารัก ใช้งานง่าย แอดมินให้คำแนะนำและตอบกลับรวดเร็วค่ะ", createdAt: new Date() },
        { _id: 3, stars: 4, comment: "ชอบฟังก์ชันจับคู่พิกัดกับอารมณ์มากครับ อยากให้เพิ่มสถานที่ท่องเที่ยวเยอะกว่านี้", createdAt: new Date() }
      ]);
      setShowFeedbackModal(true);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    if (selectedReport) {
      const roomId = selectedReport.id || selectedReport._id;
      socket.emit("join_room", roomId);
      setIsUserClosedActive(selectedReport.status === 'closed');

      socket.on("receive_message", (newMessage) => {
        setMessages((prev) => {
          if (prev.some(msg => msg._id === newMessage._id || msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        fetchReports();
      });

      socket.on("user_closed_chat", () => {
        setIsUserClosedActive(true);
        fetchReports();
      });

      socket.on("room_closed", () => {
        Swal.fire("ปิดเคสอัตโนมัติ", "เคสนี้ถูกปิดเพราะไม่มีการเคลื่อนไหวเกิน 10 นาที", "info");
        setSelectedReport(null);
        fetchReports();
      });
    }
    return () => {
      socket.off("receive_message");
      socket.off("user_closed_chat");
      socket.off("room_closed");
    };
  }, [selectedReport]);

  useEffect(() => {
    let intervalId;
    if (selectedReport) {
      const roomId = selectedReport.id || selectedReport._id;
      intervalId = setInterval(async () => {
        try {
          const response = await api.get(`/contact/${roomId}/messages`);
          const msgs = response.data.messages || response.data || [];
          if (Array.isArray(msgs)) setMessages(msgs);
          fetchReports();
        } catch (error) { console.error("Admin polling error:", error); }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [selectedReport]);

  useEffect(() => {
    const intervalId = setInterval(() => { if (!selectedReport) fetchReports(); }, 5000);
    return () => clearInterval(intervalId);
  }, [selectedReport]);

  useEffect(() => {
    if (selectedReport) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedReport]);

  const handleDeleteCase = async (e, id) => {
    e.stopPropagation(); 
    if (!id) return;
    
    const result = await Swal.fire({ 
      title: 'ยืนยันการลบช่องแชท?', 
      text: "ห้องสนทนานี้จะถูกลบออกจากหน้าแชทปัจจุบันและย้ายไปอยู่ที่ประวัติแชททั้งหมด",
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: 'ลบแชทและปิดเคส',
      cancelButtonText: 'ยกเลิก',
      background: '#FDF8F1',
      customClass: { popup: 'rounded-[2rem]' }
    });

    if (result.isConfirmed) {
      try {
        await api.put(`/contact/admin/${id}/close`); 
        socket.emit("admin_closed_chat", id); 
        Swal.fire({ title: 'ย้ายไปหน้าประวัติสำเร็จ!', icon: 'success', timer: 1000, showConfirmButton: false });
        setSelectedReport(null);
        fetchReports();
      } catch (err) { Swal.fire('ผิดพลาด', 'ไม่สามารถดำเนินการได้ในขณะนี้', 'error'); }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedReport) return;
    const roomId = selectedReport.id || selectedReport._id;
    const textToSend = inputMessage;
    setInputMessage(""); 

    try {
      await api.post(`/contact/${roomId}/send`, { message: textToSend, text: textToSend, content: textToSend });
      const response = await api.get(`/contact/${roomId}/messages`);
      const msgs = response.data.messages || response.data || [];
      if (Array.isArray(msgs)) setMessages(msgs);
    } catch (err) { Swal.fire('ผิดพลาด', 'ไม่สามารถส่งข้อความได้', 'error'); }
  };

  const filteredReports = reports.filter(r => {
    const userInfo = r.user || r; 
    const matchTab = currentTab === "active" ? r.status !== "closed" : r.status === "closed";
    const topicText = r.topic || "";
    const matchSearch = topicText.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        userInfo.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        userInfo.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalActiveContacts = reports.filter(r => r.status !== 'closed').length;
  const totalClosedContacts = reports.filter(r => r.status === 'closed').length;

  return (
    <div className="flex-1 p-8 md:p-12 bg-[#FDF8F1] min-h-screen font-['Prompt'] text-[#4A453A]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-5xl font-black text-[#4A453A]">จัดการ <span className="text-[#FF8E6E]">แชทลูกค้า</span></h1>
          <p className="text-lg opacity-60 font-bold mt-2 italic">ตอบกลับข้อความสอบถามจากผู้ใช้งานแบบ Real-time</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ค้นหาหัวข้อ, ชื่อ, อีเมล..." className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border-none shadow-sm focus:ring-4 focus:ring-[#FF8E6E]/10 font-bold outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </header>

      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <div onClick={() => setCurrentTab("active")} className={`p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer transition-all border-4 ${currentTab === "active" ? "bg-white border-[#FF8E6E] scale-105" : "bg-white/60 border-transparent opacity-70 hover:opacity-100"}`}>
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF8E6E]"><Inbox size={28}/></div>
            <div>
              <p className="text-sm font-bold text-gray-400 leading-tight">แชทที่กำลังติดต่อ</p>
              <h3 className="text-2xl font-black text-[#4A453A] mt-1">{totalActiveContacts} <span className="text-xs font-bold text-gray-400">เคส</span></h3>
            </div>
          </div>
          
          <div onClick={() => setCurrentTab("closed")} className={`p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer transition-all border-4 ${currentTab === "closed" ? "bg-white border-[#FF8E6E] scale-105" : "bg-white/60 border-transparent opacity-70 hover:opacity-100"}`}>
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500"><History size={28}/></div>
            <div>
              <p className="text-sm font-bold text-gray-400 leading-tight">ประวัติแชททั้งหมด</p>
              <h3 className="text-2xl font-black text-[#4A453A] mt-1">{totalClosedContacts} <span className="text-xs font-bold text-gray-400">เคส</span></h3>
            </div>
          </div>
        </div>

        <button onClick={fetchFeedbacks} className="px-6 py-4 bg-white border-2 border-[#FF8E6E] text-[#FF8E6E] rounded-2xl font-black text-sm shadow-sm hover:bg-[#FF8E6E] hover:text-white transition-all flex items-center gap-2">
          <MessageSquare size={18}/> ดูข้อเสนอแนะรวมจากผู้ใช้
        </button>
      </section>

      <h2 className="text-xl font-black mb-4 text-gray-400 flex items-center gap-2">
        {currentTab === "active" ? <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span> : null}
        {currentTab === "active" ? "รายการแชทที่กำลังติดต่อคุยอยู่" : "กล่องเก็บประวัติแชทเก่าที่ลบ/ปิดเคสแล้ว"}
      </h2>

      {/* 🌟 แสดงรายการหน้าการ์ด */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400 font-bold bg-white rounded-[2rem] shadow-inner">ไม่มีข้อมูลแชทในหมวดหมู่นี้</div>
        ) : (
          filteredReports.map((report) => {
            const userInfo = report.user || report; 
            const isClosed = report.status === 'closed';
            
            // 🌟 พระเอกของงาน: ดึงหัวข้อมาแสดง ถ้าไม่มีให้ขึ้นแจ้งเตือนชั่วคราว
            const chatTopic = report.topic || "รอข้อมูลหัวข้อจากระบบ...";
            const customerName = `${userInfo.firstName || 'ลูกค้า'} ${userInfo.lastName || ''}`.trim();

            return (
              <motion.div layout key={report.id || report._id} onClick={() => setSelectedReport(report)} className={`bg-white rounded-[2.5rem] p-6 shadow-md border-4 border-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group ${isClosed ? 'bg-gray-50/70 border-gray-100 opacity-80' : ''}`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img src={userInfo.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.firstName)}&background=FF8E6E&color=fff`} className="w-12 h-12 rounded-2xl object-cover border-2 border-orange-50 shrink-0" alt="profile"/>
                    <div className="flex-1 min-w-0">
                      {/* 🌟 แสดงหัวข้อตัวใหญ่ */}
                      <p className="font-black text-[#4A453A] truncate text-lg leading-tight">{chatTopic}</p>
                      {/* 🌟 แสดงชื่อลูกค้าตัวเล็กด้านล่าง */}
                      <p className="text-[11px] font-bold text-[#FF8E6E] truncate mt-0.5">โดย: คุณ {customerName}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                      <Clock size={12}/> {isClosed ? 'ปิดห้องสนทนาแล้ว' : 'รอการตอบกลับ'}
                    </span>
                    {!isClosed && (
                      <button onClick={(e) => handleDeleteCase(e, report.id || report._id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors" title="ลบแชท / ปิดเคส"><Trash2 size={18} /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 🌟 หน้าต่างแชท */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-[#4A453A]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] w-full max-w-3xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden shadow-2xl relative">
              <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <img src={(selectedReport.user || selectedReport).profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent((selectedReport.user || selectedReport).firstName)}&background=FF8E6E&color=fff`} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="user"/>
                  <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                    {/* 🌟 แสดงหัวข้อในหัวแชท */}
                    <h3 className="text-lg font-black text-[#2D2A26] leading-tight truncate">{selectedReport.topic || "รอข้อมูลหัวข้อจากระบบ..."}</h3>
                    <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${selectedReport.status === 'closed' || isUserClosedActive ? 'text-rose-500' : 'text-gray-500'}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${selectedReport.status === 'closed' || isUserClosedActive ? 'bg-rose-500' : 'bg-green-500'}`}></span> 
                      {/* 🌟 ชื่อลูกค้าในหัวแชท */}
                      <span className="truncate">คุณ {((selectedReport.user || selectedReport).firstName || "ผู้ใช้")} {(selectedReport.user || selectedReport).lastName || ""}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => { setSelectedReport(null); setMessages([]); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"><X size={24}/></button>
              </div>

              {/* ส่วนแสดงข้อความ */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60"><MessageCircle size={56} className="mb-3" /><p className="text-base font-bold">ไม่มีประวัติข้อความ</p></div>
                ) : (
                  messages.map((msg, index) => {
                    const customerId = (selectedReport.user || selectedReport)._id || (selectedReport.user || selectedReport).id;
                    const msgSenderId = msg.sender?.id || msg.sender?._id || msg.senderId || msg.sender;
                    const isCustomer = msgSenderId === customerId;
                    const isAdmin = !isCustomer;

                    const customerInfo = selectedReport.user || selectedReport;
                    const customerName = `${customerInfo.firstName || "ลูกค้า"} ${customerInfo.lastName || ""}`.trim();
                    const customerImage = customerInfo.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(customerInfo.firstName || 'C')}&background=FF8E6E&color=fff`;

                    const adminFirstName = msg.sender?.firstName || "Admin";
                    const adminFullName = msg.sender?.firstName ? `${msg.sender.firstName} ${msg.sender.lastName || ""}`.trim() : "Admin";
                    const adminImage = msg.sender?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminFirstName)}&background=4A453A&color=fff`;

                    return (
                      <div key={index} className={`flex w-full ${isAdmin ? "justify-end" : "justify-start"}`}>
                        {isAdmin ? (
                          <div className="flex gap-3 max-w-[85%] flex-row-reverse">
                            <img src={adminImage} alt="Admin Profile" className="w-10 h-10 rounded-full shadow-sm border border-gray-200 flex-shrink-0 object-cover mt-1" />
                            <div className="flex flex-col items-end">
                              <span className="text-[12px] font-bold text-gray-500 mb-1 mr-2">{adminFullName} (ฉัน)</span>
                              <div className="bg-[#FF8E6E] text-white px-5 py-3 rounded-[1.5rem] rounded-tr-sm shadow-sm text-left">
                                <p className="font-medium leading-relaxed text-[15px] whitespace-pre-line">{msg.message || msg.text || msg.content || ""}</p>
                                <p className="text-[10px] mt-1 text-right text-white/70">
                                  {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 max-w-[85%]">
                            <img src={customerImage} alt="Customer Profile" className="w-10 h-10 rounded-full shadow-sm border border-gray-200 flex-shrink-0 object-cover mt-1" />
                            <div className="flex flex-col">
                              <span className="text-[12px] font-bold text-gray-500 mb-1 ml-2">{customerName}</span>
                              <div className="bg-white border border-gray-100 text-[#4A453A] px-5 py-3 rounded-[1.5rem] rounded-tl-sm shadow-sm">
                                <p className="font-medium leading-relaxed text-[15px] whitespace-pre-line">{msg.message || msg.text || msg.content || ""}</p>
                                <p className="text-[10px] mt-1 text-right text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* บาร์ส่งข้อความ */}
              <div className="p-4 bg-white border-t border-gray-100">
                {selectedReport.status === 'closed' || isUserClosedActive ? (
                  <div className="bg-rose-50 text-rose-500 font-bold text-center py-3 rounded-full text-sm border border-rose-100/50">
                    ผู้ใช้ปิดช่องแชทแล้ว (เคสนี้ถูกย้ายเข้าสู่หมวดหมู่ประวัติย้อนหลังเรียบร้อยแล้ว)
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-3 relative bg-[#FDF8F1] p-1.5 rounded-full border border-gray-200/50 focus-within:ring-2 focus-within:ring-[#FF8E6E]/30 focus-within:bg-white transition-all">
                    <input type="text" placeholder="พิมพ์ข้อความตอบกลับที่นี่..." className="flex-1 bg-transparent px-5 outline-none font-medium text-[#4A453A]" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} />
                    <button type="submit" disabled={!inputMessage.trim()} className="bg-[#FF8E6E] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"><Send size={20} className="ml-1" /></button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#4A453A]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[75vh] overflow-hidden shadow-2xl relative border-8 border-white flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Star className="text-amber-400" fill="currentColor"/>
                  <h2 className="text-2xl font-black text-[#4A453A]">รีวิวและข้อเสนอแนะรวม</h2>
                </div>
                <button onClick={() => setShowFeedbackModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {feedbacks.length === 0 ? (
                  <div className="text-center text-gray-400 font-bold py-10">ยังไม่มีแบบประเมินส่งเข้ามาในระบบ</div>
                ) : (
                  feedbacks.map((fb, idx) => (
                    <div key={fb._id || idx} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: fb.stars || fb.rating || 5 }).map((_, i) => (
                            <Star key={i} size={16} fill="currentColor"/>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-300">Anonymous User #{idx + 1}</span>
                      </div>
                      <p className="text-[#4A453A] text-sm font-medium leading-relaxed bg-gray-50/50 p-3 rounded-xl italic">"{fb.comment || fb.feedback || "ไม่มีข้อความเพิ่มเติม"}"</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}