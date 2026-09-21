const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Favorite = sequelize.define('Favorite', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    placeId: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }, // 🌟 เปลี่ยนเป็น STRING
    placeName: { 
        type: DataTypes.STRING 
    }, // 🌟 เก็บชื่อร้านไว้โชว์หน้า List
    placeImage: { 
        type: DataTypes.TEXT 
    }   // 🌟 เก็บ Reference รูปไว้โชว์หน้า List
}, {
    tableName: 'favorites',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'placeId']
        }
    ]
});

module.exports = Favorite;
