"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MapPin, ArrowLeft, Loader2, 
  CheckCircle2, Car, Flag, ArrowDown, Filter, ChevronDown, Heart, Search, ChevronLeft, ChevronRight, Navigation,
  Calendar, Plus, X, Map, History, Compass, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/api/axios";
import Swal from "sweetalert2";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1)); 
};

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '2rem' };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80"
];

const regionFocus = [
  { name: "ทั่วประเทศ", coords: { lat: 13.5, lng: 100.9925 }, zoom: 6 },
  { name: "ภาคเหนือ", coords: { lat: 18.5, lng: 99.0 }, zoom: 7 },
  { name: "ภาคอีสาน", coords: { lat: 16.0, lng: 103.5 }, zoom: 7 },
  { name: "ภาคกลาง", coords: { lat: 14.5, lng: 100.5 }, zoom: 8 },
  { name: "ภาคตะวันออก", coords: { lat: 13.2, lng: 101.8 }, zoom: 8 },
  { name: "ภาคใต้", coords: { lat: 8.5, lng: 99.0 }, zoom: 7 },
];

export default function TripPlanner() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const tripStorageKey = `my_saved_trips_${currentUser?._id || currentUser?.id || "guest"}`;
  const [places, setPlaces] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // 🌟 State สำหรับสลับหน้าจอ (History vs Planning)
  const [currentView, setCurrentView] = useState("history"); // "history" | "planning"
  const [pastTrips, setPastTrips] = useState([]);

  // === State สำหรับ Desktop (ต้นฉบับ) ===
  const [selectedDistance, setSelectedDistance] = useState(null);
  const [customDistance, setCustomDistance] = useState("");
  const [customDistanceError, setCustomDistanceError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [map, setMap] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null); 
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const [provinceSearchQuery, setProvinceSearchQuery] = useState("");
  const regionScrollRef = useRef(null); 

  // === State สำหรับ Mobile (ใหม่) ===
  const [tripId, setTripId] = useState(null); 
  const [tripName, setTripName] = useState("");
  const [days, setDays] = useState([{ id: 1, name: 'วันที่ 1' }]);
  const [activeMobileDay, setActiveMobileDay] = useState(1);
  const [mobilePlan, setMobilePlan] = useState({
    1: [
      { id: 'm-1', isDefault: true, label: 'ช่วงเช้า (09:00 - 12:00)', place: null },
      { id: 'a-1', isDefault: true, label: 'ช่วงบ่าย (13:00 - 17:00)', place: null },
      { id: 'e-1', isDefault: true, label: 'ช่วงเย็น (18:00 เป็นต้นไป)', place: null }
    ]
  });
  const [showPlaceSelector, setShowPlaceSelector] = useState(false);
  const [targetSlotId, setTargetSlotId] = useState(null);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: API_KEY });

  // โหลดประวัติทริป และ พิกัดเมื่อเปิดหน้า
  useEffect(() => {
    const savedTrips = localStorage.getItem(tripStorageKey);
    if (savedTrips) {
      setPastTrips(JSON.parse(savedTrips));
    }
    fetchFavoritesAndCalculate();
  }, [tripStorageKey]);

  const fetchFavoritesAndCalculate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("กรุณาเข้าสู่ระบบ", "คุณต้องเข้าสู่ระบบเพื่อดูแผนการเดินทาง", "warning");
        navigate('/login');
        return;
      }

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;
            setUserLoc({ lat: currentLat, lng: currentLng });
            setCalculating(true);
            await processFavoriteDistances(currentLat, currentLng, token);
          },
          (error) => {
            console.warn("GPS Denied", error);
            processFavoriteDistances(null, null, token);
          }
        );
      } else {
        processFavoriteDistances(null, null, token);
      }
    } catch (err) {
      console.error("Error initiating Trip Planner:", err);
      setLoading(false);
    }
  };

  const processFavoriteDistances = async (currentLat, currentLng, token) => {
    try {
      const favRes = await api.get("/favorites", { headers: { Authorization: `Bearer ${token}` } });
      const favorites = favRes.data.favorites || favRes.data || [];

      if (favorites.length === 0) {
        setPlaces([]);
        setLoading(false);
        return;
      }

      const placesWithDistance = await Promise.all(
        favorites.map(async (fav, idx) => {
          try {
            const detailRes = await api.get(`/maps/details/${fav.placeId}`);
            const location = detailRes.data.geometry?.location;
            const photoUrl = MOCK_IMAGES[idx % 3]; 
            
            if (location) {
              const dist = (currentLat && currentLng) ? calculateDistance(currentLat, currentLng, location.lat, location.lng) : 9999;
              return { 
                ...fav, 
                distance: dist,
                lat: location.lat,
                lng: location.lng,
                address: detailRes.data.vicinity || detailRes.data.formatted_address || "ไม่ระบุที่อยู่",
                photo: photoUrl
              };
            }
            return { ...fav, distance: 9999, address: "ไม่สามารถคำนวณพิกัดได้", photo: photoUrl }; 
          } catch (e) {
            return { ...fav, distance: 9999, address: "เชื่อมต่อข้อมูลไม่ได้", photo: MOCK_IMAGES[0] };
          }
        })
      );

      const sortedPlaces = placesWithDistance.sort((a, b) => a.distance - b.distance);
      setPlaces(sortedPlaces);
    } catch (error) {
      console.error("Calculate distance failed", error);
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  // === ฟังก์ชันจัดการ View และ ฟอร์ม ===
  const resetForm = () => {
    setTripId(null);
    setTripName("");
    setDays([{ id: 1, name: 'วันที่ 1' }]);
    setActiveMobileDay(1);
    setMobilePlan({
      1: [
        { id: 'm-1', isDefault: true, label: 'กิจกรรมที่ 1', place: null },
        { id: 'a-1', isDefault: true, label: 'กิจกรรมที่ 2-', place: null },
        { id: 'e-1', isDefault: true, label: 'กิจกรรมที่ 3', place: null }
      ]
    });
  };

  const createNewTrip = () => {
    resetForm();
    setCurrentView('planning');
  };

  const openPastTrip = (trip) => {
    setTripId(trip.id);
    setTripName(trip.name);
    setDays(trip.days);
    setMobilePlan(trip.plan);
    setActiveMobileDay(trip.days[0].id);
    setCurrentView('planning');
  };

  const saveTrip = () => {
    if (!tripName) return Swal.fire("ข้อมูลไม่ครบ", "กรุณาตั้งชื่อทริปของคุณ", "warning");

    const newTripData = {
      id: tripId || Date.now(),
      name: tripName,
      date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      plan: mobilePlan,
      days: days
    };

    let updatedTrips;
    if (tripId) {
      updatedTrips = pastTrips.map(t => t.id === tripId ? newTripData : t);
    } else {
      updatedTrips = [newTripData, ...pastTrips];
    }

    setPastTrips(updatedTrips);
    localStorage.setItem(tripStorageKey, JSON.stringify(updatedTrips));
    
    Swal.fire("สำเร็จ!", "บันทึกแพลนเดินทางเรียบร้อยแล้ว", "success").then(() => {
      setCurrentView('history');
    });
  };

  // 🌟 ฟังก์ชันลบทริปเก่า
  const handleDeleteTrip = (tripIdToDelete, e) => {
    e.stopPropagation(); // ป้องกันไม่ให้ทะลุไปเปิดการ์ด
    Swal.fire({
      title: 'ลบทริปนี้?',
      text: "คุณต้องการลบทริปนี้ใช่หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF7F67',
      cancelButtonColor: '#6E7881',
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-3xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedTrips = pastTrips.filter(t => t.id !== tripIdToDelete);
        setPastTrips(updatedTrips);
        localStorage.setItem(tripStorageKey, JSON.stringify(updatedTrips));
        Swal.fire({
          title: 'ลบสำเร็จ!',
          text: 'ทริปของคุณถูกลบเรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonColor: '#FF7F67',
          customClass: { popup: 'rounded-3xl' }
        });
      }
    });
  };

  // === ฟังก์ชันสำหรับ Desktop (แผนที่ระยะทาง) ===
  const distanceOptions = [
    { label: "รายการโปรดทั้งหมด", value: null },
    { label: "ใกล้ฉันมาก (น้อยกว่า 5 กิโลเมตร)", value: 5 },
    { label: "รัศมีปานกลาง (น้อยกว่า 15 กิโลเมตร)", value: 15 },
    { label: "รัศมีกว้าง (น้อยกว่า 30 กิโลเมตร)", value: 30 },
  ];
  const filteredPlaces = selectedDistance ? places.filter(p => p.distance !== 9999 && p.distance <= selectedDistance) : places;
  const currentDistanceLabel = distanceOptions.find(opt => opt.value === selectedDistance)?.label || (selectedDistance ? `ระยะที่กำหนดเอง (น้อยกว่า ${selectedDistance} กิโลเมตร)` : "รายการโปรดทั้งหมด");

  const applyCustomDistance = () => {
    const value = parseFloat(customDistance);
    if (Number.isNaN(value) || value <= 0) return setCustomDistanceError("กรุณาใส่ตัวเลขมากกว่า 0");
    setSelectedDistance(value);
    setCustomDistanceError("");
    setIsDropdownOpen(false);
  };

  const onLoadMap = useCallback((mapInstance) => {
    setMap(mapInstance);
    if (userLoc && filteredPlaces.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(userLoc.lat, userLoc.lng));
      filteredPlaces.forEach(place => {
        if (place.lat && place.lng) bounds.extend(new window.google.maps.LatLng(place.lat, place.lng));
      });
      mapInstance.fitBounds(bounds);
    }
  }, [userLoc, filteredPlaces]);

  const handleMapFocus = (coords, zoomLevel) => { if (map) { map.panTo(coords); map.setZoom(zoomLevel); } };
  const scrollRegions = (direction) => { if (regionScrollRef.current) regionScrollRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' }); };
  const scrollToCard = (placeId) => {
    const cardElement = document.getElementById(`timeline-card-${placeId}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveCardId(placeId);
      setTimeout(() => setActiveCardId(null), 2000); 
    }
  };

  // === ฟังก์ชันสำหรับ Mobile (ไทม์ไลน์) ===
  const addDay = () => {
    const nextId = Math.max(...days.map(d => d.id), 0) + 1;
    setDays([...days, { id: nextId, name: `วันที่ ${nextId}` }]);
    setMobilePlan({
      ...mobilePlan,
      [nextId]: [
        { id: `m-${nextId}`, isDefault: true, label: 'กิจกรรมที่ 1', place: null },
        { id: `a-${nextId}`, isDefault: true, label: 'กิจกรรมที่ 2', place: null },
        { id: `e-${nextId}`, isDefault: true, label: 'กิจกรรมที่ 3', place: null }
      ]
    });
    setActiveMobileDay(nextId);
  };

  const removeDay = (dayId) => {
    if (days.length === 1) return Swal.fire("ลบไม่ได้", "ต้องมีอย่างน้อย 1 วัน", "warning");
    const newDays = days.filter(d => d.id !== dayId);
    setDays(newDays);
    const newPlan = { ...mobilePlan };
    delete newPlan[dayId];
    setMobilePlan(newPlan);
    if (activeMobileDay === dayId) setActiveMobileDay(newDays[0].id);
  };

  const openPlaceSelector = (slotId) => { setTargetSlotId(slotId); setShowPlaceSelector(true); };
  const handleSelectPlaceForSlot = (place) => {
    const newSlots = mobilePlan[activeMobileDay].map(slot => slot.id === targetSlotId ? { ...slot, place: place } : slot);
    setMobilePlan({ ...mobilePlan, [activeMobileDay]: newSlots });
    setShowPlaceSelector(false);
    setTargetSlotId(null);
  };
  const handleRemovePlace = (slotId, isDefault) => {
    if (isDefault) {
      const newSlots = mobilePlan[activeMobileDay].map(slot => slot.id === slotId ? { ...slot, place: null } : slot);
      setMobilePlan({ ...mobilePlan, [activeMobileDay]: newSlots });
    } else {
      const newSlots = mobilePlan[activeMobileDay].filter(slot => slot.id !== slotId);
      setMobilePlan({ ...mobilePlan, [activeMobileDay]: newSlots });
    }
  };
  const addExtraSlot = (index) => {
    const currentSlots = mobilePlan[activeMobileDay];
    if (currentSlots.length >= 10) return Swal.fire("เต็มแล้ว", "คุณสามารถเพิ่มได้สูงสุด 10 สถานที่ต่อวันเท่านั้น", "warning");
    const newSlot = { id: `ex-${Date.now()}`, isDefault: false, label: 'กิจกรรมเพิ่มเติม', place: null };
    const newSlots = [...currentSlots];
    newSlots.splice(index + 1, 0, newSlot);
    setMobilePlan({ ...mobilePlan, [activeMobileDay]: newSlots });
  };

  const openMobileRouteInGoogleMaps = () => {
    const currentDayPlaces = mobilePlan[activeMobileDay].map(slot => slot.place).filter(place => place && place.lat && place.lng); 
    if (currentDayPlaces.length === 0) return Swal.fire("ไม่มีสถานที่", "กรุณาเพิ่มสถานที่อย่างน้อย 1 แห่ง", "info");
    let origin, destination, waypointsStr = '';
    if (userLoc) {
      origin = `${userLoc.lat},${userLoc.lng}`;
      destination = `${currentDayPlaces[currentDayPlaces.length - 1].lat},${currentDayPlaces[currentDayPlaces.length - 1].lng}`;
      waypointsStr = currentDayPlaces.length > 1 ? currentDayPlaces.slice(0, -1).map(p => `${p.lat},${p.lng}`).join('|') : `${currentDayPlaces[0].lat},${currentDayPlaces[0].lng}`;
    } else {
      origin = `${currentDayPlaces[0].lat},${currentDayPlaces[0].lng}`;
      destination = currentDayPlaces.length === 1 ? origin : `${currentDayPlaces[currentDayPlaces.length - 1].lat},${currentDayPlaces[currentDayPlaces.length - 1].lng}`;
      if (currentDayPlaces.length > 2) waypointsStr = currentDayPlaces.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    }
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}`, '_blank');
  };

  if (currentView === "history") {
    return (
      <div className="min-h-screen bg-[#FDF8F1] font-['Prompt'] pt-24 pb-32 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate(-1)} className="inline-flex items-center justify-center w-10 h-10 md:w-auto md:px-5 md:py-2.5 bg-white text-[#4A453A] hover:text-[#FF8E6E] rounded-full shadow-sm transition-colors font-bold">
              <ArrowLeft size={18} className="md:mr-2" /> <span className="hidden md:inline">ย้อนกลับ</span>
            </button>
            <h1 className="text-2xl md:text-4xl font-black text-[#4A453A]">
              ประวัติ<span className="text-[#FF8E6E]">ทริปของฉัน</span> 🎒
            </h1>
          </div>

          {/* ถ้าไม่มีประวัติ */}
          {pastTrips.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/60 border border-dashed border-[#EFE9D9] rounded-[2.5rem] p-10 text-center shadow-sm">
              <div className="w-24 h-24 bg-[#FFF5F3] text-[#FF7F67] rounded-full flex items-center justify-center mx-auto mb-6">
                <Compass size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-[#4A453A] mb-2">ยังไม่มีทริปการเดินทาง</h2>
              <p className="text-[#7E7869] mb-8">เริ่มต้นค้นหาสถานที่ที่คุณชอบ แล้วมาจัดเรียงทริปแรกกันเถอะ!</p>
              
              <button onClick={createNewTrip} className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF7F67] text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,127,103,0.3)] hover:bg-[#ff6b50] active:scale-95 transition-all">
                <Plus size={20} /> สร้างแพลนใหม่เลย
              </button>
            </motion.div>
          ) : (
            /* ถ้ามีประวัติ */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pastTrips.map((trip, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={trip.id} 
                    onClick={() => openPastTrip(trip)}
                    className="bg-white p-5 rounded-3xl cursor-pointer hover:shadow-lg border border-gray-50 transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 bg-orange-50 text-[#FF7F67] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Map size={18} />
                      </div>
                      
                      {/* ส่วนวันที่ และ ปุ่มลบทริป */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{trip.date}</span>
                        <button
                          onClick={(e) => handleDeleteTrip(trip.id, e)}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                    <h3 className="text-lg font-black text-[#4A453A] line-clamp-1 pr-8">{trip.name}</h3>
                    <p className="text-sm text-[#7E7869] mt-1 flex items-center gap-1">
                      <Calendar size={14}/> แผนเดินทาง {trip.days.length} วัน
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* ปุ่มสร้างใหม่ใต้รายการ */}
              <button 
                onClick={createNewTrip}
                className="w-full mt-6 h-16 bg-[#4A453A] text-white font-bold text-lg rounded-[20px] flex items-center justify-center gap-2 hover:bg-[#FF7F67] shadow-md transition-colors active:scale-95"
              >
                <Plus size={22} /> เริ่มสร้างทริปใหม่
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F1] font-['Prompt']">
      
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block pt-28 pb-32 px-4">
        <main className="container mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between text-center md:text-left gap-6">
            <div>
              {/* กลับไปหน้า History */}
              <button onClick={() => setCurrentView('history')} className="inline-flex items-center gap-2 text-[#7E7869] hover:text-[#FF8E6E] font-bold mb-6 transition-all bg-white px-5 py-2.5 rounded-full shadow-sm">
                <ArrowLeft size={18} /> กลับไปหน้าประวัติ
              </button>
              <h1 className="text-4xl md:text-6xl font-black text-[#4A453A]">แผนการ<span className="text-[#FF8E6E]">เดินทาง 🗺️</span></h1>
              <p className="text-[#7E7869] mt-4 font-medium text-lg">จัดเรียง <span className="text-[#FF8E6E]">"รายการโปรด"</span> ตามระยะทางจริงจากจุดที่คุณอยู่</p>
            </div>
          </div>

          

          

          {!loading && !calculating && (
            <section className="mb-10 rounded-[2.5rem] border border-[#EFE9D9] bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#4A453A]">วางแผนการเดินทาง</h2>
                  <p className="mt-1 text-sm font-medium text-[#AFA99B]">เลือกสถานที่ลงในแต่ละช่วงเวลาได้อย่างอิสระ</p>
                </div>
                <div className="flex items-center gap-2">
                  {days.map((day) => (
                    <div key={day.id} className="relative group">
    <button 
      type="button" 
      onClick={() => setActiveMobileDay(day.id)} 
      className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${activeMobileDay === day.id ? 'border-[#FF7F67] bg-[#FFF0EB] text-[#FF7F67]' : 'border-transparent bg-[#FDF8F1] text-gray-400 hover:text-[#FF7F67]'}`}
    >
      {day.name}
    </button>
    

    {days.length > 1 && (
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          removeDay(day.id); 
        }} 
        className="absolute -top-1 -right-1 hidden group-hover:flex w-5 h-5 bg-red-400 text-white rounded-full items-center justify-center shadow-sm"
      >
        <X size={12} strokeWidth={3} />
      </button>
    )}
  </div>
                  ))}
                  <button type="button" onClick={addDay} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-[#FDF8F1] text-gray-400 hover:text-[#FF7F67]" aria-label="เพิ่มวัน">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {mobilePlan[activeMobileDay]?.map((slot) => (
                  <div key={slot.id} className="rounded-3xl border border-[#F4E5DE] bg-[#FFFaf9] p-4">
                    <h3 className="mb-3 text-sm font-black text-[#7E7869]">{slot.label}</h3>
                    {slot.place ? (
                      <div className="relative rounded-2xl bg-white p-3 shadow-sm">
                        <img src={slot.place.photo} alt={slot.place.placeName} className="mb-3 h-32 w-full rounded-xl object-cover" />
                        <p className="truncate pr-8 text-sm font-black text-[#4A453A]">{slot.place.placeName}</p>
                        <button type="button" onClick={() => handleRemovePlace(slot.id, slot.isDefault)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7F67] text-white shadow-sm" aria-label="ลบสถานที่">
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => openPlaceSelector(slot.id)} className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#FFD8CF] bg-white text-sm font-bold text-[#FF7F67] transition-colors hover:bg-[#FFF0EB]">
                        <Calendar size={24} />
                        เพิ่มกิจกรรม
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-[#F4E5DE] pt-6">
                <label className="mb-2 block text-sm font-bold text-[#7E7869]" htmlFor="desktop-trip-name">
                  ชื่อทริปของคุณ
                </label>
                <input
                  id="desktop-trip-name"
                  type="text"
                  placeholder="เช่น ทริปฮีลใจวันหยุด"
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 px-5 py-3.5 font-bold text-[#4A453A] outline-none transition-all placeholder:text-gray-300 focus:border-[#FF7F67]"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openMobileRouteInGoogleMaps}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#FF7F67] px-5 py-3.5 font-bold text-[#FF7F67] transition-colors hover:bg-orange-50"
                  >
                    <Map size={18} /> เปิดแผนที่นำทาง
                  </button>
                  <button
                    type="button"
                    onClick={saveTrip}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF7F67] px-6 py-3.5 font-bold text-white shadow-md transition-colors hover:bg-[#ff6b50]"
                  >
                    <CheckCircle2 size={18} /> บันทึกแพลนเดินทาง
                  </button>
                </div>
              </div>
            </section>
          )}

          
  
        </main>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="md:hidden pb-12">
        <div className="bg-white rounded-b-[40px] pt-12 pb-8 px-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative z-10 mx-auto flex flex-col">
          <div className="flex items-center justify-between mb-8 w-full">
            <button onClick={() => setCurrentView('history')} className="w-10 h-10 flex items-center justify-center bg-[#FDF8F1] rounded-full hover:bg-orange-50 transition-colors shrink-0">
              <ChevronLeft size={20} className="text-[#4A453A]" />
            </button>
            <h1 className="text-xl font-black text-[#4A453A]">
              {tripId ? "แก้ไขแผนการเดินทาง" : "วางแผนการเดินทาง"}
            </h1>
            <div className="w-10 h-10"></div> 
          </div>
          
          <div className="relative mt-2">
            <label className="absolute -top-2.5 left-4 bg-white px-1.5 text-xs font-bold text-gray-400 z-10">ชื่อทริปของคุณ</label>
            <input 
              type="text" 
              placeholder="เช่น ทริปฮีลใจวันหยุด"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-2xl px-5 py-4 text-[#4A453A] font-bold placeholder:text-gray-300 focus:border-[#FF7F67] outline-none transition-all"
            />
          </div>
        </div>

        <main className="px-6 mt-8">
          {/* Day Tabs */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto hide-scrollbar pb-2 pt-2">
            <AnimatePresence>
              {days.map((day) => (
                <motion.div key={day.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative shrink-0">
                  <button 
                    onClick={() => setActiveMobileDay(day.id)}
                    className={`px-5 py-2 rounded-full text-sm font-bold border transition-all whitespace-nowrap ${
                      activeMobileDay === day.id 
                      ? 'border-[#FF7F67] text-[#FF7F67] bg-white shadow-sm' 
                      : 'border-transparent text-gray-400 hover:bg-white'
                    }`}
                  >
                    {day.name}
                  </button>
                  {days.length > 1 && (
                    <button onClick={() => removeDay(day.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center shadow-sm z-10">
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addDay} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-400 border border-gray-100 hover:text-[#FF7F67] shrink-0">
              <Plus size={16} />
            </button>
          </div>

          {/* Timeline Nodes */}
          <div className="relative pl-3">
            <div className="absolute left-[35px] top-4 bottom-8 w-0.5 bg-gray-200/60 z-0"></div>

            <div className="flex flex-col">
              {mobilePlan[activeMobileDay]?.map((slot, index) => {
                const isFilled = !!slot.place;

                return (
                  <React.Fragment key={slot.id}>
                    <div className="relative z-10 flex items-start mb-2">
                      <div className="w-12 h-12 flex items-center justify-center bg-[#FDF8F1] shrink-0">
                        <div className="w-4 h-4 rounded-full border-4 border-[#FF7F67] bg-white"></div>
                      </div>

                      <div className="flex-1 pl-4 pt-1 pb-4">
                        <h4 className="text-xs font-bold text-gray-400 mb-2">{slot.label}</h4>
                        
                        {isFilled ? (
                          <div className="bg-white p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50 relative">
                            <img src={slot.place.photo} alt={slot.place.placeName} className="w-14 h-14 rounded-xl object-cover" />
                            <div className="flex-1 min-w-0 pr-8">
                              <h5 className="font-bold text-[#4A453A] text-sm truncate">{slot.place.placeName}</h5>
                            </div>
                            <button 
                              onClick={() => handleRemovePlace(slot.id, slot.isDefault)} 
                              className="absolute right-3 w-6 h-6 bg-[#FF7F67] rounded-full flex items-center justify-center shadow-sm"
                            >
                              <X size={14} className="text-white" strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => openPlaceSelector(slot.id)}
                            className="border-2 border-dashed border-red-100 bg-[#FFFaf9] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 transition-colors"
                          >
                            <Calendar size={18} className="text-[#FF7F67]/50" />
                            <span className="text-xs font-bold text-[#FF7F67]/70">เพิ่มกิจกรรม{slot.isDefault ? slot.label.split(' ')[0] : 'เพิ่มเติม'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {index < mobilePlan[activeMobileDay].length - 1 && mobilePlan[activeMobileDay].length < 10 && (
                      <div className="relative z-20 flex justify-start my-1 ml-[25px]">
                        <button
                          onClick={() => addExtraSlot(index)}
                          className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-[#FF7F67] hover:bg-orange-50"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="mt-10 mb-8 flex flex-col gap-3 justify-center">
            <button 
              onClick={openMobileRouteInGoogleMaps}
              className="w-full h-14 bg-white border-2 border-[#FF7F67] text-[#FF7F67] hover:bg-orange-50 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
            >
              <Map size={20} /> เปิดแผนที่นำทางทริปนี้
            </button>

            <button 
              onClick={saveTrip}
              className="w-full h-14 bg-[#FF7F67] hover:bg-[#ff6b50] text-white rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,127,103,0.3)] transition-transform active:scale-95"
            >
              บันทึกแพลนเดินทาง
            </button>
          </div>
        </main>
      </div>

      {/* MODAL เลือกสถานที่ (Mobile Only) */}
      <AnimatePresence>
        {showPlaceSelector && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-6">
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full md:max-w-2xl bg-white rounded-t-[32px] md:rounded-[32px] h-[75vh] md:h-[70vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-lg font-black text-[#4A453A]">เลือกจากรายการโปรด</h3>
                <button onClick={() => setShowPlaceSelector(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 pb-10 space-y-4">
                {places.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10 text-sm">ไม่มีสถานที่ในรายการโปรด</div>
                ) : (
                  places.map(place => (
                    <div key={place.id} className="flex gap-4 p-3 border border-gray-100 rounded-2xl items-center hover:bg-orange-50">
                      <img src={place.photo} alt={place.placeName} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#4A453A] truncate">{place.placeName}</h4>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5"><MapPin size={10} className="inline mr-1"/>{place.address}</p>
                      </div>
                      <button 
                        onClick={() => handleSelectPlaceForSlot(place)}
                        className="px-4 py-2 bg-[#FF7F67] text-white text-xs font-bold rounded-xl shrink-0"
                      >
                        เลือก
                      </button>
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