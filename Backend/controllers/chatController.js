const { ChatMessage, User } = require('../models');
const { getReceiverSocketId, io } = require('../lib/socket');
const { Op } = require('sequelize');

const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

exports.getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user.id; // From middleware

        // ดึงรายชื่อ user ทั้งหมด ยกเว้นตัวเอง และไม่รวม password
        const filteredUsers = await User.findAll({
            where: {
                id: { [Op.ne]: loggedInUserId }
            },
            attributes: { exclude: ['password'] }
        });

        const usersWithDetails = await Promise.all(
            filteredUsers.map(async (user) => {
                const userJSON = user.toJSON();
                // Find latest message between these two users
                const latestMessage = await ChatMessage.findOne({
                    where: {
                        [Op.or]: [
                            { senderId: loggedInUserId, receiverId: user.id },
                            { senderId: user.id, receiverId: loggedInUserId }
                        ]
                    },
                    order: [['createdAt', 'DESC']]
                });

                const unreadCount = await ChatMessage.count({
                    where: {
                        senderId: user.id,
                        receiverId: loggedInUserId,
                        isRead: false
                    }
                });

                return {
                    ...userJSON,
                    latestMessage,
                    unreadCount
                };
            })
        );

        // Sort users by latest message (descending)
        usersWithDetails.sort((a, b) => {
            const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
            const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.status(200).json(usersWithDetails);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user.id;

        const messages = await ChatMessage.findAll({
            where: {
                [Op.or]: [
                    { senderId: myId, receiverId: userToChatId },
                    { senderId: userToChatId, receiverId: myId }
                ]
            },
            include: [
                { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'profileImage'] }
            ],
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user.id;

        let imageUrl = null;
        if (image) {
            const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
            // Upload base64 image to Supabase
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            let buffer;
            let contentType = 'image/jpeg';
            if (matches && matches.length === 3) {
                contentType = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
            } else {
                buffer = Buffer.from(image, 'base64');
            }
            
            const fileExt = contentType.split('/')[1] || 'jpg';
            const fileName = `chat_images/${uuidv4()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
              .from(bucketName)
              .upload(fileName, buffer, {
                contentType: contentType,
                upsert: true
              });
              
            if (error) {
                console.error("Supabase upload error:", error);
                return res.status(500).json({ error: "Failed to upload image to Supabase" });
            }
            
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);
              
            imageUrl = urlData.publicUrl;
        }

        const newMessage = await ChatMessage.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
            include: [
                { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'profileImage'] }
            ]
        });

        // realtime functionality => socket.io
        const receiverSocketId = await getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", messageWithSender);
        }

        const senderSocketId = await getReceiverSocketId(senderId);
        if (senderSocketId && receiverSocketId !== senderSocketId) {
            io.to(senderSocketId).emit("newMessage", messageWithSender);
        }

        res.status(201).json(messageWithSender);
    } catch (error) {
        console.error("Error in sendMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const myId = req.user.id;

        await ChatMessage.update(
            { isRead: true },
            {
                where: {
                    senderId: senderId,
                    receiverId: myId,
                    isRead: false
                }
            }
        );

        const senderSocketId = await getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", { readerId: myId });
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markMessagesAsRead: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
