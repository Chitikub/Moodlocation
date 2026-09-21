"use client";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Star, MapPin, Clock, Phone, 
  Navigation, Loader2, Image as ImageIcon, Heart, Car 
} from "lucide-react";
import api from "@/api/axios";
import Swal from "sweetalert2";

export default function GooglePlaceDetail() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false); 
  const [totalfavorite, setTotalfavorite] = useState(0);
  const [distance, setDistance] = useState(null); 
  const [duration, setDuration] = useState(null); 
  
  // 🌟 State สำหรับกรองดาวรีวิว (ค่าเริ่มต้นคือ all)
  const [reviewFilter, setReviewFilter] = useState("all");

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const normalizeFavorites = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.favorites)) return data.favorites;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/maps/details/${placeId}`);
      setPlace(res.data);

      if (navigator.geolocation && res.data.geometry?.location) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const placeLat = res.data.geometry.location.lat;
            const placeLng = res.data.geometry.location.lng;
            
          }
        );
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const favRes = await api.get(`/favorites/check/${placeId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsFavorite(favRes.data.isFavorite);
        } catch (e) { console.log("Check favorite failed"); }
      }
    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalFavorites = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setTotalfavorite(0);
        return;
      }
      const res = await api.get("/favorites", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favorites = normalizeFavorites(res.data);
      setTotalfavorite(favorites.length);
    } catch (error) { console.log("ไม่สามารถโหลดรายการโปรดได้"); }
  };

  useEffect(() => {
    if (placeId) {
      fetchDetails();
      fetchTotalFavorites();
    }
  }, [placeId]);

  const handleToggleFavorite = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return Swal.fire({ icon: 'warning', title: 'กรุณาเข้าสู่ระบบ', confirmButtonColor: '#FF8E6E' });
    }

    const resAll = await api.get("/favorites", { headers: { Authorization: `Bearer ${token}` } });
    const favorites = normalizeFavorites(resAll.data);
    const currentFavoriteCount = favorites.length;
    const isFull = !isFavorite && currentFavoriteCount >= 10;

    if (isFull) {
      setTotalfavorite(currentFavoriteCount);
      return Swal.fire({
        title: 'บันทึกไม่สำเร็จ!',
        text: 'รายการโปรดของคุณเต็มแล้ว (สูงสุด 10 รายการ)',
        icon: 'warning',
        confirmButtonColor: '#FF8E6E'
      });
    }

    const imageUrl = place.photos && place.photos.length > 0 
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`
      : "";

    try {
      const res = await api.post("/favorites/toggle", { 
        placeId: placeId,
        name: place.name,
        image: imageUrl
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setIsFavorite(res.data.isFavorite);
      setTotalfavorite(prev => res.data.isFavorite ? prev + 1 : prev - 1);
      
      Swal.fire({
        icon: 'success',
        title: res.data.isFavorite ? 'บันทึกสำเร็จ' : 'นำออกสำเร็จ',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', text: 'รายการโปรดเต็มแล้ว' });
    }
  };

  const handleNavigation = async () => {
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name)}&destination_place_id=${placeId}`;

    const token = localStorage.getItem("token");
    if (token) {
      const imageUrl = place.photos && place.photos.length > 0 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`
        : "";

      try {
        await api.post("/history", { placeId, name: place.name, image: imageUrl }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) { 
        console.error("Save history failed"); 
      }
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = navUrl; 
    } else {
      window.open(navUrl, '_blank'); 
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FDF8F1] flex items-center justify-center"><Loader2 className="w-16 h-16 text-[#FF8E6E] animate-spin" /></div>;
  if (!place) return <div className="min-h-screen bg-[#FDF8F1] text-center py-20 font-bold">ไม่พบข้อมูล</div>;

  const isOpen = place.opening_hours?.open_now;

  // 🌟 จัดเรียงคอมเมนต์: แสดง 5 ดาวขึ้นก่อนเสมอ (จัดเรียงจากดาวมากไปน้อย)
  const sortedReviews = place.reviews ? [...place.reviews].sort((a, b) => b.rating - a.rating) : [];
  
  // 🌟 กรองข้อมูลตามดาวที่เลือก
  const filteredReviews = reviewFilter === "all" 
    ? sortedReviews 
    : sortedReviews.filter(r => Math.floor(r.rating) === Number(reviewFilter));

  return (
    <div className="min-h-screen bg-[#FDF8F1] font-['Prompt'] pt-8 sm:pt-24 pb-20">
      <main className="container mx-auto px-4 max-w-2xl">
        
        {/* Header: ปุ่มย้อนกลับ */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-600 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* --- Card รายละเอียดหลัก --- */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 relative">
          
          <button 
            onClick={handleToggleFavorite}
            title={!isFavorite && totalfavorite >= 10 ? 'รายการโปรดเต็มแล้ว' : ''}
            className={`absolute top-6 right-6 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
              isFavorite ? 'bg-white text-red-500' : 'bg-white text-gray-300'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {place.photos && place.photos.length > 0 && (
            <div className="h-[200px] w-full rounded-[1.5rem] overflow-hidden mb-6">
              <img 
                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${place.photos[0].photo_reference}&key=${API_KEY}`} 
                className="w-full h-full object-cover" 
                alt={place.name}
              />
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-[#FFF5F3] text-[#FF8E6E] px-3 py-1.5 rounded-full font-black text-sm">
              <Star className="fill-[#FF8E6E]" size={14} /> {place.rating || 'N/A'} คะแนน
            </div>
            <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-bold text-sm">
              {place.types?.[0] ? place.types[0].replace(/_/g, ' ') : 'สถานที่'}
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-[#2D2A26] mb-6 leading-snug">
            {place.name}
          </h1>
          
          <div className="space-y-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFF5F3] flex items-center justify-center shrink-0">
                <MapPin className="text-[#FF8E6E]" size={20} /> 
              </div>
              <div className="pt-1">
                <p className="text-[#7E7869] text-sm font-medium leading-relaxed">
                  {place.formatted_address}
                </p>
                {distance && (
                  <p className="text-[#FF8E6E] text-xs font-bold mt-1 flex items-center gap-1">
                    <Car size={12} /> ห่างจากคุณ {distance} ({duration})
                  </p>
                )}
              </div>
            </div>
            
            {place.formatted_phone_number && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FFF5F3] flex items-center justify-center shrink-0">
                  <Phone className="text-[#FF8E6E]" size={20} /> 
                </div>
                <span className="text-[#7E7869] text-sm font-medium pt-1">
                  {place.formatted_phone_number}
                </span>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                <Clock className={isOpen ? 'text-green-500' : 'text-red-500'} size={20} />
              </div>
              <div className="pt-1">
                <p className={`font-bold text-sm ${isOpen ? 'text-green-600' : 'text-red-500'}`}>
                  {isOpen ? 'เปิดให้บริการ' : 'ปิดแล้ว'}
                </p>
              </div>
            </div>
          </div>

          <button 
  onClick={handleNavigation}
  className="relative z-50 w-full py-4 bg-[#4A453A] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 md:hover:bg-[#322f27] active:bg-[#322f27] transition-all shadow-md active:scale-95"
>
  <Navigation size={18} /> ค้นหาเส้นทาง
</button>
        </div>  

        {/* --- ส่วนรีวิว --- */}
        <div className="mt-10">
          <div className="mb-6 px-2">
            <h2 className="text-xl font-black text-[#4A453A] mb-4">รีวิว</h2>

            {/* 🌟 UI คัดกรองดาว (ดีไซน์แบบปุ่มหน้าค้นหาสถานที่) */}
            {place.reviews && place.reviews.length > 0 && (
              <div className="bg-white p-3 rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setReviewFilter("all")}
                    className={`flex flex-col items-center justify-center gap-1 p-2 w-[16%] rounded-xl transition-all ${
                      reviewFilter === "all" ? 'bg-[#FFF5F3] text-[#FF8E6E] scale-105' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-wider mb-0.5">All</span>
                    <span className="text-[10px] md:text-xs font-bold">ทั้งหมด</span>
                  </button>

                  {[5, 4, 3, 2, 1].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewFilter(String(star))}
                      className={`flex flex-col items-center justify-center gap-1 p-2 w-[16%] rounded-xl transition-all ${
                        reviewFilter === String(star) ? 'bg-[#FFF5F3] text-[#FF8E6E] scale-105' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <Star size={20} className={reviewFilter === String(star) ? "fill-[#FF8E6E] text-[#FF8E6E]" : ""} />
                      <span className="text-[10px] md:text-xs font-bold">{star} ดาว</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={review.profile_photo_url || `https://ui-avatars.com/api/?name=${review.author_name}&background=FF8E6E&color=fff`} 
                        alt="profile" 
                        className="w-10 h-10 rounded-full border border-gray-100" 
                      />
                      <div>
                        <p className="font-bold text-[#2D2A26] text-sm">{review.author_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{review.relative_time_description}</p>
                      </div>
                    </div>
                    <div className="bg-[#FFF5F3] text-[#FF8E6E] px-2 py-1 rounded-lg text-xs font-black">
                      {review.rating.toFixed(1)}
                    </div>
                  </div>
                  <p className="text-[#7E7869] text-sm leading-relaxed mt-2 line-clamp-4">
                    {review.text || "- ไม่มีความคิดเห็น -"}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white/50 rounded-[2rem] border border-dashed border-gray-200">
                 <p className="text-gray-400 font-bold text-sm">ไม่พบรีวิวในระดับดาวที่คุณเลือก</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}