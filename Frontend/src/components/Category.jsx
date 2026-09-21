// components/CategoryChip.jsx
export default function CategoryChip({ category }) {
  // กำหนดไอคอนตามชื่อประเภทที่ได้รับมาจาก Backend
  const categoryIcons = {
    "ธรรมชาติ": "🌿",
    "คาเฟ่": "☕",
    "วัด": "🛕",
    "ชายหาด": "🏖️",
    "ภูเขา": "⛰️",
    "สวนสาธารณะ": "🌳",
    "ร้านอาหาร": "🍽️"
  };

  return (
    <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white border border-[#E2DCCB] shadow-sm text-sm md:text-base font-black text-[#4A453A] transition-all hover:shadow-md active:scale-95">
      <span>{categoryIcons[category] || "📍"}</span>
      {category}
    </span>
  );
}