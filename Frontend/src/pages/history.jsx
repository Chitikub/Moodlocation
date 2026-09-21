"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ChevronLeft,
  Trash2,
  ArrowRight,
  Navigation,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import api from "@/api/axios";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [histories, setHistories] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [isVisible, setIsVisible] = useState(false);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
if (!token) {
  console.log("ไม่มี Token, กรุณาเข้าสู่ระบบ");
  return; 
}
      setLoading(true);
      const res = await api.get("/history");
      const data = res.data.histories || res.data || [];
      
      if (Array.isArray(data)) {
        // 🌟 1. เรียงลำดับจากเวลาล่าสุดไปหาอดีต (เพื่อให้การกดครั้งล่าสุดอยู่ด้านหน้าสุด)
        const sortedData = data.sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt));
        
        // 🌟 2. ทำการยุบรวมข้อมูลสถานที่ซ้ำ โดยเก็บเฉพาะรายการล่าสุดที่พบบนลิสต์
        const uniqueHistories = [];
        const seenPlaceIds = new Set();
        
        for (const item of sortedData) {
          // ถ้าหากยังไม่เคยเจอ placeId นี้ในระบบมาก่อน ให้บันทึกข้อมูลเก็บไว้
          if (!seenPlaceIds.has(item.placeId)) {
            seenPlaceIds.add(item.placeId);
            uniqueHistories.push(item);
          }
        }

        setHistories(uniqueHistories);
        setFilteredData(uniqueHistories);
      } else {
        setHistories([]);
        setFilteredData([]);
      }
    } catch (err) {
      console.error("Fetch History Error:", err);
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsVisible(true);
    fetchHistory();
  }, []);

  useEffect(() => {
    if (timeFilter === "all") {
      setFilteredData(histories);
      return;
    }
    const now = new Date();
    const result = histories.filter((item) => {
      const diffDays = Math.ceil(
        Math.abs(now - new Date(item.visitedAt)) / (1000 * 60 * 60 * 24),
      );
      return diffDays <= parseInt(timeFilter);
    });
    setFilteredData(result);
  }, [timeFilter, histories]);

  const handleDeleteHistory = async (id, name) => {
    const result = await Swal.fire({
      title: "ลบประวัติการเดินทาง?",
      text: `คุณต้องการลบ "${name}" ออกจากประวัติใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF8E6E",
      confirmButtonText: "ใช่, ลบออก",
      cancelButtonText: "ยกเลิก",
      background: "#FDF8F1",
      customClass: { popup: "rounded-[30px]" },
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/history/${id}`);
        setHistories(histories.filter((item) => item.id !== id));
        Swal.fire({
          icon: "success",
          title: "ลบสำเร็จ",
          timer: 800,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire("ผิดพลาด", "ไม่สามารถลบได้ในขณะนี้", "error");
      }
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#FDF8F1] pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 font-['Prompt',sans-serif]">
      <div
        className={`max-w-6xl mx-auto transition-all duration-500 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-[#7E7869] hover:text-[#FF8E6E] transition-all font-bold text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              ย้อนกลับ
            </button>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#4A453A]">
              ประวัติการ<span className="text-[#FF8E6E]">นำทาง</span>
            </h1>

            <p className="text-[#7E7869] font-medium text-base sm:text-lg">
              รวบรวมพิกัดที่คุณเคยไปทั้งหมด {filteredData.length} รายการ
            </p>
          </div>

          {/* --- Time Filter Chips --- */}
          <div className="flex bg-[#EFE9D9]/50 p-1 sm:p-1.5 rounded-2xl gap-1 border border-white w-full md:w-auto overflow-x-auto">
            {[
              { label: "ทั้งหมด", value: "all" },
              { label: "7 วันล่าสุด", value: "7" },
              { label: "30 วันล่าสุด", value: "30" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={`flex-1 md:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${timeFilter === f.value ? "bg-[#4A453A] text-white shadow-md" : "text-[#7E7869] hover:bg-white"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- Content --- */}
        {loading ? (
          <div className="text-center py-20 animate-pulse text-[#7E7869] font-bold text-lg sm:text-xl">
            กำลังดึงความทรงจำ...
          </div>
        ) : filteredData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredData.map((item) => {
                const rawImage = item.placeImage;
                const normalizedImage = Array.isArray(rawImage)
                  ? rawImage[0]?.toString().trim()
                  : rawImage?.toString().trim();
                const imageUrl = normalizedImage
                  ? normalizedImage.startsWith("http") || normalizedImage.startsWith("//")
                    ? normalizedImage.startsWith("//")
                      ? `https:${normalizedImage}`
                      : normalizedImage
                    : normalizedImage.includes("maps.googleapis.com/maps/api/place/photo")
                      ? normalizedImage
                      : normalizedImage.includes("photo_reference=")
                        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&${normalizedImage}`
                        : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(normalizedImage)}&key=${API_KEY}`
                  : "https://placehold.co/600x400/EFE9D9/4A453A?text=No+Image";

                return (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="group relative bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                  >
                    {/* Image */}
                    <div className="h-48 sm:h-56 relative overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={item.placeName}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/600x400/EFE9D9/4A453A?text=No+Image"; }}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />

                      {/* Date badge */}
                      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-white/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#4A453A] shadow-sm">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF8E6E]" />
                        {new Date(item.visitedAt).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteHistory(item.id, item.placeName)
                        }
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-lg transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    {/* Card body */}
                    <div className="p-5 sm:p-8">
                      <h3 className="text-xl sm:text-2xl font-black text-[#4A453A] mb-3 sm:mb-4 group-hover:text-[#FF8E6E] transition-colors line-clamp-1">
                        {item.placeName}
                      </h3>

                      <div className="flex items-center justify-between mt-4 sm:mt-6">
                        <button
                          onClick={() => navigate(`/g-place/${item.placeId}`)}
                          className="text-[#FF8E6E] font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 group/btn"
                        >
                          รายละเอียด
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-2 transition-transform" />
                        </button>

                        <button
                          onClick={() =>
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=Google&destination_place_id=${item.placeId}`, "_blank")
                          }
                          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#4A453A] text-white rounded-xl text-xs font-bold hover:bg-[#FF8E6E] transition-colors shadow-lg active:scale-95"
                        >
                          <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          นำทางอีกครั้ง
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] p-10 sm:p-20 text-center border border-white shadow-xl max-w-2xl mx-auto">
            <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-[#FF8E6E] mx-auto mb-4 sm:mb-6 opacity-40" />
            <h2 className="text-xl sm:text-2xl font-black text-[#4A453A] mb-3 sm:mb-4">
              ยังไม่มีประวัติการเดินทาง
            </h2>
            <p className="text-[#7E7869] text-sm sm:text-base mb-6 sm:mb-8">
              พิกัดแรกของคุณกำลังรออยู่นะ!
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#4A453A] text-white px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#FF8E6E] transition-all shadow-lg"
            >
              เริ่มการเดินทาง
            </button>
          </div>
        )}
      </div>
    </main>
  );
}