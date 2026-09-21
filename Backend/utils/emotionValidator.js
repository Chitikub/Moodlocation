/**
 * Emotion Input Validator (ระบบตรวจสอบความถูกต้องของข้อความค้นหาอารมณ์)
 * ออกแบบตามหลัก Defense-in-Depth สไตล์ Senior Backend Architect (30-Year Experience Mindset):
 *
 * วัตถุประสงค์:
 * 1. ดักจับข้อความขยะ ตัวเลขมั่ว สัญลักษณ์พิเศษ และ Keyboard Mash ก่อนเรียก LLM / AWS Bedrock
 * 2. ป้องกัน Zero-Day Token Depletion (ประหยัดค่าใช้จ่าย API & ป้องกัน DoS)
 * 3. ลด Latency จาก 2-3 วินาที เหลือ < 1ms สำหรับ invalid requests
 * 4. รักษา User Experience: แยกแยะการลากเสียงภาษาไทย (เช่น "เครียดดดดด", "เหนื่อยยย") และเสียงหัวเราะ "555" ออกจากการสแปม
 */

/**
 * ตรวจสอบความถูกต้องของข้อความ
 * @param {string} text - ข้อความที่รับมาจากผู้ใช้
 * @returns {{ isValid: boolean, message?: string }}
 */
function validateEmotionInput(text) {
  // 1. ตรวจสอบค่าว่างและ Type Checking
  if (!text || typeof text !== "string") {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (กรุณาระบุข้อความที่ต้องการค้นหา)"
    };
  }

  const trimmed = text.trim();

  // 2. ความยาวต่ำสุดและสูงสุด (Length Boundary Protection)
  if (trimmed.length < 2) {
    return {
      isValid: false,
      message: "ข้อความสั้นเกินไป ไม่สามารถวิเคราะห์ความรู้สึกได้ กรุณาระบุข้อความให้ชัดเจนยิ่งขึ้น"
    };
  }

  if (trimmed.length > 300) {
    return {
      isValid: false,
      message: "ข้อความมีความยาวเกินกำหนด (สูงสุด 300 ตัวอักษร) กรุณาระบุข้อความให้กระชับขึ้น"
    };
  }

  // 3. ตรวจสอบเสียงหัวเราะแบบไทย (Thai Laughter) เช่น "555", "555+", "55555"
  const isThaiLaughter = /^5{2,}\+*$/.test(trimmed);

  // 4. กรณีเป็นตัวเลขล้วน (Pure Numbers) เช่น "123456", "0891234567"
  if (/^\d+$/.test(trimmed) && !isThaiLaughter) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ไม่สามารถวิเคราะห์ตัวเลขได้)"
    };
  }

  // 5. กรณีมีเฉพาะตัวเลขผสมสัญลักษณ์ (เช่น "123-456", "++999**")
  if (/^[\d\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]+$/.test(trimmed) && !isThaiLaughter) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ตัวเลขและสัญลักษณ์ไม่สื่อถึงอารมณ์)"
    };
  }

  // 6. ตรวจสอบว่ามีตัวอักษรจริงหรือไม่ (ทั้งไทยและอังกฤษ)
  // ก-ฮ (0E01-0E2E), สระไทย (0E30-0E3A, 0E40-0E47), a-zA-Z
  const hasValidLetters = /[a-zA-Z\u0E01-\u0E2E]/.test(trimmed);
  if (!hasValidLetters && !isThaiLaughter) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (กรุณาหลีกเลี่ยงการใช้อักขระพิเศษหรือสัญลักษณ์ล้วน)"
    };
  }

  // 7. อัตราส่วนสัญลักษณ์ต่อตัวอักษรสูงผิดปกติ (> 60% เป็นอักขระพิเศษ)
  if (!isThaiLaughter) {
    const letterMatches = trimmed.match(/[a-zA-Z\u0E00-\u0E7F]/g) || [];
    const symbolMatches = trimmed.match(/[^a-zA-Z0-9\u0E00-\u0E7F\s]/g) || [];
    if (letterMatches.length === 0 || (symbolMatches.length / trimmed.length > 0.6)) {
      return {
        isValid: false,
        message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (มีสัญลักษณ์หรืออักขระพิเศษมากเกินไป)"
      };
    }
  }

  // 8. การพิมพ์ตัวอักษรซ้ำซากแบบไร้ความหมาย (Repeated Character Spam)
  // เช่น "aaaaaaa", "กกกกกกกก", "zzzzzzzz"
  const stripped = trimmed.replace(/\s/g, "");
  const chars = Array.from(stripped);
  const uniqueChars = new Set(chars);

  // กรณีมีตัวอักษรเดียวซ้ำกัน 4 ตัวขึ้นไป (ยกเว้น 55555)
  if (uniqueChars.size === 1 && stripped.length >= 4 && !isThaiLaughter) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ตัวอักษรซ้ำซ้อนโดยไม่มีความหมาย)"
    };
  }

  // กรณีมีตัวอักษรวนซ้ำแค่ 2 ตัว เช่น "abababab", "กขกขกข"
  if (uniqueChars.size <= 2 && stripped.length >= 6 && !/^[5+ฮ่าฮิ]+$/.test(trimmed)) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ข้อความซ้ำซ้อนโดยไม่มีความหมาย)"
    };
  }

  // 9. ตรวจสอบ Keyboard Mash ยอดฮิต (การพิมพ์ปุ่มคีย์บอร์ดมั่ว)
  // 9.1 คีย์บอร์ดแถวกลาง / แถวบน / แถวล่างภาษาอังกฤษ
  const isEnglishMash = /^[asdfghjkl]{5,}$/i.test(trimmed) ||
                       /^[qwertyuiop]{5,}$/i.test(trimmed) ||
                       /^[zxcvbnm]{5,}$/i.test(trimmed);
  if (isEnglishMash) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ข้อความอ่านไม่รู้เรื่อง)"
    };
  }

  // 9.2 ภาษาอังกฤษล้วน 5 ตัวอักษรขึ้นไปที่ไม่มีสระเลย (Consonant-only mash เช่น "dfghjkl", "qwrtyp")
  if (/^[a-zA-Z]{5,}$/.test(trimmed) && !/[aeiouyAEIOUY]/.test(trimmed)) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ข้อความอ่านไม่รู้เรื่อง)"
    };
  }

  // 9.3 แป้นพิมพ์ภาษาไทยแถวกลาง (เช่น "กดหฟดหกฟ", "ฟหกด่าสว")
  if (/^[กดหฟโเ้่าสวง]{5,}$/.test(trimmed)) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ข้อความอ่านไม่รู้เรื่อง)"
    };
  }

  // 9.4 พยัญชนะไทยล้วน 5 ตัวขึ้นไปโดยไม่มีสระหรือวรรณยุกต์ใดๆ เลย (เช่น "กขคงจฉช")
  const thaiVowelsAndTones = /[\u0E30-\u0E3A\u0E40-\u0E4E]/;
  const isThaiConsonantsOnly = /^[\u0E01-\u0E2E]{5,}$/.test(trimmed);
  if (isThaiConsonantsOnly && !thaiVowelsAndTones.test(trimmed)) {
    return {
      isValid: false,
      message: "ข้อความไม่สามารถค้นหาได้ หรือไม่พบการค้นหาความรู้สึกนั้น (ข้อความอ่านไม่รู้เรื่อง)"
    };
  }

  return { isValid: true };
}

module.exports = {
  validateEmotionInput
};
