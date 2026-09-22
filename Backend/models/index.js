const { sequelize } = require('../config/db');
const User = require('./User');
const Favorite = require('./Favorite');
const History = require('./History');
const ChatMessage = require('./ChatMessage');
const ChatRoom = require('./ChatRoom');
const Announcement = require('./Announcement');

// ========== Associations ==========

// User -> Favorites
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> History
User.hasMany(History, { foreignKey: 'userId', as: 'histories' });
History.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ========== Chat Associations ==========

// User -> ChatMessages (sender)
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User -> ChatMessages (receiver)
User.hasMany(ChatMessage, { foreignKey: 'receiverId', as: 'receivedMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// User -> ChatRooms (User)
User.hasMany(ChatRoom, { foreignKey: 'userId', as: 'userRooms' });
ChatRoom.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> ChatRooms (Admin)
User.hasMany(ChatRoom, { foreignKey: 'adminId', as: 'adminRooms' });
ChatRoom.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

// ChatRoom -> ChatMessages
ChatRoom.hasMany(ChatMessage, { foreignKey: 'roomId', as: 'messages' });
ChatMessage.belongsTo(ChatRoom, { foreignKey: 'roomId', as: 'room' });

module.exports = {
    sequelize,
    User,
    Favorite,
    History,
    ChatMessage,
    ChatRoom,
    Announcement
};
