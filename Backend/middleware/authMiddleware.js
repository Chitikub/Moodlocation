const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect routes - ตรวจสอบ JWT Token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findByPk(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'ไม่พบผู้ใช้งาน' });
            }

            if (user.status === 'banned') {
                return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน' });
            }

            // ตรวจสอบว่าเป็น Token ล่าสุดหรือไม่ (Single Session)
            if (user.sessionToken && user.sessionToken !== token) {
                return res.status(401).json({ message: 'บัญชีนี้มีการเข้าสู่ระบบจากอุปกรณ์อื่น กรุณาเข้าสู่ระบบใหม่' });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    }
};

// Admin / Owner only middleware
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) {
        next();
    } else {
        return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบหรือเจ้าของระบบเท่านั้น' });
    }
};

module.exports = { protect, adminOnly };
