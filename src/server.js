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

    // Start a timer to disconnect the client if they don't send padding
    const setPaddingTimeout = () => {
        // Clear any existing timer
        if (socket.paddingTimeout) {
            clearTimeout(socket.paddingTimeout);
        }

        // Set a new timer
        socket.paddingTimeout = setTimeout(() => {
            // Disconnect the client if they fail to send padding in time
            console.log(`Disconnecting client ${socket.id} for not sending cover traffic.`);
            socket.disconnect(true);
        }, 5000); // 5-second timeout
    };

    // Set the initial timer when the client connects
    setPaddingTimeout();

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
        // Clear the padding timeout timer to prevent memory leaks
        if (socket.paddingTimeout) {
            clearTimeout(socket.paddingTimeout);
        }

        if (socket.userId) {
            delete onlineUsers[socket.userId];
            io.emit('user_offline', socket.userId);
        }
        console.log('user disconnected');
    });

    // Handle client-side padding traffic
    socket.on('client_padding', (data) => {
        // The client has sent cover traffic. Reset the disconnect timer.
        setPaddingTimeout();
    });
});

const redis = require('redis');

let redisClient;

if (process.env.NODE_ENV !== 'test') {
    // Create a reusable Redis client
    redisClient = redis.createClient({
        // Assuming Redis is running on localhost:6379.
        // In a real production environment, this would come from env variables.
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.connect();
}

const PADDING_PACKET_SIZE = 1024; // 1 KB
const PADDING_INTERVAL = 1000; // 1 second

/**
 * Sends fixed-size padding packets to all connected clients at a regular interval.
 * This creates a constant stream of traffic to obfuscate real user activity.
 */
function sendPaddingTraffic() {
    const allSockets = io.sockets.sockets;

    const paddingData = crypto.randomBytes(PADDING_PACKET_SIZE);
    const fakeKey = generateSymmetricKey(); // Use a new dummy key for each broadcast
    const encryptedPadding = encryptSymmetric(paddingData.toString('hex'), fakeKey);

    // Iterate over each connected socket and send the padding packet
    for (const [, socket] of allSockets.entries()) {
        if (socket.userId) { // Ensure the user is authenticated and has a userId associated
            socket.emit('padding_traffic', { data: encryptedPadding });
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

    // Periodically send padding traffic to all clients
    const paddingInterval = setInterval(sendPaddingTraffic, PADDING_INTERVAL);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = { app, server, io, paddingInterval };
