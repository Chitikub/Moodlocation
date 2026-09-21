  "use client";
import { 
  Search, ArrowLeft, Star, MapPin, X, Navigation, Newspaper, 
  Calendar, Sparkles, ChevronRight, ChevronLeft
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import heroBg from "@/assets/hero-bg.png";
import MoodSelector from "@/components/MoodSelector";
import api from "../api/axios";
import Swal from "sweetalert2";
import { io } from "socket.io-client";

// เชื่อมต่อ Socket
const socket = io(import.meta.env.VITE_SOCKET_URL);
const AI_CACHE_TTL = 10 * 60 * 1000;
const AI_CACHE_PREFIX = "moodlocation:ai:v2:";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeMood, setActiveMood] = useState(null);
  const [aiModalData, setAiModalData] = useState(null);
  const [searchPlaces, setSearchPlaces] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  
  // 🌟 State สำหรับระบบประกาศ
  const [announcements, setAnnouncements] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  
  // 🌟 State สำหรับข้อมูลผู้ใช้
  const [user, setUser] = useState(null); 
  const searchDebounceRef = useRef(null);

  const navigate = useNavigate();
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "";

  // 🌟 Function เพื่อ get greeting message ตามเวลา
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "สวัสดีตอนเช้า";
    if (hour >= 12 && hour < 18) return "สวัสดีตอนบ่าย";
    if (hour >= 18 && hour < 24) return "สวัสดีตอนเย็น";
    return "สวัสดีตอนดึก";
  };

  // 🌟 Function เพื่อ get profile image
  const getProfileImage = () => {
    if (!user?.profileImage) 
      return `https://ui-avatars.com/api/?name=${user?.firstName || "User"}&background=FF8E6E&color=fff&size=200`;
    if (user.profileImage.startsWith("data:")) return user.profileImage;
    if (user.profileImage.startsWith("http")) return user.profileImage;
    return `${IMAGE_BASE_URL}${user.profileImage}`;
  };

  const moodCategories = {
    happy: [
      { id: "cafe", label: "☕ คาเฟ่", query: "คาเฟ่" },
      { id: "concert", label: "🎤 คอนเสิร์ต", query: "คอนเสิร์ต" },
      { id: "amusement", label: "🎢 สวนสนุก", query: "สวนสนุก" },
      { id: "restaurant", label: "🍽️ ร้านอาหาร", query: "ร้านอาหาร" },
      { id: "entertainment", label: "🎭 สถานบันเทิง", query: "สถานบันเทิง" },
      { id: "camp", label: "🏕️ แคมป์", query: "แคมป์" },
      { id: "golf", label: "⛳ สนามกอล์ฟ", query: "สนามกอล์ฟ" },
    ],
    sad: [
      { id: "river", label: "🌊 ริมแม่น้ำ", query: "ริมน้ำ" },
      { id: "park", label: "🌳 สวนสาธารณะ", query: "สวนสาธารณะ" },
      { id: "temple", label: "⛩️ วัด", query: "วัด" },
      { id: "forest", label: "🌲 ป่าเขา", query: "ป่าเขา" },
      { id: "viewpoint", label: "🌄 จุดชมวิว", query: "จุดชมวิว" },
      { id: "bar", label: "🍸 บาร์", query: "บาร์" },
      { id: "beach", label: "🏖️ ทะเล", query: "ทะเล" },
    ],
    bored: [
      { id: "exhibition", label: "🖼️ นิทรรศการ", query: "นิทรรศการ" },
      { id: "workshop", label: "🛠️ workshop", query: "workshop" },
      { id: "beach", label: "🏖️ ทะเล", query: "ทะเล" },
      { id: "cinema", label: "🎬 โรงภาพยนตร์", query: "โรงภาพยนตร์" },
      { id: "cafe", label: "☕ ร้านกาแฟ", query: "ร้านกาแฟ" },
      { id: "event", label: "🎪 งาน Event", query: "Event" },
    ],
    stressed: [
      { id: "boardgame", label: "🎲 ร้านบอร์ดเกม", query: "ร้านบอร์ดเกม" },
      { id: "mall", label: "🛍️ ห้างสรรพสินค้า", query: "ห้างสรรพสินค้า" },
      { id: "spa", label: "💆‍♀️ สปา", query: "สปา" },
      { id: "onsen", label: "♨️ ออนเซน", query: "ออนเซน" },
      { id: "resort", label: "🏞️ ที่พักท่ามกลางธรรมชาติ", query: "ที่พักท่ามกลางธรรมชาติ" },
      { id: "gaming", label: "🎮 ร้านเกม", query: "ร้านเกม" },
      { id: "sports", label: "🏟️ สนามกีฬา", query: "สนามกีฬา" },
      { id: "hiking", label: "🥾 เดินป่า/ภูเขา", query: "เดินป่า" },
    ],
    angry: [
      { id: "gym", label: "🏋️‍♂️ ยิม", query: "ยิม" },
      { id: "karaoke", label: "🎤 คาราโอเกะ", query: "คาราโอเกะ" },
      { id: "mall", label: "🛍️ ห้างสรรพสินค้า", query: "ห้างสรรพสินค้า" },
      { id: "fitness", label: "🏃‍♂️ ฟิตเนส", query: "ฟิตเนส" },
      { id: "park", label: "🌳 สวนสาธารณะ", query: "สวนสาธารณะ" },
      { id: "shooting", label: "🔫 สนามยิงปืน", query: "สนามยิงปืน" },
    ],
  };

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        title: "หยุดก่อน! ✋",
        text: "กรุณาเข้าสู่ระบบเพื่อใช้ฟีเจอร์วิเคราะห์อารมณ์และค้นหาสถานที่",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#FF8E6E",
        cancelButtonColor: "#7E7869",
        confirmButtonText: "ไปหน้าเข้าสู่ระบบ",
        cancelButtonText: "ไว้ทีหลัง",
        reverseButtons: true,
        customClass: { popup: "rounded-[30px]" },
      }).then((result) => {
        if (result.isConfirmed) navigate("/login");
      });
      return false;
    }
    return true;
  };

  const handleMoodSelect = (emotionId) => {
    if (!checkAuth()) return;
    navigate(`/filter?mood=${emotionId}`);
  };

  const handleCategorySelect = (categoryQuery) => {
    const searchKeyword = `${categoryQuery} ใกล้ฉัน`;
    const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchKeyword)}`;
    window.open(googleMapsUrl, "_blank"); 
  };

  const summarizeReason = (reasonText) => {
    if (!reasonText) return "ระบบวิเคราะห์จากข้อความและอาการที่คุณระบุ";
    const cleaned = String(reasonText).replace(/\s+/g, " ").trim();
    const firstSentence = cleaned.split(/[.!?]/)[0]?.trim();
    if (!firstSentence) return cleaned;
    if (firstSentence.length <= 110) return firstSentence;

    const shortened = firstSentence.slice(0, 110);
    const lastSpace = shortened.lastIndexOf(" ");
    return `${shortened.slice(0, lastSpace > 0 ? lastSpace : 110).trim()}…`;
  };

  const fetchAiPlaces = async (moodKey, preferredKeyword, lat, lng) => {  
    const fallbackKeywords = [
      preferredKeyword,
      ...moodCategories[moodKey].slice(0, 4).map((cat) => cat.query),
    ];
    const uniqueKeywords = [...new Set(fallbackKeywords.filter(Boolean))];
    const requests = uniqueKeywords.map((keyword) =>
      api
        .get("/maps/search", {
          params: {
            keyword,
            ...(lat != null && lng != null ? { lat, lng } : {}),
          },
        })
        .then((res) => (Array.isArray(res.data) ? res.data : []))
        .catch(() => []),
    );

    const results = await Promise.all(requests);
    const mergedPlaces = results
      .flat()
      .reduce((acc, place) => {
        const key = place.place_id || `${place.name}-${place.vicinity || place.formatted_address}`;
        if (!acc.map.has(key)) {
          acc.map.set(key, place);
          acc.list.push(place);
        }
        return acc;
      }, { map: new Map(), list: [] }).list;

    return mergedPlaces.slice(0, 7);
  };

  const performAiSearch = async (textToSearch) => {
    if (!textToSearch.trim()) return;
    if (!checkAuth()) return;
    const isTextonly= /^[a-zA-Zก-์\s]+$/.test(textToSearch.trim());
    setSearchPlaces([]);
    setIsSearchingPlaces(true);

    if (!isTextonly) {
      setIsSearchingPlaces(false);
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณากรอกข้อความที่สื่อความหมไาย",
        icon: "warning",
        confirmButtonColor: "#FF8E6E",
        confirmButtonText: "ตกลง",
        reverseButtons: true,
        customClass: { popup: "rounded-[30px]" },
      });

      return;

    }


    try {
      Swal.fire({
        title: "กำลังประมวลผล",
        html: "ระบบกำลังวิเคราะห์อารมณ์และค้นหาสถานที่ที่เหมาะสมสำหรับคุณ",
        allowOutsideClick: false,
        customClass: {
          popup: "rounded-[30px] bg-[#FDF8F1] border border-[#F0E7DF] shadow-[0_20px_60px_-20px_rgba(74,69,58,0.25)] p-5",
          title: "text-[#4A453A] text-xl font-black",
          htmlContainer: "text-[#7E7869] text-sm font-medium",
          confirmButton: "bg-[#FF8E6E] hover:bg-[#F77A5D] text-white rounded-full px-6"
        },
        didOpen: () => Swal.showLoading(),
      });
      const cacheKey = `${AI_CACHE_PREFIX}${textToSearch.trim().toLowerCase()}`;
      let aiData;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const cachedEntry = JSON.parse(cached);
        if (Date.now() - cachedEntry.createdAt < AI_CACHE_TTL) {
          aiData = cachedEntry.data;
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      }

      if (!aiData) {
        const aiRes = await api.post("/ai/analyze-emotion", { text: textToSearch });
        aiData = aiRes.data;
        sessionStorage.setItem(cacheKey, JSON.stringify({ createdAt: Date.now(), data: aiData }));
      }

      const { emotion, reason } = aiData;
      const shortReason = summarizeReason(reason);
      console.log(aiData)
      let moodKey = "happy";
      if (emotion.includes("สุข")) moodKey = "happy";
      else if (emotion.includes("โกรธ")) moodKey = "angry";
      else if (emotion.includes("เบื่อ")) moodKey = "bored";
      else if (emotion.includes("เศร้า")) moodKey = "sad";
      else if (emotion.includes("เครียด")) moodKey = "stressed";

      // ************** ระบบสุ่ม ***************
      const randomCategory = moodCategories[moodKey][Math.floor(Math.random() * moodCategories[moodKey].length)].query;

      const findPlacesForPopup = async (lat, lng) => {
        try {
          const places = await fetchAiPlaces(moodKey, randomCategory, lat, lng);
          const availableCategories = moodCategories[moodKey].filter((cat) =>

            // เเค่มี1ร้านก็เเสดง
            places.some((place) => {
 
              //ชื่อตรงกับหมวดไหนก็สามารถไปหมวดนั้นได้ เเก้เอาทีอยู่ออก
              const haystack = `${place.name || ""} ${(place.types || []).join(" ")}`.toLowerCase();
              return haystack.includes(cat.query.toLowerCase());
            }),
          );
          Swal.close();
          const hasPlaces = places.length > 0;
          setAiModalData({
            emotion,
            reason: shortReason,
            moodKey,
            places,
            availableCategories,
            selectedCategory: null,
            fallbackMessage: hasPlaces
              ? null
              : "ยังไม่พบสถานที่จากตำแหน่งปัจจุบัน เราแนะนำให้ดูสถานที่ทั้งหมดสำหรับอารมณ์นี้ต่อ",
          });
          setSearchPlaces(places);
        } catch {
          Swal.close();
          setAiModalData({ emotion, reason: shortReason, moodKey, places: [], availableCategories: [], selectedCategory: null, fallbackMessage: "ไม่พบสถานที่ในตอนนี้ กรุณาลองดูสถานที่ทั้งหมดสำหรับอารมณ์นี้" });
          setSearchPlaces([]);
        } finally {
          setIsSearchingPlaces(false);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => findPlacesForPopup(pos.coords.latitude, pos.coords.longitude),
          () => findPlacesForPopup(null, null)
        );
      } else {
        findPlacesForPopup(null, null);
      }
    } catch (error) {
  Swal.close();

  const message =
    error.response?.data?.message ||
    "ไม่สามารถเชื่อมต่อระบบ AI ได้ในขณะนี้";

  Swal.fire("แจ้งเตือน", message, "warning");
  setIsSearchingPlaces(false);
  setSearchPlaces([]); 
}
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      performAiSearch(searchQuery);
    }, 800);
  };

  useEffect(() => {
    // ดึงข้อมูลผู้ใช้จาก localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchAnnouncements = async () => {
      try {
        const res = await api.get("/announcements");
        const data = res.data.announcements || res.data || [];
        if (Array.isArray(data)) {
          setAnnouncements(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
      } catch (error) {
        const localData = JSON.parse(localStorage.getItem("admin_mock_announcements") || "[]");
        setAnnouncements(localData);
      }
    };
    fetchAnnouncements();

    socket.on("receive_announcement", (data) => {
      setAnnouncements((prev) => [
        {
          id: data.id || Date.now(),
          title: data.title || "ประกาศจากผู้พัฒนา",
          description: data.content || data.message || data.shortContent || "",
          shortContent: data.shortContent || data.description || "",
          coverImage: data.coverImage || null,
          contentBlocks: data.contentBlocks || [],
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
    });

    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 15,
        y: (e.clientY / window.innerHeight) * 15,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      socket.off("receive_announcement");
    };
  }, []);

  return (
    <div className="w-full bg-[#FDF8F1] text-[#4A453A] overflow-x-hidden font-['Prompt',sans-serif] relative">
      
      {/* ─── Modal อ่านข่าวสารฉบับเต็ม ─── */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white w-full sm:max-w-3xl h-[90vh] sm:h-[85vh] rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative">
              <div className="bg-white/90 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 text-[#FF8E6E] rounded-full flex items-center justify-center"><Sparkles size={20}/></div>
                  <div>
                    <h3 className="font-black text-[#4A453A] leading-none">อ่านข่าวสาร</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">อัปเดตล่าสุดจากระบบ</p>
                  </div>
                </div>
                <button onClick={() => setSelectedNews(null)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 hide-scrollbar pb-24">
                <h1 className="text-2xl sm:text-3xl font-black text-[#4A453A] leading-tight mb-4">{selectedNews.title}</h1>
                <div className="flex items-center gap-2 text-[#FF8E6E] bg-orange-50 w-fit px-3 py-1.5 rounded-lg text-xs font-bold mb-6">
                  <Calendar size={14} /> 
                  {new Date(selectedNews.createdAt).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {selectedNews.coverImage && (
                  <div className="w-full h-48 sm:h-72 rounded-3xl overflow-hidden mb-8 shadow-sm border border-gray-100">
                    <img src={selectedNews.coverImage} className="w-full h-full object-cover" alt="Cover" />
                  </div>
                )}
                <div className="space-y-6 text-[#7E7869] text-[15px] sm:text-[16px] leading-relaxed font-medium">
                  {selectedNews.contentBlocks?.map((block, i) => (
                    <div key={block.id || i} className="clear-both">
                      {block.type === "text" && block.value && <p className="whitespace-pre-line">{block.value}</p>}
                      {block.type === "image" && block.value && (
                        <div className="py-2">
                          {block.align === "left" && <img src={block.value} className="w-1/2 max-w-[200px] sm:max-w-[250px] rounded-2xl object-cover float-left mr-5 mb-3 shadow-sm border border-gray-100" alt="Content" />}
                          {block.align === "right" && <img src={block.value} className="w-1/2 max-w-[200px] sm:max-w-[250px] rounded-2xl object-cover float-right ml-5 mb-3 shadow-sm border border-gray-100" alt="Content" />}
                          {block.align === "center" && <img src={block.value} className="w-full rounded-2xl object-cover mb-4 shadow-sm border border-gray-100" alt="Content" />}
                          {block.caption && <span className="block text-sm text-gray-400 italic mt-2">{block.caption}</span>}
                          <div className="clear-both"></div>
                        </div>
                      )}
                    </div>
                  )) || <p className="whitespace-pre-line">{selectedNews.fullContent || selectedNews.shortContent}</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal แสดงผล AI วิเคราะห์อารมณ์ ─── */}
      <AnimatePresence>
  {aiModalData && (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => setAiModalData(null)}
    >
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 300 }} 

        onClick={(e) => e.stopPropagation()}
        className="bg-[#F5F0EB] w-full sm:max-w-xl sm:mx-4 max-h-[92dvh] flex flex-col shadow-[0_30px_80px_-20px_rgba(74,69,58,0.30)] overflow-hidden rounded-t-[2.2rem] sm:rounded-[2.3rem]"
      >
        <div className="px-4 pt-3 pb-4 border-b border-[#E9E0D8] bg-[#F5F0EB]">
          <div className="flex items-center justify-between mb-4 gap-3">
            <button 
              onClick={() => setAiModalData(null)} 
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-[#4A453A] shadow-sm border border-[#EFE3D8] transition hover:bg-[#FFF4EE]"
              aria-label="ย้อนกลับ"

            >
              <ChevronLeft size={18} />
              <span className="text-sm font-bold">ย้อนกลับ</span>
            </button>
            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8D8378]">ผลประเมิน</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="rounded-[1.8rem] bg-white border border-[#F0E6DE] p-4 shadow-[0_18px_28px_-18px_rgba(74,69,58,0.20)]">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setAiModalData(null);
                  setSearchPlaces([]);
                  setSearchQuery("");
                  navigate("/");
                }}
                aria-label="กลับหน้าแรก"
                className="relative z-10 w-12 h-12 rounded-2xl overflow-hidden bg-[#FFF0E8] border border-[#F2DCCB] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                <img src="/logo1.png" alt="MoodLocation" className="w-full h-full object-cover" />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A8A7C]">อารมณ์ที่พบ</p>
                <h2 className="text-xl font-black text-[#2E2A26] leading-snug mt-1">{aiModalData.emotion}</h2>
              </div>
            </div>

            <div className="rounded-[1.2rem] bg-[#FFF8F3] border border-[#F7E4D8] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A08C7C] mb-2">เหตุผล</p>
              <p className="text-sm text-[#5D574F] leading-relaxed line-clamp-3">{aiModalData.reason}</p>
            </div>
          </div>
        </div>

        {aiModalData.availableCategories && aiModalData.availableCategories.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {[
                { label: "ทั้งหมด", value: "all" },
                ...aiModalData.availableCategories.map((cat) => ({ label: cat.label, value: cat.query }))
              ].map((cat) => {
                const isSelected = !aiModalData.selectedCategory
                  ? cat.value === "all"
                  : aiModalData.selectedCategory === cat.value;

                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      if (cat.value === "all") {
                        setAiModalData((prev) => ({ ...prev, selectedCategory: null }));
                        return;
                      }
                      setAiModalData((prev) => ({ ...prev, selectedCategory: cat.value }));
                    }}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition ${
                      isSelected
                        ? "bg-[#FF8E6E] text-white shadow-sm"
                        : "bg-white text-[#4A453A] border border-[#EDE1D8]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2">
          {(() => {
            const filteredPlaces = aiModalData.selectedCategory
              ? aiModalData.places.filter((place) => {
                  const haystack = `${place.name || ""} ${place.vicinity || ""} ${place.formatted_address || ""} ${(place.types || []).join(" ")}`.toLowerCase();
                  return haystack.includes(aiModalData.selectedCategory.toLowerCase());
                })
              : aiModalData.places;

            return filteredPlaces.length > 0 ? (
              <div className="space-y-4 pb-2">
                {filteredPlaces.map((place, idx) => {
                  const tags = (place.types || []).slice(0, 3).map((type) => type.replace(/_/g, ' '));
                  const rating = place.rating || (4.5 + (idx % 4) * 0.2).toFixed(1);

                  return (
                    <motion.article
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                      key={idx}
                      onClick={() => navigate(`/g-place/${place.place_id}`)}
                      className="group overflow-hidden rounded-[1.8rem] border border-[#EADFD5] bg-white shadow-[0_18px_30px_-24px_rgba(74,69,58,0.25)] cursor-pointer"
                    >
                      <div className="relative h-52 w-full overflow-hidden bg-[#F7F1EB]">
                        {place.photos?.length > 0 ? (
                          <img
                            src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`}
                            alt={place.name}
                            className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F9E7DB] via-[#F4EAE3] to-[#E7F0EA] text-sm font-bold text-[#7E7869]">
                            ไม่มีรูปภาพ
                          </div>
                        )}
                        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black tracking-[0.18em] text-[#FF8E6E] backdrop-blur-sm border border-[#F5E2D6]">
                          แนะนำ
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-lg font-black leading-snug text-[#2E2A26]">{place.name}</h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0E8] px-2 py-1 text-[11px] font-black text-[#FF8E6E]">
                            <Star size={11} className="fill-[#FF8E6E] text-[#FF8E6E]" />
                            {rating}
                          </span>
                        </div>

                        <p className="mt-2 flex items-start gap-1 text-[12px] text-[#7E7869] leading-relaxed">
                          <MapPin size={12} className="mt-0.5 shrink-0 text-[#BFAE9F]" />
                          <span>{place.vicinity || place.formatted_address || 'สถานที่ที่เหมาะสำหรับอารมณ์นี้'}</span>
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {tags.length > 0 ? (
                            tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-[#F8F1ED] px-2.5 py-1 text-[10px] font-bold text-[#6E625A]">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-[#F8F1ED] px-2.5 py-1 text-[10px] font-bold text-[#6E625A]">
                              {aiModalData.emotion}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-[#FF8E6E]/40 bg-[#FFF7F0] p-6 text-center shadow-sm">
                <p className="text-[#4A453A] text-base font-black mb-2">ยังไม่มีสถานที่แนะนำ</p>
                <p className="text-sm text-[#7E7869]">{aiModalData.fallbackMessage || 'ขณะนี้ยังไม่มีข้อมูลสถานที่สำหรับอารมณ์นี้ กรุณาลองใหม่อีกครั้ง'}</p>
              </div>
            );
          })()}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* ─── MOBILE HOME SECTION ─── */}
      <section className="sm:hidden bg-[#FDF8F1] min-h-screen pb-24">
        <div className="px-5 pt-5">
          <div className="flex items-center gap-4">
            {/* Profile Image */}
            <div className="w-16 h-16 rounded-3xl border-2 border-[#FF8E6E]/20 overflow-hidden shadow-md bg-gray-100 shrink-0">
              <img 
                src={getProfileImage()} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Greeting Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#7E7869]">{getGreeting()}</p>
              <h1 className="text-2xl font-black text-[#4A453A] truncate">{user?.firstName || user?.name || "ผู้ใช้งาน"}</h1>
            </div>
          </div>

          <div className="mt-5 rounded-[2.5rem] bg-white border border-gray-100 shadow-[0_20px_60px_-30px_rgba(74,69,58,0.25)] p-5">
            <div className="mb-6">
              <p className="text-sm font-black text-[#4A453A]">วันนี้คุณรู้สึกอย่างไร?</p>
              <p className="text-sm text-[#7E7869] mt-3 leading-relaxed">
                ลองพิมพ์ความรู้สึกของคุณ แล้วให้ AI ช่วยวิเคราะห์ พร้อมแนะนำสถานที่
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="rounded-3xl border border-[#F4E8E1] bg-[#FFF8F4] px-4 py-3 shadow-sm">
                <input
                  type="text"
                  placeholder="วันนี้... ฉันคิดถึงอะไรบ้าง"
                  className="w-full bg-transparent text-base text-[#4A453A] outline-none placeholder:text-[#C1B4A8]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-3xl bg-[#FF8E6E] py-4 text-sm font-black text-white shadow-lg shadow-[#FF8E6E]/25 transition hover:bg-[#F7695D]"
              >
                วิเคราะห์ด้วย AI
              </button>
            </form>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#4A453A]">เลือกตามอารมณ์</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { id: 'happy', label: 'มีความสุข', emoji: '😁', color: '#FF8E6E', bg: '#FFF1EC' },
                { id: 'sad', label: 'เศร้า', emoji: '😢', color: '#60A5FA', bg: '#EEF5FF' },
                { id: 'stressed', label: 'เครียด', emoji: '🤯', color: '#A855F7', bg: '#F5EEFF' },
                { id: 'angry', label: 'โกรธ', emoji: '😡', color: '#FF4D4D', bg: '#FFEEEE' },
                { id: 'bored', label: 'เบื่อ', emoji: '😫', color: '#FFB385', bg: '#FFF6EE' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMoodSelect(item.id)}
                  className="rounded-[2rem] border border-gray-100 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"
                >
                  <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: item.bg }}>
                    <span className="text-lg">{item.emoji}</span>
                  </div>
                  <p className="text-[13px] font-bold text-[#4A453A]">{item.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#4A453A]">สถานที่แนะนำสำหรับคุณ</h2>
              <span className="text-xs font-bold text-[#FF8E6E]">ดูทั้งหมด</span>
            </div>
            <div className="mt-4 space-y-3">
              {announcements.length > 0 ? (
                announcements.slice(0, 2).map((news) => (
                  <button
                    key={news.id || news._id}
                    onClick={() => setSelectedNews(news)}
                    className="w-full rounded-[2rem] border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FFF1EC] text-2xl text-[#FF8E6E]">
                        <Sparkles />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#4A453A] line-clamp-2">{news.title}</p>
                        <p className="text-xs text-[#7E7869] mt-1 line-clamp-2">{news.shortContent || news.description}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[2rem] border border-dashed border-[#FF8E6E]/30 bg-orange-50 p-4 text-center text-sm text-[#7E7869]">
                  ยังไม่มีข่าวสารแสดงผลในขณะนี้
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 🌟 HERO SECTION ─── */}
      <section className="hidden sm:flex relative w-full items-center justify-center overflow-hidden bg-[#FDF8F1] min-h-[55vh] sm:min-h-[60vh]">
        
        {/* Parallax Background */}
        <div className="absolute inset-0 z-0 scale-110 transition-transform duration-1000 ease-out" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}>
          <img src={heroBg} className="h-full w-full object-cover object-center" alt="Parallax Background" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDF8F1] via-[#FDF8F1]/60 to-transparent z-20" />

        <div className="container relative z-30 px-4 sm:px-5 text-center mx-auto flex flex-col items-center justify-center pt-4 sm:pt-8 pb-3 sm:pb-4">
          <h1 className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 font-black leading-tight drop-shadow-sm text-4xl sm:text-6xl lg:text-7xl text-[#4A4A4A] mb-3 sm:mb-4">
            ไปไหนดี... <br className="hidden xs:block" />
            <span className="text-[#FF8E6E] inline-block hover:scale-105 transition-transform cursor-default drop-shadow-md mt-1 sm:mt-0">ให้อารมณ์บอก</span>
          </h1>
        </div>
      </section>

      {/* ─── CONTENT SECTION ─── */}
      <main className="hidden sm:block container mx-auto px-4 sm:px-5 relative z-40 pb-24 -mt-16 sm:-mt-20">
        <section className="bg-white/90 backdrop-blur-2xl p-5 sm:p-14 shadow-[0_32px_64px_-16px_rgba(74,69,58,0.1)] text-center border border-white rounded-[2rem] sm:rounded-[4rem] w-full min-h-0 sm:min-h-[400px]">
          
          {!activeMood ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-4 tracking-tight text-[#4A4A4A]">วันนี้รู้สึกยังไง? </h2>
              
              {/* 🌟 Search Bar inside Card */}
              <div className="mx-auto mt-6 sm:mt-12 max-w-xl animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700 w-full px-4 sm:px-0">
                <form onSubmit={handleSearchSubmit} className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8E6E] to-[#FFA07A] rounded-full blur opacity-15 group-focus-within:opacity-100 transition duration-1000" />
                  <div className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-xl overflow-hidden border border-white/50">
                    <button type="submit" className="ml-4 flex items-center outline-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF8E6E] transition-all" />
                    </button>
                    <input
                      type="text"
                      placeholder="พิมพ์บอกความรู้สึกกับ AI..."
                      className="w-full py-3.5 sm:py-5 pl-3 pr-4 text-base sm:text-lg font-bold outline-none bg-transparent placeholder:text-gray-400 text-[#4A453A]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button type="submit" className="mr-2 px-4 py-2 bg-[#FF8E6E] text-white text-sm font-bold rounded-full shrink-0 active:scale-95 transition-transform">ค้นหา</button>
                    )}
                  </div>
                </form>
              </div>

              <p className="text-1xl sm:text-2xl font-black mt-10 sm:mt-12 mb-6 sm:mb-8 text-[#FF8E6E] tracking-wider leading-relaxed">— หรือ —</p>
              <p className="text-sm sm:text-lg font-medium mb-6 sm:mb-8 text-[#8E8E8E]">เลือกหมวดหมู่อารมณ์เพื่อค้นหาสถานที่ด่วน</p>

              {isSearchingPlaces && (
                <div className="mt-8 sm:mt-10 flex justify-center">
                  <div className="w-10 h-10 border-4 border-[#FF8E6E] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              
              
              <div className="mt-6 sm:mt-8">
                <MoodSelector onSelectMood={handleMoodSelect} onSearchText={performAiSearch} />
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h2 className="text-xl sm:text-4xl font-black mb-2 sm:mb-4 tracking-tight text-[#4A453A]">สถานที่แบบไหนดี? 🎯</h2>
              <p className="text-sm sm:text-lg font-medium mb-6 sm:mb-10 text-[#8E8E8E]">เลือกประเภทที่คุณอยากไปตอนนี้</p>
              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-6 mb-8 sm:mb-12">
                {moodCategories[activeMood].map((cat) => (
                  <button key={cat.id} onClick={() => handleCategorySelect(cat.query)} className="group w-full sm:w-auto px-5 py-4 sm:px-8 sm:py-5 bg-[#FDF8F1] border-2 border-transparent hover:border-[#FF8E6E] active:border-[#FF8E6E] rounded-2xl sm:rounded-3xl transition-all duration-300 shadow-sm hover:shadow-xl active:scale-[0.98] text-left sm:text-center">
                    <span className="font-bold text-[#4A453A] group-hover:text-[#FF8E6E] text-base sm:text-lg transition-colors">{cat.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveMood(null)} className="inline-flex items-center gap-2 text-[#7E7869] hover:text-[#FF8E6E] font-bold transition-colors border-b-2 border-transparent hover:border-[#FF8E6E] pb-1 text-sm sm:text-base"><ArrowLeft size={16} /> ย้อนกลับไปเลือกอารมณ์</button>
            </div>
          )}
        </section>

        {/* ─── หัวข้อ: มีอะไรใหม่ ─── */}
        <AnimatePresence>
          {!activeMood && announcements.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-16 sm:mt-24 mx-auto max-w-5xl">
              <div className="flex items-center gap-3 mb-8 px-2 justify-center sm:justify-start">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100">
                  <Sparkles className="text-[#FF8E6E]" size={24} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-[#4A453A] tracking-tight">มีอะไร<span className="text-[#FF8E6E]">ใหม่</span></h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {announcements.map((news) => (
                  <motion.div whileHover={{ y: -8 }} key={news.id || news._id} onClick={() => setSelectedNews(news)} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_16px_40px_-10px_rgba(74,69,58,0.08)] border border-white flex flex-col group cursor-pointer">
                    <div className="h-48 bg-[#FDF8F1] relative overflow-hidden">
                      {news.coverImage ? <img src={news.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Cover" /> : <div className="w-full h-full flex items-center justify-center"><Newspaper size={40} className="text-gray-200" /></div>}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-bold text-[#FF8E6E] shadow-sm">
                        <Calendar size={12} /> {new Date(news.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="font-black text-xl text-[#2D2A26] mb-2 leading-tight group-hover:text-[#FF8E6E] transition-colors line-clamp-2">{news.title}</h3>
                      <p className="text-[13px] font-medium text-[#7E7869] leading-relaxed line-clamp-2 mb-4">{news.shortContent || news.description}</p>
                      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-[#FF8E6E] font-bold text-sm">
                        <span>อ่านเพิ่มเติม</span>
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-[#FF8E6E] group-hover:text-white transition-colors"><ChevronRight size={16} /></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}