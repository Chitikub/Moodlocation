const { Op } = require('sequelize');
const { Place, Review, User } = require('../models');

// ========== Mood Keywords Mapping ==========
const moodKeywords = {
    'มีความสุข': ['สุข', 'ดีใจ', 'สนุก', 'เฮฮา', 'ยิ้ม', 'หัวเราะ', 'ปลื้ม', 'happy', 'joy'],
    'เศร้า': ['เศร้า', 'เสียใจ', 'ร้องไห้', 'ผิดหวัง', 'เหงา', 'ซึม', 'sad', 'cry', 'lonely'],
    'เครียด': ['เครียด', 'กดดัน', 'หนักใจ', 'วิตก', 'กังวล', 'ปวดหัว', 'เหนื่อย', 'ด่า', 'stress'],
    'ตื่นเต้น': ['ตื่นเต้น', 'ลุ้น', 'ท้าทาย', 'ผจญภัย', 'adventure', 'excited'],
    'โรแมนติก': ['รัก', 'โรแมนติก', 'หวาน', 'romantic', 'love', 'แฟน', 'คู่รัก'],
    'ผ่อนคลาย': ['ชิล', 'ผ่อนคลาย', 'สบาย', 'พักผ่อน', 'relax', 'chill', 'calm'],
    'โกรธ': ['โกรธ', 'หงุดหงิด', 'โมโห', 'รำคาญ', 'angry', 'mad']
};

// ========== UC3: กดเลือกความรู้สึก ==========
// GET /api/places/mood/:mood
const getPlacesByMood = async (req, res) => {
    try {
        const { mood } = req.params;
        const { personality, category } = req.query;

        let whereClause = {
            moods: { [Op.contains]: [mood] }
        };

        if (personality) {
            whereClause.personality = { [Op.contains]: [personality] };
        }

        if (category) {
            whereClause.category = category;
        }

        const places = await Place.findAll({
            where: whereClause,
            include: [{
                model: Review,
                as: 'reviews',
                attributes: ['rating']
            }],
            order: [['createdAt', 'DESC']]
        });

        // คำนวณคะแนนเฉลี่ย
        const placesWithRating = places.map(place => {
            const placeData = place.toJSON();
            const ratings = placeData.reviews.map(r => r.rating);
            placeData.averageRating = ratings.length > 0
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : 0;
            placeData.reviewCount = ratings.length;
            delete placeData.reviews;
            return placeData;
        });

        res.json({
            message: `พบ ${placesWithRating.length} สถานที่สำหรับอารมณ์ "${mood}"`,
            count: placesWithRating.length,
            places: placesWithRating
        });
    } catch (error) {
        console.error('GetPlacesByMood error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== UC4: พิมพ์ค้นหาความรู้สึก ==========
// GET /api/places/search?q=keyword
const searchByMoodText = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === '') {
            return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความค้นหา' });
        }

        // ค้นหา mood ที่ตรงกับ keyword
        let detectedMood = null;
        for (const [mood, keywords] of Object.entries(moodKeywords)) {
            for (const keyword of keywords) {
                if (q.toLowerCase().includes(keyword.toLowerCase())) {
                    detectedMood = mood;
                    break;
                }
            }
            if (detectedMood) break;
        }

        if (!detectedMood) {
            return res.json({
                message: 'ไม่พบคำที่ตรงกับความรู้สึกในระบบ',
                suggestion: 'ลองบอกว่า "เครียดจัง" หรือ "มีความสุข" หรือ "อยากชิล"',
                detectedMood: null,
                places: []
            });
        }

        // ค้นหาสถานที่ตาม mood ที่พบ
        const places = await Place.findAll({
            where: {
                moods: { [Op.contains]: [detectedMood] }
            },
            include: [{
                model: Review,
                as: 'reviews',
                attributes: ['rating']
            }],
            order: [['createdAt', 'DESC']]
        });

        const placesWithRating = places.map(place => {
            const placeData = place.toJSON();
            const ratings = placeData.reviews.map(r => r.rating);
            placeData.averageRating = ratings.length > 0
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : 0;
            placeData.reviewCount = ratings.length;
            delete placeData.reviews;
            return placeData;
        });

        res.json({
            message: `ดูเหมือนคุณจะรู้สึก "${detectedMood}" ให้เราช่วยหาพิกัดให้ไหม?`,
            detectedMood,
            count: placesWithRating.length,
            places: placesWithRating
        });
    } catch (error) {
        console.error('SearchByMoodText error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== UC6: การเลือกหมวดหมู่ ==========
// GET /api/places/category/:category
const getPlacesByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const places = await Place.findAll({
            where: { category },
            include: [{
                model: Review,
                as: 'reviews',
                attributes: ['rating']
            }],
            order: [['createdAt', 'DESC']]
        });

        const placesWithRating = places.map(place => {
            const placeData = place.toJSON();
            const ratings = placeData.reviews.map(r => r.rating);
            placeData.averageRating = ratings.length > 0
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : 0;
            placeData.reviewCount = ratings.length;
            delete placeData.reviews;
            return placeData;
        });

        if (placesWithRating.length === 0) {
            // แนะนำหมวดหมู่ใกล้เคียง
            const allCategories = await Place.findAll({
                attributes: ['category'],
                group: ['category']
            });
            const availableCategories = allCategories.map(p => p.category);

            return res.json({
                message: `ในหมวด "${category}" ยังไม่มีสถานที่`,
                suggestion: `หมวดหมู่ที่มี: ${availableCategories.join(', ')}`,
                count: 0,
                places: []
            });
        }

        res.json({
            message: `พบ ${placesWithRating.length} สถานที่ในหมวด "${category}"`,
            count: placesWithRating.length,
            places: placesWithRating
        });
    } catch (error) {
        console.error('GetPlacesByCategory error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ดึงสถานที่ทั้งหมด ==========
// GET /api/places
const getAllPlaces = async (req, res) => {
    try {
        const places = await Place.findAll({
            include: [{
                model: Review,
                as: 'reviews',
                attributes: ['rating']
            }],
            order: [['createdAt', 'DESC']]
        });

        const placesWithRating = places.map(place => {
            const placeData = place.toJSON();
            const ratings = placeData.reviews.map(r => r.rating);
            placeData.averageRating = ratings.length > 0
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : 0;
            placeData.reviewCount = ratings.length;
            delete placeData.reviews;
            return placeData;
        });

        res.json({
            count: placesWithRating.length,
            places: placesWithRating
        });
    } catch (error) {
        console.error('GetAllPlaces error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ดึงสถานที่ตาม ID ==========
// GET /api/places/:id
const getPlaceById = async (req, res) => {
    try {
        const place = await Place.findByPk(req.params.id, {
            include: [{
                model: Review,
                as: 'reviews',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }],
                order: [['createdAt', 'DESC']]
            }]
        });

        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        const placeData = place.toJSON();
        const ratings = placeData.reviews.map(r => r.rating);
        placeData.averageRating = ratings.length > 0
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
            : 0;
        placeData.reviewCount = ratings.length;

        res.json({ place: placeData });
    } catch (error) {
        console.error('GetPlaceById error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ดึงรายการ Moods ทั้งหมด ==========
// GET /api/places/moods/list
const getAllMoods = async (req, res) => {
    try {
        res.json({
            moods: Object.keys(moodKeywords),
            moodKeywords
        });
    } catch (error) {
        console.error('GetAllMoods error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = {
    getPlacesByMood,
    searchByMoodText,
    getPlacesByCategory,
    getAllPlaces,
    getPlaceById,
    getAllMoods
};
