const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateSymmetricKey, encryptSymmetric } = require('./utils/crypto');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server();

io.attach(server);

// Make io accessible to our router
app.set('socketio', io);

const onlineUsers = {};

// WebSocket Authentication Middleware
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // We need the full user object with conversations to perform auth checks
        const user = await User.findById(decoded.userId).select('conversations');
        if (!user) {
            return next(new Error('Authentication error: User not found.'));
        }
        socket.user = user; // Attach full user object
        socket.userId = user._id.toString(); // Keep userId for convenience
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token.'));
    }
});

io.on('connection', (socket) => {
    console.log('a user connected:', socket.userId);

    // Set user online status immediately after authenticated connection.
    onlineUsers[socket.userId] = true;
    io.emit('user_online', socket.userId);

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
        // Authorization check: Only allow joining conversations they are part of.
        if (socket.user.conversations.map(c => c.toString()).includes(conversationId)) {
            socket.join(conversationId);
        } else {
            console.log(`SECURITY: User ${socket.userId} tried to join unauthorized conversation ${conversationId}`);
        }
    });

    socket.on('send_message', async (data) => {
        // **SECURITY FIX**: Remove senderId from client data, use authenticated userId.
        const { conversationId, recipientId, content } = data;
        const senderId = socket.userId;

        // **SECURITY FIX**: Authorization check - User must be a participant of the conversation.
        const conversation = await Conversation.findOne({ _id: conversationId, participants: senderId }).select('+conversationKey');
        if (!conversation) {
            console.log(`SECURITY: User ${senderId} is not a participant of conversation ${conversationId} or it does not exist.`);
            return;
        }

        const encrypted_content = encryptSymmetric(content, conversation.conversationKey);

        const message = new Message({
            conversationId,
            // The senderId is NOT saved in the database to adhere to the "Sealed Sender" protocol.
            recipientId,
            ciphertextPayload: encrypted_content,
        });
        await message.save();

        const messageData = message.toObject();
        messageData.content = content;
        // Add the senderId ONLY for the broadcast, so clients know who sent it.
        messageData.senderId = senderId;
        delete messageData.encrypted_content;

        io.to(conversationId).emit('receive_message', messageData);
    });

    socket.on('edit_message', async (data) => {
        try {
            const { messageId, content } = data;
            const message = await Message.findById(messageId);
            if (!message) return;

            // **SECURITY FIX**: Authorization check
            const conversation = await Conversation.findOne({ _id: message.conversationId, participants: socket.userId }).select('+conversationKey');
            if (!conversation) {
                 console.log(`SECURITY: User ${socket.userId} tried to edit a message in a conversation they are not part of.`);
                 return;
            }

            message.ciphertextPayload = encryptSymmetric(content, conversation.conversationKey);
            message.edited = true;
            await message.save();

            const messageData = message.toObject();
            messageData.content = data.content;
            delete messageData.encrypted_content;

            io.to(message.conversationId.toString()).emit('message_edited', messageData);

        } catch (error) {
            console.error('Failed to edit message:', error);
        }
    });

    socket.on('delete_message', async (data) => {
        try {
            const { messageId } = data;
            const message = await Message.findById(messageId);
            if (!message) return;

            // **SECURITY FIX**: Authorization check
            const conversation = await Conversation.findOne({ _id: message.conversationId, participants: socket.userId });
             if (!conversation) {
                 console.log(`SECURITY: User ${socket.userId} tried to delete a message in a conversation they are not part of.`);
                 return;
            }

            const conversationId = message.conversationId.toString();
            await message.deleteOne();
            io.to(conversationId).emit('message_deleted', { messageId });

        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    });

    // **SECURITY FIX**: The insecure 'go_online' event handler has been removed.

    socket.on('disconnect', () => {
        // Clear the padding timeout timer to prevent memory leaks
        if (socket.paddingTimeout) {
            clearTimeout(socket.paddingTimeout);
        }

        if (socket.userId) {
            delete onlineUsers[socket.userId];
            io.emit('user_offline', socket.userId);
        }
        console.log('user disconnected:', socket.userId);
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
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.connect();
}

// Define constants for constant-rate cover traffic
const PADDING_SIZE = 1024; // 1 KB
const PADDING_INTERVAL = 500; // 0.5 seconds

/**
 * Sends fixed-size padding packets to all connected clients at a constant rate.
 * This creates a uniform stream of traffic to obfuscate real user activity.
 */
function sendPaddingTraffic() {
    const allSockets = io.sockets.sockets;

    const paddingData = crypto.randomBytes(PADDING_SIZE);
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

    // Start sending padding traffic at a fixed interval
    setInterval(sendPaddingTraffic, PADDING_INTERVAL);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = { app, server, io };
