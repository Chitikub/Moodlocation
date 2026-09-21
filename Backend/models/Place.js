const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Place = sequelize.define('Place', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกชื่อสถานที่' }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณาระบุหมวดหมู่' }
        }
    },
    moods: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    personality: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    googleMapsUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'places',
    timestamps: true
});

module.exports = Place;
