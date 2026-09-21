const { Op } = require('sequelize');
const { User, Place } = require('../models');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// ========== Helper: ดึงพิกัดจาก Google Maps URL ==========
const extractCoordsFromGoogleMaps = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
        // รูปแบบที่ 1: @lat,lng หรือ @lat,lng,zoom
        // เช่น https://www.google.com/maps/@13.7563,100.5018,15z
        // เช่น https://www.google.com/maps/place/.../@13.7563,100.5018,15z
        const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const atMatch = url.match(atPattern);
        if (atMatch) {
            return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
        }

        // รูปแบบที่ 2: ?q=lat,lng หรือ query=lat,lng
        // เช่น https://www.google.com/maps?q=13.7563,100.5018
        const queryPattern = /[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const queryMatch = url.match(queryPattern);
        if (queryMatch) {
            return { latitude: parseFloat(queryMatch[1]), longitude: parseFloat(queryMatch[2]) };
        }

        // รูปแบบที่ 3: /dir/ หรือ !3d...!4d...
        // เช่น https://www.google.com/maps/dir//13.7563,100.5018
        const dirPattern = /\/dir\/\/(-?\d+\.\d+),(-?\d+\.\d+)/;
        const dirMatch = url.match(dirPattern);
        if (dirMatch) {
            return { latitude: parseFloat(dirMatch[1]), longitude: parseFloat(dirMatch[2]) };
        }

        // รูปแบบที่ 4: !3d (latitude) และ !4d (longitude)
        // เช่น ...!3d13.7563!4d100.5018...
        const dataPattern = /!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)/;
        const dataMatch = url.match(dataPattern);
        if (dataMatch) {
            return { latitude: parseFloat(dataMatch[1]), longitude: parseFloat(dataMatch[2]) };
        }

        // รูปแบบที่ 5: /place/lat,lng
        // เช่น https://www.google.com/maps/place/13.7563,100.5018
        const placeCoordPattern = /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
        const placeCoordMatch = url.match(placeCoordPattern);
        if (placeCoordMatch) {
            return { latitude: parseFloat(placeCoordMatch[1]), longitude: parseFloat(placeCoordMatch[2]) };
        }

        return null;
    } catch (error) {
        console.error('Error extracting coords from Google Maps URL:', error);
        return null;
    }
};


// ========== การจัดการ User ==========

// ดึง User ทั้งหมด
// GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const { search, status } = req.query;

        let whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) {
            whereClause.status = status;
        }

        const users = await User.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error('GetAllUsers error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// แบน User ถาวร
// PUT /api/admin/users/:id/ban
const banUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถแบนผู้ดูแลระบบได้' });
        }

        if (user.role === 'owner' && req.user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถแบน owner ได้' });
        }

        user.status = 'banned';
        user.bannedUntil = null;
        await user.save();

        res.json({
            message: 'ระงับการใช้งานถาวรเรียบร้อยแล้ว',
            user
        });
    } catch (error) {
        console.error('BanUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ปลดแบน User
// PUT /api/admin/users/:id/unban
const unbanUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'owner' && req.user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถปลดแบน owner ได้' });
        }

        user.status = 'active';
        user.bannedUntil = null;
        await user.save();

        res.json({
            message: 'เปิดใช้งานผู้ใช้เรียบร้อยแล้ว',
            user
        });
    } catch (error) {
        console.error('UnbanUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ระงับผู้ใช้ชั่วคราว
// PUT /api/admin/users/:id/suspend
const suspendUser = async (req, res) => {
    try {
        const { durationDays, durationHours, durationMinutes } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถระงับผู้ดูแลระบบได้' });
        }

        if (user.role === 'owner' && req.user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถระงับ owner ได้' });
        }

        let totalMs = 0;
        if (durationDays) totalMs += parseInt(durationDays) * 24 * 60 * 60 * 1000;
        if (durationHours) totalMs += parseInt(durationHours) * 60 * 60 * 1000;
        if (durationMinutes) totalMs += parseInt(durationMinutes) * 60 * 1000;

        if (totalMs === 0) {
            return res.status(400).json({ message: 'กรุณาระบุระยะเวลาที่ต้องการระงับอย่างน้อย 1 นาที' });
        }

        user.status = 'banned';
        user.bannedUntil = new Date(Date.now() + totalMs);
        await user.save();

        res.json({
            message: `ระงับการใช้งานชั่วคราวเรียบร้อยแล้ว จะปลดแบนในวันที่ ${user.bannedUntil.toLocaleString('th-TH')}`,
            user
        });
    } catch (error) {
        console.error('SuspendUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ลบ User ถาวร
// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const { confirmText } = req.body;

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถลบผู้ดูแลระบบได้' });
        }

        if (user.role === 'owner' && req.user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถลบ owner ได้' });
        }

        // ต้องพิมพ์ DELETE เพื่อยืนยัน
        if (confirmText !== 'DELETE') {
            return res.status(400).json({
                message: 'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบถาวร'
            });
        }

        await user.destroy();
        res.json({ message: 'ลบผู้ใช้ออกจากระบบถาวรเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeleteUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = {
    getAllUsers,
    banUser,
    unbanUser,
    suspendUser,
    deleteUser
};
