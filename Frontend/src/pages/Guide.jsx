'use client';
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  UserPlus, 
  Search, 
  MapPin, 
  Heart, 
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Map,
  Compass
} from "lucide-react";

export default function GuidePage() {
  const navigate = useNavigate();

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F1] text-[#4A453A] font-['Prompt',sans-serif] selection:bg-orange-100 overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-orange-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-yellow-200/30 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDF8F1]/80 backdrop-blur-md border-b border-[#EFE9D9]/50">
        <div className="container mx-auto px-6 h-20 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#7E7869] hover:text-[#FF8E6E] font-bold transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-[#EFE9D9] shadow-sm flex items-center justify-center group-hover:border-[#FF8E6E]">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="hidden sm:inline">ย้อนกลับ</span>
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-32 pb-24 relative z-10">
        
        {/* --- Hero Section --- */}
        <section className="max-w-4xl mx-auto text-center mb-24">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-[#FF8E6E] rounded-full font-bold text-sm mb-4">
              <Sparkles size={16} /> คู่มือการใช้งาน
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight tracking-tight text-[#2D2A26]">
              ให้ความรู้สึก <br className="hidden sm:block" />
              <span className="text-[#FF8E6E]">นำทางคุณไปเจอที่ที่ใช่</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-[#7E7869] font-medium leading-relaxed max-w-2xl mx-auto px-4">
              VibeMap (MoodLocation Finder) คือแพลตฟอร์มที่จะช่วยหาสถานที่ที่เหมาะกับอารมณ์ของคุณในแต่ละวัน เพียง 4 ขั้นตอนง่ายๆ
            </motion.p>
          </motion.div>
        </section>

        {/* --- Step 1: Login & Setup --- */}
        <motion.section 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
          className="max-w-6xl mx-auto mb-32"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 space-y-6 order-2 lg:order-1">
              <div className="w-16 h-16 bg-[#4A453A] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#4A453A]/20">
                <UserPlus size={32} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#2D2A26]">1. เริ่มต้นด้วยการเข้าสู่ระบบ</h2>
              <p className="text-[#7E7869] text-lg font-medium leading-relaxed">
  เพื่อประสบการณ์ที่ดีที่สุด แนะนำให้คุณ{' '}
  <button 
    onClick={() => navigate('/login')} 
    className="text-[#FF8E6E] font-bold hover:underline transition-all cursor-pointer"
  >
    เข้าสู่ระบบ
  </button>{' '}
  หรือสมัครสมาชิกก่อนใช้งาน เพื่อให้ระบบสามารถจดจำประวัติการเดินทาง และให้คุณสามารถกด "ถูกใจ" สถานที่ที่ชอบเก็บไว้ดูทีหลังได้
</p>
              <ul className="space-y-3 mt-6 text-[#7E7869] font-medium">
                <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#FF8E6E]" /> ข้อมูลของคุณจะถูกเก็บเป็นความลับ</li>
                <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#FF8E6E]" /> บันทึกประวัติการค้นหาสถานที่</li>
                <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#FF8E6E]" /> จัดการรายการโปรดส่วนตัวได้ไม่จำกัด</li>
              </ul>
            </div>
            
            {/* Mockup UI */}
            <div className="flex-1 w-full max-w-md order-1 lg:order-2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#FF8E6E]/20 to-transparent rounded-[3rem] transform rotate-3" />
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-[#EFE9D9] relative z-10">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 border-4 border-white shadow-sm" />
                  <div className="h-6 w-32 bg-gray-200 rounded-full mx-auto mb-2" />
                  <div className="h-4 w-48 bg-gray-100 rounded-full mx-auto" />
                </div>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-50 rounded-xl w-full border border-gray-100" />
                  <div className="h-12 bg-gray-50 rounded-xl w-full border border-gray-100" />
                  <div className="h-14 bg-[#4A453A] rounded-xl w-full mt-6 opacity-90" />
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* --- Step 2: Describe Mood --- */}
        <motion.section 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
          className="max-w-6xl mx-auto mb-32"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Mockup UI */}
            <div className="flex-1 w-full max-w-md relative">
              <div className="absolute inset-0 bg-gradient-to-tl from-purple-200/40 to-transparent rounded-[3rem] transform -rotate-3" />
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-[#EFE9D9] relative z-10 flex flex-col gap-6">
                <div className="h-16 bg-gray-50 rounded-2xl w-full flex items-center px-6 gap-4 border border-gray-100">
                  <Search className="text-[#FF8E6E]" />
                  <div className="h-4 w-40 bg-gray-200 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-orange-50 rounded-2xl border-2 border-[#FF8E6E]/30 flex items-center justify-center text-4xl">😄</div>
                  <div className="h-24 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl opacity-50">😢</div>
                  <div className="h-24 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl opacity-50">😡</div>
                  <div className="h-24 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl opacity-50">🥱</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="w-16 h-16 bg-[#FF8E6E] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF8E6E]/30">
                <Search size={32} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#2D2A26]">2. บอกความรู้สึกของคุณ</h2>
              <p className="text-[#7E7869] text-lg font-medium leading-relaxed">
                ในหน้าแรก (Home) คุณสามารถหาสถานที่ได้ 2 วิธี:
                <br/><br/>
                <strong>วิธีที่ 1: พิมพ์ระบายในช่องค้นหา</strong> เช่น "อกหัก", "เหนื่อยจัง", "อยากพักผ่อน" ระบบ AI อัจฉริยะของเราจะวิเคราะห์ความรู้สึกและหาสถานที่บำบัดใจให้คุณทันที
                <br/><br/>
                <strong>วิธีที่ 2: กดเลือกจากไอคอนอารมณ์</strong> หากไม่รู้จะพิมพ์อะไร ก็กดเลือกอิโมจิที่ตรงกับความรู้สึกของคุณมากที่สุดได้เลย
              </p>
            </div>
          </div>
        </motion.section>

        {/* --- Step 3: Explore Places --- */}
        <motion.section 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
          className="max-w-6xl mx-auto mb-32"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 space-y-6 order-2 lg:order-1">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <MapPin size={32} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#2D2A26]">3. เลือกสถานที่และตรวจสอบระยะทาง</h2>
              <p className="text-[#7E7869] text-lg font-medium leading-relaxed">
                ระบบจะดึงสถานที่จาก <strong className="text-blue-500">Google Maps</strong> ที่สอดคล้องกับอารมณ์ของคุณ โดยจะ <strong className="text-[#FF8E6E]">คำนวณระยะทางขับรถจริง และเวลาเดินทาง (นาที)</strong> ให้คุณเสร็จสรรพ พร้อมเรียงลำดับจากสถานที่ที่ใกล้ที่สุดขึ้นมาก่อน
              </p>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mt-6">
                <p className="text-[#FF8E6E] font-bold flex items-start gap-3">
                  <Compass className="shrink-0 mt-1" />
                  อย่าลืมกด "อนุญาต (Allow)" ให้เบราว์เซอร์เข้าถึงตำแหน่ง (GPS) ของคุณ เพื่อให้ระบบคำนวณระยะทางได้อย่างแม่นยำนะครับ
                </p>
              </div>
            </div>

            {/* Mockup UI */}
            <div className="flex-1 w-full max-w-md order-1 lg:order-2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-200/40 to-transparent rounded-[3rem] transform rotate-3" />
              <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-[#EFE9D9] relative z-10 space-y-4">
                <div className="h-32 bg-gray-100 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center"><Heart size={16} className="text-gray-400" /></div>
                </div>
                <div className="h-6 w-3/4 bg-gray-200 rounded-full" />
                <div className="flex justify-between items-center">
                  <div className="h-4 w-1/3 bg-gray-100 rounded-full" />
                  <div className="h-8 w-24 bg-green-50 rounded-xl" />
                </div>
                <div className="h-12 bg-[#4A453A] rounded-xl w-full mt-4" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* --- Step 4: Plan & Navigate --- */}
        <motion.section 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
          className="max-w-6xl mx-auto mb-24"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Mockup UI */}
            <div className="flex-1 w-full max-w-md relative">
              <div className="absolute inset-0 bg-gradient-to-tl from-green-200/40 to-transparent rounded-[3rem] transform -rotate-3" />
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-[#EFE9D9] relative z-10 flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full shrink-0 flex items-center justify-center"><MapPin size={20} className="text-green-600" /></div>
                  <div className="flex-1 h-16 bg-gray-50 rounded-2xl border border-gray-100" />
                </div>
                <div className="w-1 h-8 bg-gray-200 ml-5" />
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white border-4 border-[#FF8E6E] rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-[#FF8E6E]">1</div>
                  <div className="flex-1 h-20 bg-white shadow-sm border border-gray-100 rounded-2xl" />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="w-16 h-16 bg-[#00A78E] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#00A78E]/30">
                <Map size={32} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#2D2A26]">4. จัดการรายการโปรด & วางแผนทริป</h2>
              <p className="text-[#7E7869] text-lg font-medium leading-relaxed">
                เมื่อเจอร้านที่ใช่ กดไอคอน ❤️ เพื่อเก็บเข้า <strong>"รายการโปรด"</strong> (บันทึกได้สูงสุด 10 แห่ง) 
                <br/><br/>
                จากนั้นไปที่เมนู <strong>"วางแผนการเดินทาง"</strong> ระบบจะนำสถานที่โปรดทั้งหมดมาจัดเรียงบน Timeline ตามระยะทางให้คุณเห็นภาพรวมของทริป และกดนำทางผ่าน Google Maps ได้ทันที!
              </p>
            </div>
          </div>
        </motion.section>

        {/* --- Final CTA --- */}
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="relative max-w-4xl mx-auto mt-32"
        >
          <div className="absolute inset-0 bg-orange-400 blur-[80px] opacity-10" />
          <div className="relative bg-gradient-to-r from-[#FF8E6E] to-[#FFA07A] rounded-[3rem] p-10 sm:p-16 text-center shadow-2xl overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 p-8 opacity-20 hidden sm:block">
              <Sparkles className="w-32 h-32 text-white" />
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 relative z-10 leading-tight">
              พร้อมจะออกไปหา <br className="hidden sm:block" />
              <span className="text-[#4A453A]">พื้นที่พักใจ</span> หรือยัง?
            </h2>
            
            <button 
              onClick={() => navigate('/')}
              className="mt-8 group relative inline-flex items-center gap-3 bg-white text-[#4A453A] px-10 py-5 rounded-2xl text-lg font-black shadow-xl hover:bg-[#4A453A] hover:text-white transition-all active:scale-95 z-10"
            >
              กลับไปหน้าแรกเพื่อเริ่มต้นค้นหา
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}