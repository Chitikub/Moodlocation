import { useEffect } from "react";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import Cookies from "js-cookie";
import Routers from "./Routers/Router";

function App() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      const user = JSON.parse(userStr);
      
      // ดึง URL มาจากไฟล์ .env (ซึ่งมักจะมี /api/v1 ติดมาด้วย)
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      
      // 🌟 แก้ไขตรงนี้: สร้าง socketUrl โดยการลบคำว่า /api/v1 ออกจากท้าย URL (ถ้ามี)
      let socketUrl = "https://moodlocationfinder-backend.onrender.com";
      if (envUrl && envUrl !== "undefined") {
        // ใช้ Regex ตัด /api/v1 ออกจากท้าย string เพื่อให้เหลือแค่ Base URL
        socketUrl = envUrl.replace(/\/api\/v1\/?$/, ""); 
      }

      
      const socket = io(socketUrl);


      // 🌟 เช็คว่ามี Error ตอนเชื่อมต่อไหม
      socket.on("connect_error", (err) => {
        console.error("❌ Socket เชื่อมต่อไม่สำเร็จ:", err.message);
      });

      // 🚨 รอรับคำสั่งเตะออก (ระบบกันล็อกอินซ้อน)
      socket.on("force_logout", async (data) => {
        console.log("🔥 ได้รับคำสั่ง force_logout จาก Backend!"); 
        
        await Swal.fire({
          icon: "warning",
          title: "มีการเข้าสู่ระบบซ้อน!",
          text: data?.message || "มีคนเข้าสู่ระบบบัญชีของคุณจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบเพื่อความปลอดภัย",
          confirmButtonColor: "#FF7F67",
          confirmButtonText: "ตกลง",
          allowOutsideClick: false, 
        });

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        Cookies.remove("token");

        window.location.href = "/login";
      });

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  return (
    <div className="App">
       <Routers /> 
    </div>
  );
}

export default App; 