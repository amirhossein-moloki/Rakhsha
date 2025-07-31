const request = require('supertest');
const app = require('../src/app');

const PADDING_SIZE = 4096;
const padRequest = (data) => {
    const dataString = JSON.stringify(data);
    const paddingNeeded = PADDING_SIZE - dataString.length;
    if (paddingNeeded > 0) {
        return { ...data, padding: 'a'.repeat(paddingNeeded) };
    }
    return data;
};
const mongoose = require('mongoose');
const Node = require('../src/models/Node');

describe('Node Management Routes', () => {
    const { setup, teardown } = require('./setup');
    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await Node.deleteMany({});
    });

    it('should register a new node', async () => {
        const nodeData = {
            address: 'http://test-node-1.com',
            publicKey: 'test-public-key',
        };

        const res = await request(app)
            .post('/api/nodes/register')
            .send(padRequest(nodeData));

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Node registered successfully.');
        expect(res.body).toHaveProperty('nodeId');

        const node = await Node.findOne({ address: 'http://test-node-1.com' });
        expect(node).not.toBeNull();
        expect(node.publicKey).toBe('test-public-key');
    });

    it('should get the list of registered nodes', async () => {
        const node1 = new Node({ nodeId: 'node1', address: 'http://node1.com', publicKey: 'key1' });
        const node2 = new Node({ nodeId: 'node2', address: 'http://node2.com', publicKey: 'key2' });
        await node1.save();
        await node2.save();

        const res = await request(app).get('/api/nodes');

        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(2);
        expect(res.body[0].nodeId).toBe('node1');
    });
});
