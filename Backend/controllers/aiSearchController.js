const Groq = require("groq-sdk");
const { validateEmotionInput } = require("../utils/emotionValidator");

// In-Memory Cache สำหรับเก็บคำตอบคำค้นหาที่เคยประมวลผลแล้ว (จำกัดขนาดสูงสุด 1,000 รายการ ป้องกัน Memory Leak)
const MAX_CACHE_SIZE = 1000;
const searchCache = new Map();

const setCache = (key, value) => {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
  searchCache.set(key, value);
};

exports.analyzeEmotion = async (req, res) => {
  try {
    const { text } = req.body;

    // 🌟 Layer 1: Heuristic Pre-Validation (ตรวจจับข้อความขยะ ตัวเลขมั่ว อักขระพิเศษ ก่อนเรียก AI)
    const validation = validateEmotionInput(text);
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message || "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น"
      });
    }

    const cleanInput = text.trim();

    // 🌟 0. ตรวจสอบ In-Memory Cache เพื่อคืนผลลัพธ์คำเดิมแบบคงที่และรวดเร็ว
    if (searchCache.has(cleanInput)) {
      return res.status(200).json(searchCache.get(cleanInput));
    }

    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const modelId = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

    const promptText = `คุณคือ AI ผู้เชี่ยวชาญด้านจิตวิทยาและการวิเคราะห์ความรู้สึก หน้าที่ของคุณคือการอ่านข้อความบอกเล่าความรู้สึกหรืออาการของผู้ใช้งาน และวิเคราะห์ตอบกลับเป็น JSON แยกเป็น 2 ข้อ: 1. อารมณ์ในตอนนี้ 2. เหตุผลสั้นๆ ที่อธิบายอารมณ์นั้น

อารมณ์ที่รองรับในระบบ:
1. "มีความสุข" (Happy)
2. "โกรธ" (Angry)
3. "เบื่อ" (Bored)
4. "เศร้า" (Sad)
5. "เครียด" (Stressed) - รวมถึงอาการทางร่างกาย เช่น ปวดหัว, ปวดท้อง, เหนื่อยล้า
6. "ไม่พบอารมณ์" (Unknown/Invalid) - สำหรับข้อความที่อ่านไม่รู้เรื่อง, ข้อความมั่ว, ตัวเลข, คำศัพท์ทั่วไป หรือข้อความที่ไม่เกี่ยวกับอารมณ์ ความรู้สึก หรืออาการทางกายใจเลยแม้แต่น้อย

กฎเหล็กสำหรับการประมวลผล:
1) ห้ามตอบเป็นประโยคสนทนาทั่วไปเด็ดขาด
2) ให้ตอบกลับมาเป็นรูปแบบโครงสร้าง JSON เท่านั้น (ห้ามใส่เครื่องหมาย markdown backticks หรือข้อความอื่น)
3) หากข้อความไม่มีความหมาย หรือไม่สื่อถึงอารมณ์ สภาวะจิตใจ หรืออาการใดๆ เลย ให้ตอบ emotion เป็น "ไม่พบอารมณ์" เท่านั้น ห้ามสุ่มหรือเดาเป็นอารมณ์อื่นเด็ดขาด!
4) reason ต้องเป็นประโยคภาษาไทยเพียง 1 ประโยคสั้นๆ ไม่เกิน 20 คำ อธิบายเฉพาะสาเหตุจากข้อความผู้ใช้ ห้ามแนะนำสถานที่ กิจกรรม หรือวิธีแก้ไข

รูปแบบ JSON ที่ต้องการให้ตอบกลับ:
- กรณีพบอารมณ์:
{
  "emotion": "เลือกคำใดคำหนึ่งจาก: มีความสุข, โกรธ, เบื่อ, เศร้า, เครียด",
  "reason": "ประโยคเดียวสั้นๆ ไม่เกิน 20 คำ อธิบายว่าจากข้อความของผู้ใช้ทำไมจึงจัดอยู่ในอารมณ์นี้"
}

- กรณีไม่พบอารมณ์ หรือข้อความอ่านไม่รู้เรื่อง:
{
  "emotion": "ไม่พบอารมณ์",
  "reason": "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น กรุณาระบุข้อความที่สื่อถึงอารมณ์หรือความรู้สึกของคุณ"
}

อาการของฉันคือ: ${cleanInput}

ตอบกลับเป็น JSON เท่านั้น:`;

    console.log(`กำลังส่งข้อมูลให้ Groq (${modelId}) ประมวลผล...`);
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: "user", content: promptText }],
      temperature: 0.5,
      max_tokens: 512,
      response_format: { type: "json_object" }
    });

    const generatedText = response.choices?.[0]?.message?.content || "";

    // ล้างขยะ: ลบเครื่องหมาย ```json และ ```
    let cleanText = generatedText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // ค้นหาขอบเขตโครงสร้าง JSON Object
    const startIdx = cleanText.indexOf("{");
    const endIdx = cleanText.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    const parsedData = JSON.parse(cleanText);

    let finalEmotion = parsedData.emotion ? parsedData.emotion.trim() : "ไม่พบอารมณ์";

    // 🌟 Layer 2: Semantic Post-Validation ดักกรณี AI ระบุว่า "ไม่พบอารมณ์"
    if (
      finalEmotion === "ไม่พบอารมณ์" ||
      finalEmotion.toLowerCase() === "unknown" ||
      finalEmotion.toLowerCase() === "invalid"
    ) {
      return res.status(400).json({
        message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น",
        reason: parsedData.reason || "กรุณาระบุข้อความที่สื่อถึงอารมณ์หรือความรู้สึกของคุณ เช่น 'วันนี้เหนื่อยมากอยากพักผ่อน' หรือ 'รู้สึกมีความสุขจัง'"
      });
    }

    if (finalEmotion === "สุข" || finalEmotion === "มีความสุข") finalEmotion = "มีความสุข";
    else if (finalEmotion.includes("สุข")) finalEmotion = "มีความสุข";
    else if (finalEmotion.includes("โกรธ")) finalEmotion = "โกรธ";
    else if (finalEmotion.includes("เบื่อ")) finalEmotion = "เบื่อ";
    else if (finalEmotion.includes("เศร้า")) finalEmotion = "เศร้า";
    else if (finalEmotion.includes("เครียด") || finalEmotion.includes("เหนื่อย") || finalEmotion.includes("ปวด")) finalEmotion = "เครียด";
    else {
      // หากไม่อยู่ใน 5 อารมณ์หลัก ไม่สุ่ม fallback ไปเป็น "เครียด" อีกต่อไป
      return res.status(400).json({
        message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น",
        reason: "ระบบสามารถวิเคราะห์ได้เฉพาะ 5 อารมณ์หลัก (มีความสุข, โกรธ, เบื่อ, เศร้า, เครียด) กรุณาระบุความรู้สึกของคุณใหม่"
      });
    }

    const responsePayload = {
      emotion: finalEmotion,
      reason: parsedData.reason || "จากข้อความของคุณจึงวิเคราะห์ว่าเป็นอารมณ์นี้",
    };

    // บันทึกลง In-Memory Cache เพื่อความคงที่สำหรับการค้นหาครั้งถัดไป
    setCache(cleanInput, responsePayload);

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("Groq AI Error:", error.message || error);

    // ตอบกลับ Error HTTP 500 พร้อมข้อความแจ้งเตือนชัดเจน (ไม่ใช้ Fallback)
    return res.status(500).json({
      message: "ไม่สามารถใช้งานบริการ AI ได้ในขณะนี้",
      error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI"
    });
  }
};
