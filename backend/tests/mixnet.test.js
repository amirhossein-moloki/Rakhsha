const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Node = require('../src/models/Node');
const { encryptHybrid, sign } = require('../src/utils/crypto');
const axios = require('axios');

jest.mock('axios');

const testPublicKey = fs.readFileSync(path.join(__dirname, '..', 'test_public.pem'), 'utf-8');
const testPrivateKey = fs.readFileSync(path.join(__dirname, '..', 'test_private.pem'), 'utf-8');

process.env.SERVER_PRIVATE_KEY = testPrivateKey;
process.env.SERVER_ADDRESS = 'http://final.destination.com';


describe('Mix Network E2E Tests', () => {
    const { setup, teardown, createTestUser, padRequest } = require('./setup');
    let user1, user2;
    let conversation;
    let node1, node2;

    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Node.deleteMany({});

        user1 = await createTestUser('user1', 'password');
        user2 = await createTestUser('user2', 'password');
        await user1.save();
        await user2.save();

        conversation = new Conversation({
            type: 'private',
            encryptedMetadata: 'test-metadata',
            createdAt: new Date().toISOString()
        });
        await conversation.save();

        user1.conversations.push(conversation._id);
        user1.identityKey = testPublicKey; // Use a known identity key for signing
        await user1.save();

        node1 = new Node({
            nodeId: 'node1',
            address: 'http://node1.test.com',
            publicKey: testPublicKey
        });
        node2 = new Node({
            nodeId: 'node2',
            address: 'http://node2.test.com',
            publicKey: testPublicKey
        });
        await node1.save();
        await node2.save();
    });

    it('should route a message through a multi-node path', async () => {
        const messageData = {
            conversationId: conversation._id.toString(),
            recipientId: user2._id.toString(),
            messageType: 'text',
            ciphertextPayload: 'encrypted-message-text',
        };

        const signature = sign(JSON.stringify(messageData), testPrivateKey);
        const signedMessage = JSON.stringify({ messageData, signature });

        const finalPayload = JSON.stringify({
            signedMessage: signedMessage,
            senderIdentityKey: user1.identityKey
        });

        let onionLayer3Payload = JSON.stringify({
            nextNodeAddress: 'self',
            remainingPayload: finalPayload
        });
        let onionLayer3 = encryptHybrid(onionLayer3Payload, testPublicKey);

        let onionLayer2Payload = JSON.stringify({
            nextNodeAddress: process.env.SERVER_ADDRESS,
            remainingPayload: onionLayer3
        });
        let onionLayer2 = encryptHybrid(onionLayer2Payload, node2.publicKey);

        let onionLayer1Payload = JSON.stringify({
            nextNodeAddress: node2.address,
            remainingPayload: onionLayer2
        });
        let onionLayer1 = encryptHybrid(onionLayer1Payload, testPublicKey);

        axios.post.mockResolvedValue({ status: 200, data: { message: 'Message forwarded.' } });

        const res = await request(app)
            .post('/api/messages/route')
            .set('Content-Type', 'application/json')
            .send(padRequest({ onionPayload: onionLayer1 }));

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Message forwarded.');

        expect(axios.post).toHaveBeenCalledWith(
            node2.address + '/api/messages/route',
            { onionPayload: onionLayer2 }
        );
    });
});
