const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
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

// สร้าง Instance ของ BedrockRuntimeClient โดยใช้อาร์กิวเมนต์ Credentials จาก Environment Variables
const getBedrockClient = () => {
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY;
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY;
  const awsRegion = process.env.AWS_REGION || "us-east-1";

  return new BedrockRuntimeClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKey || "dummy_access_key",
      secretAccessKey: awsSecretKey || "dummy_secret_key"
    }
  });
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

    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY;

    // ตรวจสอบเบื้องต้นว่ามีคีย์หรือไม่ ถ้าไม่มีให้โยน error เพื่อส่งแจ้งเตือนกลับไป
    if (!awsAccessKey || !awsSecretKey) {
      throw new Error("Missing AWS credentials (AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY)");
    }

    const client = getBedrockClient();
    const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

    const promptText = `คุณคือ AI ผู้เชี่ยวชาญด้านจิตวิทยาและการวิเคราะห์ความรู้สึก หน้าที่ของคุณคือการอ่านข้อความบอกเล่าความรู้สึกหรืออาการของผู้ใช้งาน และวิเคราะห์ตอบกลับเป็น JSON แยกเป็น 2 ข้อ: 1. อารมณ์ในตอนนี้ 2. สถานที่เที่ยวแนะนำพร้อมเหตุผลสั้นๆ

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

รูปแบบ JSON ที่ต้องการให้ตอบกลับ:
- กรณีพบอารมณ์:
{
  "emotion": "เลือกคำใดคำหนึ่งจาก: มีความสุข, โกรธ, เบื่อ, เศร้า, เครียด",
  "reason": "คำอธิบายวิเคราะห์อารมณ์ พร้อมแนะนำประเภทสถานที่เที่ยวที่เหมาะสมและเหตุผลสั้นๆ"
}

- กรณีไม่พบอารมณ์ หรือข้อความอ่านไม่รู้เรื่อง:
{
  "emotion": "ไม่พบอารมณ์",
  "reason": "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น กรุณาระบุข้อความที่สื่อถึงอารมณ์หรือความรู้สึกของคุณ"
}

อาการของฉันคือ: ${cleanInput}

ตอบกลับเป็น JSON เท่านั้น:`;

    // ตรวจสอบประเภทของโมเดล (Anthropic Claude VS Llama / อื่นๆ)
    const isAnthropic = modelId.toLowerCase().includes("anthropic") || modelId.toLowerCase().includes("claude");

    let payload;
    if (isAnthropic) {
      // 🌟 Payload สำหรับ Anthropic Claude 3.5 Sonnet / Claude 3 บน AWS Bedrock
      payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 512,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText
              }
            ]
          }
        ]
      };
    } else {
      // Payload สำหรับ Llama 3 หรือโมเดลอื่น
      payload = {
        prompt: promptText,
        max_gen_len: 512,
        temperature: 0.5,
        top_p: 0.9
      };
    }

    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });

    console.log(`กำลังส่งข้อมูลให้ AWS Bedrock (${modelId}) ประมวลผล...`);
    const response = await client.send(command);

    // แปลงผลลัพธ์ที่เป็น Buffer ออกมาเป็นข้อความอักษร (String)
    const responseText = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(responseText);

    let generatedText = "";
    if (responseBody.content && Array.isArray(responseBody.content)) {
      // โครงสร้าง Response ของ Anthropic Claude
      generatedText = responseBody.content.map(c => c.text || "").join("");
    } else if (responseBody.generation) {
      // โครงสร้าง Response ของ Llama 3
      generatedText = responseBody.generation;
    } else if (typeof responseBody.output === "string") {
      generatedText = responseBody.output;
    }

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
      reason: parsedData.reason || "เราเข้าใจสภาวะจิตใจของคุณนะ ลองไปผ่อนคลายในสถานที่แนะนำดูสิ",
    };

    // บันทึกลง In-Memory Cache เพื่อความคงที่สำหรับการค้นหาครั้งถัดไป
    setCache(cleanInput, responsePayload);

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("AWS Bedrock AI Error:", error.message || error);

    // ตอบกลับ Error HTTP 500 พร้อมข้อความแจ้งเตือนชัดเจน (ไม่ใช้ Fallback)
    return res.status(500).json({
      message: "ไม่สามารถใช้งานบริการ AI ได้ในขณะนี้",
      error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI"
    });
  }
};
