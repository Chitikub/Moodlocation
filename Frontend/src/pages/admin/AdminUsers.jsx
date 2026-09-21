"use client";
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Trash2, Search, Ban, CheckCircle, Mail } from "lucide-react";
import api from "@/api/axios";
import Swal from "sweetalert2";

export default function AdminUsers() {
  const context = useOutletContext();
  const setTab = context?.setTab;

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      const data = res.data.users || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleToggleBan = async (user) => {
    const userId = user.id || user._id;
    const isBanned = user.status === "banned" || user.isBanned === true;

    const result = await Swal.fire({
      title: isBanned ? "ปลดระงับสมาชิก?" : "ระงับการใช้งาน?",
      text: `ยืนยันรายการสำหรับคุณ ${user.firstName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isBanned ? "#10B981" : "#EF4444",
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
      background: "#FDF8F1",
      customClass: { popup: "rounded-[2rem]" },
    });

    if (result.isConfirmed) {
      try {
        const endpoint = isBanned ? "unban" : "ban";
        await api.put(`/admin/users/${userId}/${endpoint}`);
        Swal.fire({
          title: "สำเร็จ!",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchAllUsers();
      } catch (e) {
        Swal.fire(
          "ผิดพลาด",
          e.response?.data?.message || "ทำรายการไม่สำเร็จ",
          "error",
        );
      }
    }
  };

  const handleDeleteUser = async (user) => {
    const userId = user.id || user._id;
    if (user.role === "admin")
      return Swal.fire("คำเตือน", "ไม่สามารถลบผู้ดูแลระบบได้", "warning");

    const { value: confirmText } = await Swal.fire({
      title: "ลบสมาชิกถาวร?",
      text: `กรุณาพิมพ์คำว่า "DELETE" เพื่อยืนยันการลบคุณ ${user.firstName}`,
      icon: "error",
      input: "text",
      inputPlaceholder: "พิมพ์ DELETE ที่นี่...",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      background: "#FDF8F1",
      customClass: { popup: "rounded-[2rem]" },
      inputValidator: (value) => {
        if (value !== "DELETE") return "กรุณาพิมพ์คำว่า DELETE ให้ถูกต้อง";
      },
    });

    if (confirmText === "DELETE") {
      try {
        await api.delete(`/admin/users/${userId}`, {
          data: { confirmText: "DELETE" },
        });
        Swal.fire({
          title: "สำเร็จ!",
          text: "ลบสมาชิกออกจากระบบเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchAllUsers();
      } catch (e) {
        Swal.fire(
          "ผิดพลาด",
          e.response?.data?.message || "ไม่สามารถลบข้อมูลได้",
          "error",
        );
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 animate-fade-in font-['Kanit'] bg-[#FDF8F1] min-h-screen">
      {/* 🌟 Header Section: ปรับปรุงการจัดวางบนมือถือ */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8 md:mb-12">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#4A453A] leading-tight">
            จัดการ <span className="text-[#FF8E6E]">สมาชิก</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7E7869] font-medium opacity-80">
            ควบคุมสิทธิ์และสถานะการเข้าใช้งานของผู้ใช้ในระบบ
          </p>
        </div>
        <div className="relative w-full sm:w-[320px] lg:w-[380px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ อีเมล..."
            className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white border-none shadow-sm focus:shadow-md outline-none transition-all text-sm font-bold placeholder:font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Content Container */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-[#4A453A]/5 overflow-hidden border border-white">
        {/* 💻 Desktop Table View: แสดงผลตั้งแต่หน้าจอขนาดกลางขึ้นไป */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#4A453A] text-white">
              <tr>
                <th className="p-6 font-bold text-xs lg:text-sm uppercase tracking-widest rounded-tl-[2.5rem]">
                  ข้อมูลสมาชิก
                </th>
                <th className="p-6 font-bold text-xs lg:text-sm uppercase tracking-widest">
                  อีเมล
                </th>
                <th className="p-6 font-bold text-xs lg:text-sm uppercase tracking-widest text-center">
                  สถานะ
                </th>
                <th className="p-6 font-bold text-xs lg:text-sm uppercase tracking-widest text-center rounded-tr-[2.5rem]">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-20 text-center text-[#7E7869] animate-pulse font-bold"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u, index) => {
                  const isBanned = u.status === "banned" || u.isBanned === true;
                  return (
                    <tr
                      key={u.id || u._id || index}
                      className={`transition-all ${isBanned ? "bg-red-50/30" : "hover:bg-gray-50/50"}`}
                    >
                      <td className="p-5 lg:p-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={
                              u.profileImage ||
                              `https://ui-avatars.com/api/?name=${u.firstName}&background=FF7F67&color=fff`
                            }
                            className="w-11 h-11 rounded-xl object-cover shadow-sm border-2 border-white"
                            alt="avatar"
                          />
                          <div className="flex flex-col">
                            <span className="font-black text-[#4A453A] text-base lg:text-lg">
                              {u.firstName} {u.lastName}
                            </span>
                            {isBanned && (
                              <span className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <Ban size={10} /> ถูกระงับ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 lg:p-6 text-[#4A453A] font-medium text-sm">
                        {u.email}
                      </td>
                      <td className="p-5 lg:p-6 text-center">
                        <span
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] ${isBanned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        >
                          {isBanned ? "BANNED" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="p-5 lg:p-6 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleToggleBan(u)}
                            className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-90 ${isBanned ? "bg-green-500 text-white" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                          >
                            {isBanned ? (
                              <CheckCircle size={18} />
                            ) : (
                              <Ban size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-2.5 text-gray-300 hover:text-white hover:bg-red-600 rounded-xl transition-all active:scale-90"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="p-20 text-center text-gray-400 font-bold italic"
                  >
                    ไม่พบข้อมูลสมาชิก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 📱 Mobile Card View: แสดงผลบนหน้าจอขนาดเล็ก */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <div className="p-10 text-center text-[#7E7869] animate-pulse font-bold">
              กำลังโหลด...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((u, index) => {
              const isBanned = u.status === "banned" || u.isBanned === true;
              return (
                <div
                  key={u.id || u._id || index}
                  className={`p-5 space-y-4 ${isBanned ? "bg-red-50/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          u.profileImage ||
                          `https://ui-avatars.com/api/?name=${u.firstName}&background=FF7F67&color=fff`
                        }
                        className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover"
                        alt="avatar"
                      />
                      <div>
                        <p className="font-black text-[#4A453A] text-base">
                          {u.firstName} {u.lastName}
                        </p>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg inline-block mt-1 ${isBanned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        >
                          {isBanned ? "BANNED" : "ACTIVE"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleBan(u)}
                        className={`p-2.5 rounded-xl shadow-sm active:scale-90 ${isBanned ? "bg-green-500 text-white" : "bg-red-50 text-red-500"}`}
                      >
                        {isBanned ? (
                          <CheckCircle size={18} />
                        ) : (
                          <Ban size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl active:scale-90"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#7E7869] font-medium bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                    <Mail size={14} className="shrink-0 text-[#FF8E6E]" />
                    <span className="truncate">{u.email}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-gray-400 font-bold">
              ไม่พบข้อมูลสมาชิก
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
