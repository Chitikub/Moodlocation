const emotions = ["มีความสุข", "โกรธ", "เบื่อ", "เศร้า", "เครียด"];
const escapedEmotions = emotions.map((emotion) => emotion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const directEmotionPattern = new RegExp(
  `^(?:(?:ตอนนี้|วันนี้)\\s*)?(?:(?:ฉัน|ผม|หนู|เรา)\\s*)?(?:(?:กำลัง\\s*)?(?:รู้สึก\\s*)?)?(${escapedEmotions.join("|")})(?:\\s*(?:มาก(?:ๆ)?|จัง|เลย|สุดๆ?|จริงๆ?|นะ|อยู่))*$`,
  "u",
);

function detectDirectEmotion(text) {
  const normalizedText = text
    .trim()
    .replace(/[.!?。！？]+$/u, "")
    .replace(/\\s+/g, " ");
  const match = normalizedText.match(directEmotionPattern);
  return match?.[1] || null;
}

module.exports = { detectDirectEmotion };