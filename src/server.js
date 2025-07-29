const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');
const { generateSymmetricKey, encryptSymmetric } = require('./utils/crypto');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
    });

    socket.on('send_message', async (data) => {
        const { conversationId, senderId, content } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            // Handle error: conversation not found
            return;
        }

        const encrypted_content = encryptSymmetric(content, conversation.conversationKey);

        const message = new Message({
            conversationId,
            senderId,
            encrypted_content
        });
        await message.save();

        // For consistency with getMessages, we can send back the decrypted message
        const messageData = message.toObject();
        messageData.content = content;
        delete messageData.encrypted_content;

        io.to(conversationId).emit('receive_message', messageData);
    });

    socket.on('edit_message', async (data) => {
        try {
            const message = await Message.findById(data.messageId);
            if (message) {
                const conversation = await Conversation.findById(message.conversationId);
                if (conversation) {
                    message.encrypted_content = encryptSymmetric(data.content, conversation.conversationKey);
                    message.edited = true;
                    await message.save();

                    const messageData = message.toObject();
                    messageData.content = data.content;
                    delete messageData.encrypted_content;

                    io.to(message.conversationId.toString()).emit('message_edited', messageData);
                }
            }
        } catch (error) {
            console.error('Failed to edit message:', error);
        }
    });

    socket.on('delete_message', async (data) => {
        try {
            const message = await Message.findById(data.messageId);
            if (message) {
                const conversationId = message.conversationId.toString();
                await message.deleteOne();
                io.to(conversationId).emit('message_deleted', { messageId: data.messageId });
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    });

    socket.on('go_online', (userId) => {
        onlineUsers[userId] = true;
        socket.userId = userId;
        io.emit('user_online', userId);
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            delete onlineUsers[socket.userId];
            io.emit('user_offline', socket.userId);
        }
        console.log('user disconnected');
    });
});

function generateFakeTraffic() {
    const allSockets = io.sockets.sockets;
    const socketIds = Array.from(allSockets.keys());

    if (socketIds.length > 0) {
        const randomSocketId = socketIds[Math.floor(Math.random() * socketIds.length)];
        const randomSocket = allSockets.get(randomSocketId);
        if (randomSocket) {
            const randomData = crypto.randomBytes(Math.floor(Math.random() * 100) + 50).toString('hex');
            const fakeKey = generateSymmetricKey();
            const encryptedData = encryptSymmetric(randomData, fakeKey);
            randomSocket.emit('fake_traffic', { data: encryptedData });
        }
    }
}

if (process.env.NODE_ENV !== 'test') {
    connectDB();
    setInterval(generateFakeTraffic, 5000); // Generate fake traffic every 5 seconds

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = { app, server, io };
