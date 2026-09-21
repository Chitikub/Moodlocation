const { Announcement } = require('../models');

// GET /api/v1/announcements - ดึงประกาศทั้งหมด
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json({ announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลประกาศได้', error: error.message });
    }
};

// GET /api/v1/announcements/:id - ดึงประกาศตาม ID
const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: 'ไม่พบประกาศที่ระบุ' });
        }
        res.json(announcement);
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประกาศ', error: error.message });
    }
};

// POST /api/v1/announcements - สร้างประกาศใหม่
const createAnnouncement = async (req, res) => {
    try {
        const { title, description, shortContent, fullContent, coverImage, contentBlocks, layout } = req.body;
        if (!title || (!description && !shortContent)) {
            return res.status(400).json({ message: 'กรุณากรอกหัวข้อ และคำโปรยหน้าการ์ดให้ครบถ้วน' });
        }

        const newAnnouncement = await Announcement.create({
            title,
            description: description || shortContent,
            shortContent: shortContent || description,
            fullContent: fullContent || '',
            coverImage: coverImage || null,
            contentBlocks: contentBlocks || [],
            layout: layout || 'image-top'
        });

        res.status(201).json({ message: 'สร้างประกาศสำเร็จ', announcement: newAnnouncement });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างประกาศ', error: error.message });
    }
};

// PUT /api/v1/announcements/:id - แก้ไขประกาศ
const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: 'ไม่พบประกาศที่ต้องการแก้ไข' });
        }

        const { title, description, shortContent, fullContent, coverImage, contentBlocks, layout } = req.body;

        await announcement.update({
            title: title !== undefined ? title : announcement.title,
            description: description !== undefined ? description : announcement.description,
            shortContent: shortContent !== undefined ? shortContent : announcement.shortContent,
            fullContent: fullContent !== undefined ? fullContent : announcement.fullContent,
            coverImage: coverImage !== undefined ? coverImage : announcement.coverImage,
            contentBlocks: contentBlocks !== undefined ? contentBlocks : announcement.contentBlocks,
            layout: layout !== undefined ? layout : announcement.layout
        });

        res.json({ message: 'แก้ไขประกาศสำเร็จ', announcement });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขประกาศ', error: error.message });
    }
};

// DELETE /api/v1/announcements/:id - ลบประกาศ
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: 'ไม่พบประกาศที่ต้องการลบ' });
        }

        await announcement.destroy();
        res.json({ message: 'ลบประกาศสำเร็จ' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบประกาศ', error: error.message });
    }
};

module.exports = {
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
};
