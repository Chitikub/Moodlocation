const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Announcement = sequelize.define('Announcement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณาระบุหัวข้อประกาศ' }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    shortContent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fullContent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    coverImage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    contentBlocks: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    layout: {
        type: DataTypes.STRING,
        defaultValue: 'image-top'
    }
}, {
    tableName: 'announcements',
    timestamps: true
});

module.exports = Announcement;
