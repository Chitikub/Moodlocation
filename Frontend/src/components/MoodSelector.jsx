import { useState, useRef } from "react";

export default function MoodSelector({ onSelectMood }) {
  const moods = [
    {
      id: "happy",
      label: "มีความสุข",
      emoji: "😁",
      color: "#FF8E6E",
      bg: "#FFF1EC",
    },
    {
      id: "bored",
      label: "เบื่อ",
      emoji: "😫",
      color: "#FFB385",
      bg: "#FFF6EE",
    },
    {
      id: "angry",
      label: "โกรธ",
      emoji: "😡",
      color: "#FF4D4D",
      bg: "#FFEEEE",
    },
    {
      id: "stressed",
      label: "เครียด",
      emoji: "🤯",
      color: "#A855F7",
      bg: "#F5EEFF",
    },
    { id: "sad", label: "เศร้า", emoji: "😢", color: "#60A5FA", bg: "#EEF5FF" },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // card กว้าง 96px + gap 12px = 108px ต่อ card
    const index = Math.round(el.scrollLeft / 108);
    setActiveIndex(index);
  };

  return (
    <>
      {/* Mobile */}
      <div className="relative flex sm:hidden">
        {/* Fade ขวา */}
        <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-[#FDF8F1] to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="
            flex gap-3
            overflow-x-auto px-4 pb-3
            snap-x snap-mandatory scroll-smooth
            [-webkit-overflow-scrolling:touch]
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            w-full
          "
        >
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => onSelectMood(mood.id)}
              className="
                group snap-start shrink-0
                flex flex-col items-center justify-center
                rounded-3xl w-24 h-24
                border-2 border-transparent
                active:scale-95 active:border-current
                transition-all duration-200 shadow-sm
              "
              style={{ backgroundColor: mood.bg }}
            >
              <span className="text-4xl mb-1.5 transition-transform duration-200 group-active:scale-110">
                {mood.emoji}
              </span>
              <span
                className="text-xs font-black leading-none"
                style={{ color: mood.color }}
              >
                {mood.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex sm:hidden justify-center gap-2 mt-2">
        {moods.map((_, i) => (
          <div
            key={i}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === activeIndex ? "20px" : "6px",
              height: "6px",
              backgroundColor:
                i === activeIndex ? moods[activeIndex].color : "#D5CFC4",
            }}
          />
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex flex-wrap justify-center gap-5">
        {moods.map((mood) => (
          <button
            key={mood.id}
            onClick={() => onSelectMood(mood.id)}
            className="
              group flex flex-col items-center justify-center
              bg-white border border-gray-100 rounded-[2rem]
              p-6 w-32 h-32
              shadow-[0_10px_30px_rgba(0,0,0,0.03)]
              hover:shadow-xl hover:-translate-y-2
              transition-all duration-300
            "
          >
            <span className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">
              {mood.emoji}
            </span>
            <span className="text-sm font-bold text-[#4A453A]">
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
