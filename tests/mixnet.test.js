const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Node = require('../src/models/Node');
const { encryptHybrid } = require('../src/utils/crypto');
const axios = require('axios');

jest.mock('axios');

describe('Mix Network E2E Tests', () => {
    const { setup, teardown, createTestUser } = require('./setup');
    let user1, user2;
    let conversation;
    let node1, node2;

    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Node.deleteMany({});

        user1 = createTestUser('user1', 'password');
        user2 = createTestUser('user2', 'password');
        await user1.save();
        await user2.save();

        conversation = new Conversation({
            type: 'private',
            participantIds: [user1._id, user2._id],
            encryptedMetadata: 'test-metadata',
            createdAt: new Date().toISOString()
        });
        await conversation.save();

        user1.conversations.push(conversation._id);
        await user1.save();

        // Create and register mock nodes
        node1 = new Node({
            nodeId: 'node1',
            address: 'http://node1.test.com',
            publicKey: process.env.SERVER_PUBLIC_KEY // For simplicity, we'll use the server's key for all nodes
        });
        node2 = new Node({
            nodeId: 'node2',
            address: 'http://node2.test.com',
            publicKey: process.env.SERVER_PUBLIC_KEY
        });
        await node1.save();
        await node2.save();
    });

    it('should route a message through a multi-node path', async () => {
        // 1. Construct the final message payload
        const messagePayload = {
            conversationId: conversation._id.toString(),
            recipientId: user2._id.toString(),
            messageType: 'text',
            ciphertextPayload: 'encrypted-message-text',
            encryptedTimestamp: new Date().toISOString()
        };

        // 2. Create the onion using hybrid encryption
        // Layer 3 (for the final destination - our server)
        let finalPayload = JSON.stringify({
            nextNodeAddress: 'self',
            remainingPayload: JSON.stringify(messagePayload)
        });
        let onionLayer3 = encryptHybrid(finalPayload, process.env.SERVER_PUBLIC_KEY);

        // Layer 2 (for node2)
        let onionLayer2Payload = JSON.stringify({
            nextNodeAddress: process.env.SERVER_ADDRESS, // The final destination
            remainingPayload: onionLayer3
        });
        let onionLayer2 = encryptHybrid(onionLayer2Payload, node2.publicKey);

        // Layer 1 (for our server, acting as the first node)
        let onionLayer1Payload = JSON.stringify({
            nextNodeAddress: node2.address,
            remainingPayload: onionLayer2
        });
        let onionLayer1 = encryptHybrid(onionLayer1Payload, process.env.SERVER_PUBLIC_KEY);

        // 3. Mock the axios post calls
        axios.post.mockResolvedValue({ status: 200, data: { message: 'Message forwarded.' } });

        // 4. Send the message to our server (the first node)
        const res = await request(app)
            .post('/api/messages/route')
            .send({ onionPayload: onionLayer1 });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Message forwarded.');

        // 5. Verify that our server correctly decrypted its layer and forwarded to node2
        expect(axios.post).toHaveBeenCalledWith(
            node2.address + '/api/messages/route',
            { onionPayload: onionLayer2 }
        );
    });
});
