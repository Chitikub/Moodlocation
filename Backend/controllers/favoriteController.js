const { Favorite } = require('../models');

// 🌟 กดใจ / เลิกกดใจ
const toggleFavorite = async (req, res) => {
  try {
    const { placeId, name, image } = req.body;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ where: { userId, placeId } });

    if (favorite) {
      await favorite.destroy();
      return res.status(200).json({ isFavorite: false, message: "Removed" });
    } else {
      await Favorite.create({ 
        userId, 
        placeId, 
        placeName: name, 
        placeImage: image 
      });
      return res.status(201).json({ isFavorite: true, message: "Added" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling favorite" });
  }
};

// ========== ดึงรายการโปรดของผู้ใช้ ==========
// GET /api/favorites
const getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: favorites.length,
            favorites
        });
    } catch (error) {
        console.error('GetFavorites error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// 🌟 เช็คสถานะหัวใจ (ใช้ตอนโหลดหน้า Detail)
const checkFavorite = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ where: { userId, placeId } });
    res.status(200).json({ isFavorite: !!favorite });
  } catch (error) {
    res.status(500).json({ message: "Error checking favorite" });
  }
};

module.exports = { toggleFavorite, getFavorites, checkFavorite };
