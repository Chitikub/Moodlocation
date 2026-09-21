import axios from 'axios';
import Cookies from 'js-cookie';

// 🌟 1. ดึง Base Domain อัตโนมัติตามสภาพแวดล้อม (Localhost หรือ Render)
const getBaseDomain = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    let base = (envUrl && envUrl !== "undefined") ? envUrl : "https://moodlocationfinder-backend.onrender.com";
    // ตัดเครื่องหมาย / ด้านหลังสุดออกเพื่อป้องกัน URL ซ้อนกัน
    return base.replace(/\/$/, "");
};

export const IMAGE_BASE_URL = "https://moodlocationfinder-backend.onrender.com";

// 🌟 3. ตัวแปรสำหรับ API (เติม /api/v1 เข้าไป)
const getApiBaseURL = () => {
    const base = getBaseDomain();
    return base.includes("/api/v1") ? base : `${base}/api/v1`;
};

const api = axios.create({
    baseURL: getApiBaseURL(),
    withCredentials: true, 
    headers: { 'Content-Type': 'application/json' }
});

// ✨ Interceptor สำหรับแนบ Token
api.interceptors.request.use(
    (config) => {
        const cookieToken = Cookies.get('token'); 
        const localToken = localStorage.getItem('token');
        const token = cookieToken || localToken;

        // Let the browser add the multipart boundary for file uploads.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ✨ Interceptor จัดการ Session หมดอายุ
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            Cookies.remove('token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;