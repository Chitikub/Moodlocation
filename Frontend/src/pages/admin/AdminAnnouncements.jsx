"use client";
import { useState, useEffect, useRef } from "react";
import { 
  Megaphone, Send, Clock, Trash2, Edit, Plus, Image as ImageIcon, 
  X, ArrowLeft, LayoutTemplate, AlignLeft, AlignRight, AlignVerticalJustifyStart, 
  FileText, ImagePlus, Eye, LayoutGrid, GripVertical, Type
} from "lucide-react";
import Swal from "sweetalert2";
import { io } from "socket.io-client";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import api from "@/api/axios";

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function AdminAnnouncements() {
  const [currentView, setCurrentView] = useState("history"); // 'history' | 'editor'
  const [previewMode, setPreviewMode] = useState("full"); // 'card' | 'full'
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 ฟอร์มข้อมูล (ใช้ระบบ Content Blocks เก็บเนื้อหาและรูปภาพ)
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    shortContent: "", 
    coverImage: null, 
    layout: "image-top",
    contentBlocks: [{ id: Date.now().toString(), type: "text", value: "" }],
  });

  const coverInputRef = useRef(null);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/announcements");
      const data = res.data.announcements || res.data || [];
      setAnnouncements(Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []);
    } catch (error) {
      const localData = JSON.parse(localStorage.getItem("admin_mock_announcements") || "[]");
      setAnnouncements(localData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  // 🌟 จัดการรูปปก (Cover Image)
  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return Swal.fire("คำเตือน", "รูปปกต้องไม่เกิน 2MB", "warning");
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, coverImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCreateNew = () => {
    setFormData({ 
      id: null, title: "", shortContent: "", coverImage: null, layout: "image-top", 
      contentBlocks: [{ id: Date.now().toString(), type: "text", value: "" }] 
    });
    setCurrentView("editor");
    setPreviewMode("full");
  };

  const handleEdit = (item) => {
    const contentBlocks = Array.isArray(item.contentBlocks) && item.contentBlocks.length > 0
      ? item.contentBlocks
      : item.fullContent
        ? [{ id: Date.now().toString(), type: "text", value: item.fullContent }]
        : [{ id: Date.now().toString(), type: "text", value: "" }];

    setFormData({
      id: item.id || item._id,
      title: item.title?.replace("📢 ", "") || "",
      shortContent: item.shortContent || item.description || item.content || "",
      coverImage: item.coverImage || item.image || null,
      layout: item.layout || "image-top",
      contentBlocks,
    });
    setCurrentView("editor");
    setPreviewMode("full");
  };

  // ==========================================
  // 🌟 ระบบ Block-based Editor (จัดการเนื้อหา & รูปภาพ)
  // ==========================================
  const addContentBlock = (type = "text") => {
    setFormData((prev) => ({
      ...prev,
      contentBlocks: [...prev.contentBlocks, { 
        id: Date.now().toString() + Math.random(), 
        type, 
        value: "", 
        align: type === "image" ? "left" : undefined, 
        caption: type === "image" ? "" : undefined 
      }],
    }));
  };

  const updateContentBlock = (id, updater) => {
    setFormData((prev) => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map((block) => block.id === id ? updater(block) : block),
    }));
  };

  const removeContentBlock = (id) => {
    setFormData((prev) => ({
      ...prev,
      contentBlocks: prev.contentBlocks.length > 1 ? prev.contentBlocks.filter((block) => block.id !== id) : prev.contentBlocks,
    }));
  };

  const handleImageBlockChange = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return Swal.fire("คำเตือน", "รูปภาพต้องไม่เกิน 2MB", "warning");
    const reader = new FileReader();
    reader.onloadend = () => updateContentBlock(id, (b) => ({ ...b, type: "image", value: reader.result, align: "left" }));
    reader.readAsDataURL(file);
  };

  // ==========================================
  // 🌟 ส่งข้อมูลประกาศ
  // ==========================================
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.shortContent.trim()) {
      return Swal.fire("แจ้งเตือน", "กรุณากรอกหัวข้อ และคำโปรยหน้าการ์ดให้ครบถ้วน", "warning");
    }

    const validBlocks = formData.contentBlocks.filter((block) => block.type === "image" ? block.value : block.value.trim());
    if (validBlocks.length === 0) {
      return Swal.fire("แจ้งเตือน", "กรุณาเพิ่มข้อความหรือรูปภาพอย่างน้อย 1 บล็อก", "warning");
    }

    // สร้างข้อความแบบรวมร่าง เผื่อ API เก่าต้องการใช้
    const fullTextString = validBlocks.map((b) => b.type === "text" ? b.value.trim() : (b.caption ? b.caption.trim() : "")).filter(Boolean).join("\n\n");

    const payload = {
      id: formData.id || "announcement-" + Date.now(),
      title: "📢 " + formData.title.trim(),
      description: formData.shortContent.trim(),
      shortContent: formData.shortContent.trim(),
      fullContent: fullTextString,
      coverImage: formData.coverImage,
      contentBlocks: validBlocks,
      layout: formData.layout,
      createdAt: new Date().toISOString(),
    };

    try {
      if (formData.id) await api.put(`/announcements/${formData.id}`, payload);
      else await api.post("/announcements", payload);
    } catch (error) {
      try {
        let updatedList = formData.id 
          ? announcements.map(a => (a.id === formData.id || a._id === formData.id) ? payload : a)
          : [payload, ...announcements];
        setAnnouncements(updatedList);
        localStorage.setItem("admin_mock_announcements", JSON.stringify(updatedList));
      } catch (err) {
        return Swal.fire("พื้นที่จัดเก็บเต็ม!", "รูปภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดหรือจำนวนรูปลง", "error");
      }
    }

    socket.emit("send_global_announcement", payload);
    Swal.fire({ icon: "success", title: "โพสต์สำเร็จ!", text: "ข่าวกระจายไปยังผู้ใช้งานแล้ว", timer: 1500, showConfirmButton: false });
    fetchAnnouncements();
    setCurrentView("history");
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({ title: "ยืนยันการลบ?", icon: "warning", showCancelButton: true, confirmButtonColor: "#EF4444", confirmButtonText: "ใช่, ลบเลย" });
    if (confirm.isConfirmed) {
      try { await api.delete(`/announcements/${id}`); } 
      catch (error) {
        const updatedList = announcements.filter(a => a.id !== id && a._id !== id);
        setAnnouncements(updatedList);
        localStorage.setItem("admin_mock_announcements", JSON.stringify(updatedList));
      }
      fetchAnnouncements();
      Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1000, showConfirmButton: false });
    }
  };

  return (
    <div className="flex-1 p-8 md:p-12 bg-[#FDF8F1] min-h-screen font-['Kanit'] text-[#4A453A] overflow-x-hidden">
      <AnimatePresence mode="wait">
        
        {/* =========================================
            ✅ VIEW 1: HISTORY (หน้าประวัติ)
            ========================================= */}
        {currentView === "history" && (
          <motion.div key="history-view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-[#4A453A] flex items-center gap-3">
                  จัดการ <span className="text-[#FF8E6E]">ประกาศระบบ</span>
                </h1>
                <p className="text-base md:text-lg opacity-60 font-bold mt-2">ประวัติการแจ้งข่าวสารทั้งหมดของคุณ</p>
              </div>
              <button onClick={handleCreateNew} className="px-6 py-3.5 bg-[#FF8E6E] text-white rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <Plus size={20} /> สร้างโพสต์ใหม่
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-20 font-bold text-gray-400 animate-pulse">กำลังดึงข้อมูลโพสต์...</div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <Megaphone size={60} className="text-gray-200 mb-4" />
                <h3 className="text-2xl font-black text-gray-400">ยังไม่มีประกาศใดๆ</h3>
                <p className="text-gray-400 mt-2">กดปุ่มสร้างโพสต์ใหม่ด้านบนเพื่อเริ่มกระจายข่าวสาร</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map((item) => (
                  <div key={item.id || item._id} className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between group">
                    <div className="flex gap-4">
                      {item.coverImage && (
                        <div className="w-24 h-24 rounded-2xl bg-gray-50 overflow-hidden shrink-0">
                          <img src={item.coverImage} className="w-full h-full object-cover" alt="Thumb" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF8E6E] mb-2 bg-orange-50 w-fit px-2 py-0.5 rounded-md">
                          <Clock size={12} />
                          {new Date(item.createdAt).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <h4 className="font-black text-lg text-[#2D2A26] line-clamp-1">{item.title}</h4>
                        <p className="text-sm font-medium text-[#7E7869] mt-1 line-clamp-2">{item.shortContent || item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-50">
                      <button onClick={() => handleEdit(item)} className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-amber-100 hover:text-amber-600 rounded-xl transition-colors flex items-center gap-1.5"><Edit size={14} /> แก้ไข</button>
                      <button onClick={() => handleDelete(item.id || item._id)} className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors flex items-center gap-1.5"><Trash2 size={14} /> ลบ</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================
            ✅ VIEW 2: EDITOR & LIVE PREVIEW
            ========================================= */}
        {currentView === "editor" && (
          <motion.div key="editor-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-4 mb-8 mt-4">
              <button onClick={() => setCurrentView("history")} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:bg-[#FF8E6E] hover:text-white transition-all"><ArrowLeft size={24} /></button>
              <div>
                <h1 className="text-3xl font-black text-[#4A453A]">{formData.id ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}</h1>
                <p className="text-gray-400 font-medium text-sm mt-1">ตั้งค่าหน้าการ์ด และจัดเรียงหน้าเนื้อหาฉบับเต็มด้วยระบบ Block</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ─── ฟอร์มกรอกข้อมูล (ฝั่งซ้าย) ─── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: สรุปหน้าการ์ด */}
                <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-md border border-gray-100 space-y-5">
                  <div className="flex items-center gap-2 text-[#FF8E6E] mb-2"><LayoutGrid size={20}/><h3 className="font-black text-lg">ส่วนที่ 1: การ์ดหน้าโฮม</h3></div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-2 ml-1">หัวข้อประกาศ (Title)</label>
                    <input type="text" placeholder="ระบุหัวข้อที่น่าสนใจ..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3.5 rounded-2xl bg-[#FDF8F1] border border-transparent outline-none font-medium text-sm focus:ring-2 focus:ring-[#FF8E6E]/30 focus:border-[#FF8E6E]/50 transition-all" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-2 ml-1">คำโปรยย่อหน้าแรก (Short Description)</label>
                    <textarea rows={2} placeholder="เนื้อหาสั้นๆ เพื่อดึงดูดให้อ่านต่อ..." value={formData.shortContent} onChange={(e) => setFormData({...formData, shortContent: e.target.value})} className="w-full px-4 py-3.5 rounded-2xl bg-[#FDF8F1] border border-transparent outline-none font-medium text-sm focus:ring-2 focus:ring-[#FF8E6E]/30 focus:border-[#FF8E6E]/50 transition-all resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-500 mb-2 ml-1">รูปหน้าปก (Cover Image)</label>
                    <input type="file" ref={coverInputRef} accept="image/*" onChange={handleCoverChange} className="hidden" />
                    {!formData.coverImage ? (
                      <div onClick={() => coverInputRef.current.click()} className="w-full h-32 bg-[#FDF8F1] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-[#FF8E6E] hover:border-[#FF8E6E] cursor-pointer transition-all">
                        <ImageIcon size={28} className="mb-2" />
                        <span className="text-xs font-bold">คลิกเพื่ออัปโหลดรูปปก (1 รูป)</span>
                      </div>
                    ) : (
                      <div className="relative w-full sm:w-48 h-32 rounded-2xl overflow-hidden shadow-sm group">
                        <img src={formData.coverImage} className="w-full h-full object-cover" alt="Cover" />
                        <button onClick={() => setFormData({...formData, coverImage: null})} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"><X size={24} /></button>
                      </div>
                    )}
                  </div>

                  <div className={`transition-all duration-300 ${formData.coverImage ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                    <label className="block text-sm font-bold text-gray-500 mb-2 ml-1 flex items-center gap-2"><LayoutTemplate size={16}/> จัดเลย์เอาต์การ์ดหน้าโฮม</label>
                    <div className="flex bg-[#FDF8F1] p-1.5 rounded-2xl flex-wrap">
                      <button type="button" onClick={() => setFormData({...formData, layout: "image-top"})} className={`flex-1 min-w-[100px] py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold transition-all ${formData.layout === "image-top" ? "bg-white text-[#FF8E6E] shadow-sm" : "text-gray-400 hover:bg-white/50"}`}><AlignVerticalJustifyStart size={16}/> รูปบน</button>
                      <button type="button" onClick={() => setFormData({...formData, layout: "image-left"})} className={`flex-1 min-w-[100px] py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold transition-all ${formData.layout === "image-left" ? "bg-white text-[#FF8E6E] shadow-sm" : "text-gray-400 hover:bg-white/50"}`}><AlignLeft size={16}/> รูปซ้าย</button>
                      <button type="button" onClick={() => setFormData({...formData, layout: "image-right"})} className={`flex-1 min-w-[100px] py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold transition-all ${formData.layout === "image-right" ? "bg-white text-[#FF8E6E] shadow-sm" : "text-gray-400 hover:bg-white/50"}`}><AlignRight size={16}/> รูปขวา</button>
                    </div>
                  </div>
                </div>

                {/* Section 2: เนื้อหาฉบับเต็ม (Block Editor) */}
                <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-md border border-gray-100 space-y-5">
                  <div className="flex items-center gap-2 text-[#FF8E6E] mb-2"><FileText size={20}/><h3 className="font-black text-lg">ส่วนที่ 2: เนื้อหาฉบับเต็ม (จัดหน้าอิสระ)</h3></div>
                  
                  {/* ปุ่มเพิ่ม Block ใหม่ */}
                  <div className="flex gap-3 mb-6 bg-[#FDF8F1] p-2 rounded-2xl border border-gray-100">
                    <button onClick={() => addContentBlock("text")} className="flex-1 py-3 bg-white text-blue-500 rounded-xl font-bold text-sm hover:shadow-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border border-gray-100">
                      <Type size={16} /> เพิ่มย่อหน้าข้อความ
                    </button>
                    <button onClick={() => addContentBlock("image")} className="flex-1 py-3 bg-white text-purple-500 rounded-xl font-bold text-sm hover:shadow-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border border-gray-100">
                      <ImagePlus size={16} /> แทรกรูปภาพ 
                    </button>
                  </div>

                  {/* ลิสต์ Block ที่สร้างไว้ สามารถลากเพื่อสลับตำแหน่ง (Drag & Drop) ได้ */}
                  <Reorder.Group 
                    axis="y" 
                    values={formData.contentBlocks} 
                    onReorder={(newBlocks) => setFormData({...formData, contentBlocks: newBlocks})}
                    className="space-y-4"
                  >
                    {formData.contentBlocks.map((block) => (
                      <Reorder.Item key={block.id} value={block} className="group relative">
                        <motion.div 
                          layout 
                          className="bg-white border-2 border-gray-100 shadow-sm rounded-3xl p-5 hover:border-[#FF8E6E] transition-all relative overflow-hidden flex items-start gap-4"
                        >
                          {/* ปุ่มลาก (Grip) */}
                          <div className="text-gray-300 group-hover:text-[#FF8E6E] cursor-grab active:cursor-grabbing pt-4 transition-colors shrink-0">
                            <GripVertical size={24} />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* --- กรณี Block เป็น "ข้อความ" --- */}
                            {block.type === "text" && (
                              <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ย่อหน้าข้อความ</label>
                                <textarea 
                                  placeholder="เขียนรายละเอียดเนื้อหาที่นี่..."
                                  value={block.value}
                                  onChange={(e) => updateContentBlock(block.id, (b) => ({...b, value: e.target.value}))}
                                  className="w-full px-4 py-3 rounded-2xl bg-[#FDF8F1] border border-transparent outline-none font-medium text-[15px] focus:ring-2 focus:ring-[#FF8E6E]/30 focus:bg-white transition-all resize-y min-h-[100px] text-[#4A453A]"
                                />
                              </div>
                            )}

                            {/* --- กรณี Block เป็น "รูปภาพ" --- */}
                            {block.type === "image" && (
                              <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">รูปภาพประกอบ และ ข้อความ</label>
                                {!block.value ? (
                                  <div 
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = (e) => handleImageBlockChange(block.id, e);
                                      input.click();
                                    }}
                                    className="w-full h-32 bg-[#FDF8F1] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 cursor-pointer transition-all"
                                  >
                                    <ImagePlus size={28} className="mb-2" />
                                    <span className="text-xs font-bold">คลิกอัปโหลดรูปภาพ</span>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4">
                                      {/* รูปภาพพรีวิว */}
                                      <div className="relative w-full md:w-48 h-32 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-gray-100 group/img">
                                        <img src={block.value} className="w-full h-full object-cover" alt="Block Preview" />
                                        <button 
                                          onClick={() => updateContentBlock(block.id, (b) => ({...b, value: "", caption: ""}))}
                                          className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity"
                                        >
                                          <X size={24} />
                                        </button>
                                      </div>
                                      
                                      {/* ช่องพิมพ์ข้อความ (ให้อยู่ข้างรูป) */}
                                      <textarea 
                                        placeholder="พิมพ์ข้อความเพื่อให้ไปอยู่บรรทัดเดียวกับรูปภาพนี้..."
                                        value={block.caption || ""}
                                        onChange={(e) => updateContentBlock(block.id, (b) => ({...b, caption: e.target.value}))}
                                        className="flex-1 w-full px-4 py-3 rounded-2xl bg-[#FDF8F1] border border-transparent outline-none font-medium text-[14px] focus:ring-2 focus:ring-[#FF8E6E]/30 focus:bg-white transition-all resize-none text-[#4A453A]"
                                      />
                                    </div>

                                    {/* จัด Layout ภาพให้ภาพไปอยู่ซ้าย ขวา หรือกลาง */}
                                    <div className="flex gap-2 bg-[#FDF8F1] p-1.5 rounded-xl border border-gray-100">
                                      <button 
                                        onClick={() => updateContentBlock(block.id, (b) => ({...b, align: "left"}))}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${block.align === "left" ? "bg-white text-purple-500 shadow-sm" : "text-gray-400 hover:bg-white/50"}`}
                                      >
                                        <AlignLeft size={14} /> ให้รูปอยู่ซ้าย
                                      </button>
                                      <button 
                                        onClick={() => updateContentBlock(block.id, (b) => ({...b, align: "right"}))}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${block.align === "right" ? "bg-white text-purple-500 shadow-sm" : "text-gray-400 hover:bg-white/50"}`}
                                      >
                                        <AlignRight size={14} /> ให้รูปอยู่ขวา
                                      </button>
                                      <button 
                                        onClick={() => updateContentBlock(block.id, (b) => ({...b, align: "center"}))}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${block.align === "center" ? "bg-white text-purple-500 shadow-sm" : "text-gray-400 hover:bg-white/50"}`}
                                      >
                                        <AlignVerticalJustifyStart size={14} /> รูปเด่นเต็มบรรทัด
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ปุ่มลบบล็อกทิ้ง */}
                          <button 
                            onClick={() => removeContentBlock(block.id)}
                            className="text-gray-300 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl p-3 transition-colors shrink-0"
                            title="ลบบล็อกนี้"
                          >
                            <Trash2 size={18} />
                          </button>

                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>

                <button onClick={handleSavePost} className="w-full py-4 bg-gradient-to-r from-[#FF8E6E] to-[#FFB385] text-white rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Send size={20} /> โพสต์และกระจายข่าว
                </button>
              </div>

              {/* ─── กรอบพรีวิวจำลอง (ฝั่งขวา Live View) ─── */}
              <div className="lg:col-span-5 sticky top-6 bg-gray-100 rounded-[3rem] p-4 sm:p-6 flex flex-col items-center border-4 border-gray-200 shadow-inner min-h-[600px]">
                <div className="w-full flex justify-between items-center mb-4 px-2">
                  <div className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Live Preview
                  </div>
                  
                  {/* ปุ่มสลับโหมด Preview */}
                  <div className="flex bg-gray-200 p-1 rounded-xl">
                    <button onClick={() => setPreviewMode("card")} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all ${previewMode === "card" ? "bg-white text-[#FF8E6E] shadow-sm" : "text-gray-500"}`}><LayoutGrid size={12}/> การ์ด</button>
                    <button onClick={() => setPreviewMode("full")} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all ${previewMode === "full" ? "bg-white text-[#FF8E6E] shadow-sm" : "text-gray-500"}`}><Eye size={12}/> หน้าเต็ม</button>
                  </div>
                </div>
                
                {/* 🌟 แสดงพรีวิวโหมดการ์ดหน้าโฮม */}
                {previewMode === "card" && (
                  <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="w-full max-w-[320px] bg-white rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] mt-2">
                    <div className={`flex gap-3 ${!formData.coverImage ? "flex-col" : formData.layout === "image-top" ? "flex-col" : formData.layout === "image-left" ? "flex-row items-center" : "flex-row-reverse items-center"}`}>
                      {formData.coverImage && (
                        <div className={`rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 ${formData.layout === "image-top" ? "w-full h-40" : "w-24 h-24"}`}>
                          <img src={formData.coverImage} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF8E6E] mb-1.5 bg-orange-50 w-fit px-2 py-0.5 rounded-md"><Clock size={10} /> ตอนนี้</div>
                        <h4 className="font-black text-[15px] text-[#2D2A26] leading-tight mb-1 line-clamp-1">{formData.title ? "📢 " + formData.title : "หัวข้อข่าว..."}</h4>
                        <p className="text-[12px] font-medium text-[#7E7869] leading-relaxed line-clamp-2">{formData.shortContent || "คำโปรยสั้นๆ จะแสดงตรงนี้..."}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 🌟 แสดงพรีวิวโหมดอ่านเนื้อหาเต็ม (Full Article & Float Wrapping) */}
                {previewMode === "full" && (
                  <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="w-full max-w-[340px] h-[550px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-y-auto mt-2 relative hide-scrollbar">
                    {/* Navbar มือถือ */}
                    <div className="sticky top-0 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center gap-3 z-10">
                      <ArrowLeft size={18} className="text-gray-400" />
                      <span className="font-bold text-sm text-[#4A453A] truncate">{formData.title || "อ่านข่าวสาร"}</span>
                    </div>
                    
                    <div className="p-5 pb-10">
                      <h2 className="text-xl font-black text-[#4A453A] leading-tight mb-3 break-words">{formData.title ? "📢 " + formData.title : "กรุณาใส่หัวข้อข่าว"}</h2>
                      <div className="flex items-center gap-2 text-[#A8A294] text-[11px] font-bold mb-5"><Clock size={12} /> เผยแพร่เมื่อสักครู่</div>
                      
                      {/* รูปหน้าปก (Cover Image) */}
                      {formData.coverImage && (
                        <div className="w-full h-48 rounded-2xl overflow-hidden mb-5 shadow-sm border border-gray-100">
                          <img src={formData.coverImage} className="w-full h-full object-cover" alt="Cover Preview"/>
                        </div>
                      )}

                      {/* 🌟 Render บล็อกเนื้อหา (ใช้ Float ทำให้ข้อความพันล้อมรอบรูปภาพได้อย่างอิสระ) */}
                      <div className="space-y-4">
                        {formData.contentBlocks.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">เนื้อหาฉบับเต็มจะแสดงตรงนี้...</p>
                        ) : (
                          formData.contentBlocks.map((block, i) => (
                            <div key={block.id} className="text-[14px] text-[#7E7869] font-medium leading-[1.8] break-words whitespace-pre-line clear-both">
                              
                              {/* กรณี Text Block ธรรมดา */}
                              {block.type === "text" && block.value && (
                                <p>{block.value}</p>
                              )}
                              
                              {/* กรณี Image Block ที่มีข้อความ (ใช้ Float Wrap) */}
                              {block.type === "image" && block.value && (
                                <div className="w-full pt-1">
                                  {block.align === "left" && (
                                    <img src={block.value} className="w-1/2 max-w-[140px] rounded-xl object-cover float-left mr-4 mb-2 shadow-sm border border-gray-100" alt={`Block ${i}`} />
                                  )}
                                  {block.align === "right" && (
                                    <img src={block.value} className="w-1/2 max-w-[140px] rounded-xl object-cover float-right ml-4 mb-2 shadow-sm border border-gray-100" alt={`Block ${i}`} />
                                  )}
                                  {block.align === "center" && (
                                    <img src={block.value} className="w-full rounded-2xl object-cover mb-3 shadow-sm border border-gray-100" alt={`Block ${i}`} />
                                  )}
                                  
                                  {block.caption && <span>{block.caption}</span>}
                                  {/* บรรทัดเคลียร์ Float เพื่อไม่ให้รูปชนกันเอง */}
                                  <div className="clear-both"></div>
                                </div>
                              )}

                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </div>
              
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}