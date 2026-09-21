const { ChatRoom, ChatMessage, User } = require("../models");
const { getReceiverSocketId, io } = require("../lib/socket");
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");

// เก็บ Timer ของแต่ละห้องแชตไว้ใน Memory
const roomTimers = new Map();

// For Users: Create or get an open support room (User clicks "Contact")
exports.createOrGetContactRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, detail } = req.body;

    let room = await ChatRoom.findOne({
      where: { userId, status: "open" },
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
    });

    if (!room) {
      room = await ChatRoom.create({
        userId,
        status: "open",
        topic: topic || "ไม่มีหัวข้อ",
        detail: detail || "",
      });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in createOrGetContactRoom: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// For Admin: Get all contact rooms (View all contacts)
exports.getAllContactRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
        {
          model: User,
          as: "admin",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error in getAllContactRooms: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a specific room
exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.findAll({
      where: { roomId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getRoomMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to a room
exports.sendMessageToRoom = async (req, res) => {
  try {
    const { text, image, topic, detail } = req.body;
    const { roomId } = req.params;
    const senderId = req.user.id;

    let room = await ChatRoom.findByPk(roomId);

    // If room doesn't exist or is closed
    if (!room || room.status === "closed") {
      if (req.user.role !== "admin" && req.user.role !== "owner") {
        // For users, find or create an open room
        room = await ChatRoom.findOne({
          where: { userId: senderId, status: "open" },
        });

        if (!room) {
          room = await ChatRoom.create({
            userId: senderId,
            status: "open",
            topic: topic || "ไม่มีหัวข้อ",
            detail: detail || "",
          });
        }
      } else {
        return res.status(400).json({
          error: "Cannot send message to a closed or non-existent room",
        });
      }
    }

    // If an admin or owner sends the first message, assign them to the room
    if (
      (req.user.role === "admin" || req.user.role === "owner") &&
      room.adminId === null
    ) {
      room.adminId = senderId;
      await room.save();
    }

    let imageUrl = null;
    if (image) {
      const bucketName = process.env.SUPABASE_BUCKET || "uploads";
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      let contentType = "image/jpeg";
      if (matches && matches.length === 3) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(image, "base64");
      }
      const fileExt = contentType.split("/")[1] || "jpg";
      const fileName = `chat_images/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, { contentType, upsert: true });

      if (error) {
        return res
          .status(500)
          .json({ error: "Failed to upload image to Supabase" });
      }
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    // Determine the receiver (if known)
    let receiverId = null;
    if (senderId === room.userId) {
      receiverId = room.adminId; // null if unassigned
    } else if (senderId === room.adminId) {
      receiverId = room.userId;
    }

    const newMessage = await ChatMessage.create({
      senderId,
      receiverId,
      roomId: room.id,
      text,
      image: imageUrl,
    });

    const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
    });

    room.lastMessage = text || "Image";
    room.lastMessageAt = new Date();
    await room.save();

    // แจ้งทุกคนในห้องให้รู้ว่ามีข้อความใหม่
    io.to(String(room.id)).emit("receive_message", messageWithSender);

    // Realtime Event Emission
    // If receiverId is known and they are online
    if (receiverId) {
      const receiverSocketId = await getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newRoomMessage", messageWithSender);
      }
    } else if (senderId === room.userId) {
      // Emitting to general new ticket channel for admins
      io.emit("newContactRequest", { room, message: messageWithSender });
    }

    // --- ⏳ ตั้งค่า Timer 15 นาที (Reset ทุกครั้งที่มีการส่งข้อความ) ---
    if (roomTimers.has(String(room.id))) {
      clearTimeout(roomTimers.get(String(room.id)));
    }

    const newTimer = setTimeout(
      async () => {
        try {
          const targetRoom = await ChatRoom.findByPk(room.id);
          if (targetRoom) {
            await ChatMessage.destroy({ where: { roomId: room.id } });
            await targetRoom.destroy();

            // แจ้งเตือนคนในห้องว่าห้องถูกลบแล้ว
            io.to(String(room.id)).emit("room_deleted", { roomId: room.id });
            console.log(
              `⏳ Room ${room.id} automatically deleted due to 15-minute inactivity.`,
            );
          }
        } catch (err) {
          console.error("Timer error deleting room:", err);
        }
        roomTimers.delete(String(room.id));
      },
      15 * 60 * 1000,
    ); // 15 นาที = 900,000 ms

    roomTimers.set(String(room.id), newTimer);
    // -------------------------------------------------------------------

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error("Error in sendMessageToRoom: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin closes room
exports.closeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await ChatRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    room.status = "closed";
    await room.save();

    // เคลียร์ timer ถ้ามี
    if (roomTimers.has(String(roomId))) {
      clearTimeout(roomTimers.get(String(roomId)));
      roomTimers.delete(String(roomId));
    }

    // ส่ง socket event บอกการอัปเดตสถานะห้อง
    io.to(String(roomId)).emit("room_status_updated", {
      roomId,
      status: "closed",
    });

    res.status(200).json({ message: "Room closed successfully", room });
  } catch (error) {
    console.error("Error in closeRoom: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin updates room status (e.g., to closed/open)
exports.updateRoomStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.body;

    if (!status || !["open", "closed"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status value. Must be 'open' or 'closed'" });
    }

    const room = await ChatRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    room.status = status;
    await room.save();

    // เคลียร์ timer ถ้า status เป็น closed
    if (status === "closed" && roomTimers.has(String(roomId))) {
      clearTimeout(roomTimers.get(String(roomId)));
      roomTimers.delete(String(roomId));
    }

    // ส่ง socket event บอกการอัปเดตสถานะห้อง
    io.to(String(roomId)).emit("room_status_updated", { roomId, status });

    res
      .status(200)
      .json({ message: `Room status updated to ${status} successfully`, room });
  } catch (error) {
    console.error("Error in updateRoomStatus: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin deletes room
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await ChatRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    await ChatMessage.destroy({ where: { roomId } });
    await room.destroy();

    // เคลียร์ timer ถ้ามี
    if (roomTimers.has(String(roomId))) {
      clearTimeout(roomTimers.get(String(roomId)));
      roomTimers.delete(String(roomId));
    }

    io.to(String(roomId)).emit("room_deleted", { roomId });

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error in deleteRoom: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
