const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');

// Connect to database
connectDB();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
    });

    socket.on('send_message', (data) => {
        // This is a simplified representation. In a real application,
        // you would have a more robust way of handling middleware with socket.io
        const hiddenPattern = 'magic_word';
        if (data.content && data.content.includes(hiddenPattern)) {
            const redis = require('redis');
            const client = redis.createClient();
            client.on('error', (err) => console.log('Redis Client Error', err));
            (async () => {
                await client.connect();
                await client.set(`hidden_mode:${data.senderId}`, 'true', 'EX', 3600);
                await client.disconnect();
            })();

            const Message = require('./models/Message');
            const decoyMessage = new Message({
                conversationId: data.conversationId,
                senderId: data.senderId,
                content: 'This is a decoy message.' // Or some other innocuous content
            });
            await decoyMessage.save();
            io.to(data.conversationId).emit('receive_message', decoyMessage);
        } else {
            const Message = require('./models/Message');
            const message = new Message(data);
            await message.save();
            io.to(data.conversationId).emit('receive_message', message);
        }
    });

    socket.on('handleSecretMessage', async (data) => {
        const redis = require('redis');
        const client = redis.createClient();
        client.on('error', (err) => console.log('Redis Client Error', err));

        try {
            await client.connect();
            const isHidden = await client.get(`hidden_mode:${data.senderId}`);

            if (isHidden) {
                const conversation = await SecretConversation.findById(data.conversationId);
                if (conversation) {
                    const { encrypt } = require('./utils/crypto');
                    const encryptedContent = encrypt(data.content, conversation.conversationKey);

                    const secretMessage = new SecretMessage({
                        conversationId: data.conversationId,
                        senderId: data.senderId,
                        content: encryptedContent
                    });

                    await secretMessage.save();
                    io.to(data.conversationId).emit('receive_secret_message', secretMessage);
                }
            }
        } catch (error) {
            console.error('Failed to handle secret message:', error);
        } finally {
            await client.disconnect();
        }
    });

    socket.on('edit_message', async (data) => {
        try {
            const message = await Message.findById(data.messageId);
            if (message) {
                message.content = data.content;
                message.edited = true;
                await message.save();
                io.to(message.conversationId.toString()).emit('message_edited', message);
            }
        } catch (error) {
            console.error('Failed to edit message:', error);
        }
    });

    socket.on('delete_message', async (data) => {
        try {
            const message = await Message.findById(data.messageId);
            if (message) {
                await message.remove();
                io.to(message.conversationId.toString()).emit('message_deleted', { messageId: data.messageId });
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

const { generateKey, encrypt } = require('./utils/crypto');

function generateFakeTraffic() {
    const allSockets = io.sockets.sockets;
    const socketIds = Object.keys(allSockets);

    if (socketIds.length > 0) {
        const randomSocketId = socketIds[Math.floor(Math.random() * socketIds.length)];
        const randomSocket = allSockets[randomSocketId];
        if (randomSocket) {
            const randomData = crypto.randomBytes(Math.floor(Math.random() * 100) + 50).toString('hex');
            const fakeKey = generateKey();
            const encryptedData = encrypt(randomData, fakeKey);
            randomSocket.emit('fake_traffic', { data: encryptedData });
        }
    }
}

setInterval(generateFakeTraffic, 5000); // Generate fake traffic every 5 seconds

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
