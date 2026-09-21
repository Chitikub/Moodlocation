const { History } = require('../models');

// 🌟 บันทึกประวัติการนำทาง
const createHistory = async (req, res) => {
  try {
    const { placeId, name, image } = req.body;
    const userId = req.user.id;

    // บันทึกประวัติใหม่ลงไปเลย (เก็บซ้ำได้เพราะเป็นประวัติการไป)
    const history = await History.create({
      userId,
      placeId,
      placeName: name,
      placeImage: image,
      visitedAt: new Date()
    });

    res.status(201).json({ message: "History saved", history });
  } catch (error) {
    res.status(500).json({ message: "Error saving history" });
  }
};

// 🌟 ดึงประวัติมาโชว์
const getHistories = async (req, res) => {
  try {
    const histories = await History.findAll({
      where: { userId: req.user.id },
      order: [['visitedAt', 'DESC']] // เอาอันล่าสุดขึ้นก่อน
    });
    res.status(200).json({ histories });
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

// ========== ลบประวัติ ==========
// DELETE /api/history/:id
const deleteHistory = async (req, res) => {
    try {
        const history = await History.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!history) {
            return res.status(404).json({ message: 'ไม่พบประวัติ' });
        }

        await history.destroy();
        res.json({ message: 'ลบประวัติเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeleteHistory error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { createHistory, getHistories, deleteHistory };
