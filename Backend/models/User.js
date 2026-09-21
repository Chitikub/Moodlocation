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
            notEmpty: { msg: 'กรุณากรอกชื่อ' }
        }
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกนามสกุล' }
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
            validateEmailFormat(value) {
                // เช็คว่ามีข้อความ @ ข้อความ . ข้อความ ตามที่ต้องการ
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    throw new Error('รูปแบบอีเมลไม่ถูกต้อง ต้องมี @ และ . (เช่น user@example.com)');
                }
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: {
                args: [6, 255],
                msg: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            }
        }
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
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
    return await bcrypt.compare(enteredPassword, this.password);
};

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
};

module.exports = User;
