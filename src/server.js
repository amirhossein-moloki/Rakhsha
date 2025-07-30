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

// Make io accessible to our router
app.set('socketio', io);

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

const redis = require('redis');

// Create a reusable Redis client
const redisClient = redis.createClient({
    // Assuming Redis is running on localhost:6379.
    // In a real production environment, this would come from env variables.
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

/**
 * Generates and sends decoy traffic to users who have hidden mode enabled.
 * This function is called periodically by setInterval.
 */
async function generateFakeTraffic() {
    const allSockets = io.sockets.sockets;

    // Iterate over each connected socket
    for (const [, socket] of allSockets.entries()) {
        if (socket.userId) {
            try {
                const isHidden = await redisClient.get(`hidden_mode:${socket.userId}`);
                if (isHidden === 'true') {
                    // This user is in hidden mode. Send them some decoy traffic.
                    const randomData = crypto.randomBytes(Math.floor(Math.random() * 100) + 50).toString('hex');
                    const fakeKey = generateSymmetricKey();
                    const encryptedData = encryptSymmetric(randomData, fakeKey);

                    // Add a small, random delay to make the traffic pattern less predictable
                    const delay = Math.random() * 2500; // 0 to 2.5 seconds
                    setTimeout(() => {
                         socket.emit('fake_traffic', { data: encryptedData });
                    }, delay);
                }
            } catch (err) {
                // Log the error but don't crash the loop
                console.error('Redis error in generateFakeTraffic:', err);
            }
        }
    }
}

const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'test') {
    // Ensure the uploads directory exists before starting the server
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory.');
    }

    connectDB();

    // Periodically check which users need decoy traffic
    setInterval(generateFakeTraffic, 5000);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = { app, server, io };
