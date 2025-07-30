const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');
const { generateSymmetricKey, encryptSymmetric } = require('./utils/crypto');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const Session = require('./models/Session');

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
        const { conversationId, recipientId, encryptedSenderId, content, senderId_for_auth } = data;

        // The senderId_for_auth is a concession for session key retrieval.
        // In a true sealed sender model, the session key might be derived differently.
        const session = await Session.findOne({ conversationId, userId: senderId_for_auth });
        if (!session) {
            socket.emit('error', { message: 'No active session. Cannot send message.' });
            return;
        }

        const encrypted_content = encryptSymmetric(content, session.sessionKey);

        const redis = require('redis');
        const client = redis.createClient();
        await client.connect();
        const hiddenMode = await client.get(`hidden_mode:${senderId_for_auth}`);
        await client.disconnect();

        const message = new Message({
            conversationId,
            recipientId,
            encryptedSenderId,
            encrypted_content,
            hidden: hiddenMode === 'true'
        });
        await message.save();

        // The message is broadcast, but only the intended recipient can decrypt the sender.
        io.to(conversationId).emit('receive_message', message.toObject());
    });

    socket.on('edit_message', async (data) => {
        try {
            const { messageId, content, userId } = data; // userId is the plaintext user for auth
            const message = await Message.findById(messageId);
            if (!message) return;

            // This is tricky. The server doesn't know the sender.
            // The client would have to provide proof of ownership.
            // For now, we'll trust the client and assume the check happens on the client-side
            // before sending the event. This is NOT secure for a real app.
            // A better way would be to sign the request.

            const session = await Session.findOne({ conversationId: message.conversationId, userId });
            if (!session) {
                socket.emit('error', { message: 'No active session. Cannot edit message.' });
                return;
            }

            message.encrypted_content = encryptSymmetric(content, session.sessionKey);
            message.edited = true;
            await message.save();

            io.to(message.conversationId.toString()).emit('message_edited', message.toObject());
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

    socket.on('message_read', async (data) => {
        const { messageId, userId } = data; // userId is the person who read the message
        const message = await Message.findById(messageId).populate('senderId');
        if (!message) return;

        const redis = require('redis');
        const client = redis.createClient();
        await client.connect();

        try {
            // Check if the recipient (the person who just read the message) is in hidden mode.
            const hiddenMode = await client.get(`hidden_mode:${userId}`);
            if (hiddenMode === 'true') {
                // If the reader is in hidden mode, do not update the read receipt.
                // Optionally, inform the reader's client that the receipt was suppressed.
                socket.emit('receipt_suppressed', { messageId });
                return;
            }

            // Also check if the sender wishes to not receive read receipts (optional feature)
            // For now, we only care about the reader's status.

            if (!message.readBy.includes(userId)) {
                message.readBy.push(userId);
                await message.save();
                // Notify the conversation that the message has been read.
                // Specifically, notify the sender.
                io.to(message.conversationId.toString()).emit('message_updated', message.toObject());
            }
        } catch (error) {
            console.error('Failed to process read receipt:', error);
        } finally {
            await client.disconnect();
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
