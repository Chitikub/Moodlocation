"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  ChevronLeft,
  ArrowRight,
  Navigation,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import api from "@/api/axios";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
      console.log("ไม่มี Token, กรุณาเข้าสู่ระบบ");
      return; 
    }
      setLoading(true);
      const res = await api.get("/favorites", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = res.data.favorites || res.data || [];
      const limitedData = Array.isArray(data) ? data.slice(0, 10) : [];
      setFavorites(limitedData);
    } catch (err) {
      console.error("Fetch Favorites Error:", err);
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsVisible(true);
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (placeId, name) => {
    const result = await Swal.fire({
      title: "นำออกจากรายการโปรด?",
      text: `คุณต้องการนำ "${name}" ออกใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF8E6E",
      confirmButtonText: "ใช่, นำออก",
      cancelButtonText: "ยกเลิก",
      background: "#FDF8F1",
      customClass: { popup: "rounded-[30px]" },
    });

    if (result.isConfirmed) {
      try {
        await api.post("/favorites/toggle", { placeId });
        setFavorites(favorites.filter((item) => item.placeId !== placeId));
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
              รายการ<span className="text-[#FF8E6E]">โปรด</span>
            </h1>

            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <p className="text-[#7E7869] font-medium text-base sm:text-lg">
                สถานที่ที่คุณประทับใจล่าสุด
              </p>
              {!loading && (
                <span className="bg-orange-50 border border-orange-100 text-[#FF8E6E] px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                  <Heart size={13} className="fill-[#FF8E6E]" />{" "}
                  {favorites.length} / 10
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- Content --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#FF8E6E] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-[#7E7869] text-sm sm:text-base">
              กำลังเปิดกล่องความทรงจำ...
            </p>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            <AnimatePresence mode="popLayout">
              {favorites.map((item) => {
                const rawImage = item.placeImage || item.image || item.imageUrl;
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
                        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&${normalizedImage}&key=${API_KEY}`
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
                    <div className="h-48 sm:h-60 relative overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={item.placeName}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/600x400/EFE9D9/4A453A?text=No+Image"; }}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <button
                        onClick={() =>
                          handleRemoveFavorite(item.placeId, item.placeName)
                        }
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 shadow-lg transition-all active:scale-90 hover:bg-red-500 hover:text-white"
                      >
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                      </button>
                    </div>

                    {/* Card body */}
                    <div className="p-5 sm:p-8">
                      <h3 className="text-xl sm:text-2xl font-black text-[#4A453A] mb-2 sm:mb-3 group-hover:text-[#FF8E6E] transition-colors line-clamp-1">
                        {item.placeName}
                      </h3>

                      <div className="flex items-center justify-between mt-4 sm:mt-6">
                        <button
                          onClick={() => navigate(`/g-place/${item.placeId}`)}
                          className="text-[#FF8E6E] font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 group/btn"
                        >
                          ดูรายละเอียด
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-2 transition-transform" />
                        </button>

                        <button
                          onClick={() =>
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=Google&destination_place_id=${item.placeId}`, "_blank")
                          }
                          className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#4A453A] text-white rounded-xl text-xs font-bold hover:bg-[#FF8E6E] transition-colors shadow-lg active:scale-95"
                        >
                          <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
                          นำทาง
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] p-10 sm:p-20 text-center border border-white shadow-xl max-w-2xl mx-auto"
          >
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-[#FF8E6E] mx-auto mb-4 sm:mb-6 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-[#4A453A] mb-3 sm:mb-4">
              ยังไม่มีสถานที่โปรดเลย
            </h2>
            <p className="text-[#7E7869] text-sm sm:text-base mb-8 sm:mb-10">
              ลองไปสำรวจสถานที่ใหม่ๆ แล้วกดหัวใจเก็บไว้ดูนะ!
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#4A453A] text-white px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#FF8E6E] transition-all shadow-lg active:scale-95"
            >
              ไปสำรวจกันเลย
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
