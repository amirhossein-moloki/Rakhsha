const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");

// Connect to database
connectDB();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

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

    socket.on('send_secret_message', (data) => {
        const redis = require('redis');
        const client = redis.createClient();
        client.on('error', (err) => console.log('Redis Client Error', err));
        (async () => {
            await client.connect();
            const isHidden = await client.get(`hidden_mode:${data.senderId}`);
            await client.disconnect();
            if (isHidden) {
                // In a real application, you would save this to the secret DB
                console.log('Received secret message:', data);
                io.to(data.conversationId).emit('receive_secret_message', data);
            }
        })();
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function generateFakeTraffic() {
    // This is a simplified representation. In a real application,
    // this would be more sophisticated.
    const allSockets = io.sockets.sockets;
    const socketIds = Object.keys(allSockets);

    if (socketIds.length > 0) {
        const randomSocketId = socketIds[Math.floor(Math.random() * socketIds.length)];
        const randomSocket = allSockets[randomSocketId];
        if(randomSocket) {
            randomSocket.emit('fake_traffic', { data: 'some_encrypted_dummy_data' });
        }
    }
}

setInterval(generateFakeTraffic, 5000); // Generate fake traffic every 5 seconds

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
