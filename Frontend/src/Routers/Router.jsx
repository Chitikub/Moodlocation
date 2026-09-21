'use client';
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import GuidePage from "../pages/Guide";
import ContactPage from "../pages/Contact";
import FavoritesPage from "../pages/favorites";
import Profile from "../pages/profile";
import HistoryPage from "../pages/history";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminMessages from "../pages/admin/AdminMessages";
import AdminProfile from "../pages/admin/AdminProfile";
import FilterPage from "../pages/FilterPage";
import GooglePlaceDetail from "../pages/GooglePlaceDetail";
import TripPlanner from "../pages/TripPlanner";
import VerifyEmail from "../pages/VerifyEmail";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";

// 🌟 ฟังก์ชันดึง Token ที่ครอบคลุมทั้ง Cookie และ LocalStorage
const getToken = () => {
    const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

    return cookieToken || localStorage.getItem("token");
};

// 🔒 1. สำหรับหน้า Login/Register: ถ้ามี Token แล้ว ห้ามเข้าหน้า Login ให้ดีดไปตามยศ
const AuthRoute = ({ children }) => {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem("user"));

    if (token && user) {
        return <Navigate to={user.role === 'admin' ? "/admin" : "/"} replace />;
    }
    return children;
};

// 🔒 2. สำหรับหน้า Admin เท่านั้น
const ProtectedAdminRoute = ({ children }) => {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// 🔒 3. สำหรับหน้า User เท่านั้น (Admin ห้ามเข้าหน้าบ้าน)
const ProtectedUserRoute = ({ children }) => {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem("user"));

    if (token && user?.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }
    return children;
};

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            // หน้าบ้าน: Admin เข้าไม่ได้ (โดนดีดไป /admin)
            { index: true, element: <ProtectedUserRoute><Home /></ProtectedUserRoute> },
            { path: "guide", element: <ProtectedUserRoute><GuidePage /></ProtectedUserRoute> },
            { path: "contact", element: <ProtectedUserRoute><ContactPage /></ProtectedUserRoute> },
            { path: "favorites", element: <ProtectedUserRoute><FavoritesPage /></ProtectedUserRoute> },
            { path: "history", element: <ProtectedUserRoute><HistoryPage /></ProtectedUserRoute> },
            { path: "filter", element: <ProtectedUserRoute><FilterPage /></ProtectedUserRoute> },
            { path: "g-place/:placeId", element: <ProtectedUserRoute><GooglePlaceDetail /></ProtectedUserRoute> },
            { path: "planner", element: <ProtectedUserRoute><TripPlanner /></ProtectedUserRoute> },


            // หน้าที่เข้าได้ทั้งคู่
            { path: "profile", element: <Profile /> },

            // หน้า Auth: Login แล้วห้ามเข้าหน้าพวกนี้ซ้ำ
            { path: "login", element: <AuthRoute><Login /></AuthRoute> },
            { path: "register", element: <AuthRoute><Register /></AuthRoute> },
            { path: "verify-email", element: <AuthRoute><VerifyEmail /> </AuthRoute> },
            { path: "forgot-password", element: <AuthRoute><ForgotPassword /></AuthRoute> },
            { path: "reset-password", element: <ResetPassword /> },

            // หน้าระบบ Admin: User ทั่วไปห้ามเข้า
            {
                path: "admin",
                element: <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
            },
            {
                path: "admin/users",
                element: <ProtectedAdminRoute><AdminUsers /></ProtectedAdminRoute>
            },
            {
                path: "admin/messages",
                element: <ProtectedAdminRoute><AdminMessages /></ProtectedAdminRoute>
            },
            {
                path: "admin/profile",
                element: <ProtectedAdminRoute><AdminProfile /></ProtectedAdminRoute>
            },
            {
                path: "/admin/announcements",
                element: <AdminAnnouncements />
            }
        ]
    },
    { path: "*", element: <Navigate to="/" replace /> }
]);

export default function Routers() {
    return <RouterProvider router={router} />;
}