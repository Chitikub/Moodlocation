const { User } = require('../models');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// ========== แก้ไขโปรไฟล์ ==========
// PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        const { firstName, lastName, gender } = req.body;

        // อัปเดตข้อมูล
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (gender) user.gender = gender;

        // อัปเดตรูปโปรไฟล์
        if (req.file) {
            if (!supabase) {
                console.error("Supabase is not initialized. Please check your environment variables.");
                return res.status(500).json({ message: 'ระบบจัดเก็บไฟล์ยังไม่ได้ตั้งค่า (Supabase is null)' });
            }

            const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
            // ใช้ชื่อไฟล์ต้นฉบับพร้อมเพิ่ม timestamp เล็กน้อยเพื่อให้ยังจำได้ว่ามาจากไฟล์ไหน
            // และป้องกันชื่อซ้ำเมื่อมีคนอัปโหลดชื่อไฟล์เดียวกัน
            const ext = path.extname(req.file.originalname);
            const originalName = path.basename(req.file.originalname, ext)
                .replace(/[^a-zA-Z0-9-_\.]/g, '_');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `profile_images/${originalName}_${timestamp}${ext}`;
            const fileBuffer = req.file.buffer;
            
            // อัปโหลดไฟล์ไปยัง Supabase
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: req.file.mimetype || 'image/jpeg',
                    upsert: true
                });

            if (error) {
                console.error("Supabase upload error:", error);
                return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
            }

            // รับ URL จาก Supabase
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            const newImageUrl = urlData.publicUrl;

            // ลบรูปเก่า (ถ้ามี)
            if (user.profileImage) {
                try {
                    if (user.profileImage.includes('supabase.co')) {
                        // พยายามแยกว่าไฟล์เก็บอยู่ที่ไหน (profile_images/...)
                        const urlObj = new URL(user.profileImage);
                        const pathParts = urlObj.pathname.split('/');
                        const bucketIndex = pathParts.indexOf(bucketName);
                        if (bucketIndex !== -1) {
                            const oldFilePath = pathParts.slice(bucketIndex + 1).join('/');
                            await supabase.storage.from(bucketName).remove([oldFilePath]);
                        }
                    }
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }

            user.profileImage = newImageUrl;
        }

        await user.save();

        res.json({
            message: 'อัปเดตโปรไฟล์สำเร็จ',
            user
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('UpdateProfile error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== เปลี่ยนรหัสผ่าน ==========
// PUT /api/users/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const user = await User.findByPk(req.user.id);
        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('ChangePassword error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { updateProfile, changePassword };
