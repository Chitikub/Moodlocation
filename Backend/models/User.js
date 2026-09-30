const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');


const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกชื่อ' },
            len: {
                args: [1, 150],
                msg: 'ชื่อต้องมีความยาวไม่เกิน 150 ตัวอักษร'
            }
        }
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            notEmpty: { msg: 'กรุณากรอกนามสกุล' },
            len: {
                args: [1, 150],
                msg: 'นามสกุลต้องมีความยาวไม่เกิน 150 ตัวอักษร'
            }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: 'อีเมลนี้ถูกใช้งานแล้ว'
        },
        validate: {
            isEmail: { msg: 'รูปแบบอีเมลไม่ถูกต้อง' },
            len: {
                args: [1, 150],
                msg: 'อีเมลต้องมีความยาวไม่เกิน 150 ตัวอักษร'
            },
            validateEmailFormat(value) {
                const email = String(value || '').trim();
                const domain = email.split('@')[1]?.toLowerCase();
                const allowedDomains = ['gmail.com', 'webmail.npru.ac.th'];

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    throw new Error('รูปแบบอีเมลไม่ถูกต้อง ต้องมี @ และ . (เช่น user@gmail.com)');
                }

                if (!domain || !allowedDomains.includes(domain)) {
                    throw new Error('อีเมลต้องเป็น gmail.com หรือ webmail.npru.ac.th เท่านั้น');
                }
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: {
                args: [6, 255],
                msg: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            }
        }
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    role: {
        type: DataTypes.ENUM('user', 'admin', 'owner'),
        defaultValue: 'user'
    },
    profileImage: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    status: {
        type: DataTypes.ENUM('active', 'banned'),
        defaultValue: 'active'
    },
    bannedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    sessionToken: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.matchPassword = async function (enteredPassword) {
    if (!enteredPassword || !this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
};

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    values.hasPassword = Boolean(values.password);
    delete values.password;
    delete values.googleId;
    return values;
};

module.exports = User;
