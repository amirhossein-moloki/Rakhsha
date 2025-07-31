const Node = require('../models/Node');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

/**
 * @description Register a new node in the network
 * @route POST /api/nodes/register
 * @access Public (for now, will require auth later)
 */
exports.registerNode = asyncHandler(async (req, res) => {
    const { address, publicKey } = req.body;

    if (!address || !publicKey) {
        return res.status(400).send({ error: 'Address and publicKey are required.' });
    }

    // Generate a unique ID for the node
    const nodeId = crypto.randomBytes(16).toString('hex');

    const node = new Node({
        nodeId,
        address,
        publicKey
    });

    await node.save();

    res.status(201).send({
        message: 'Node registered successfully.',
        nodeId: node.nodeId
    });
});

/**
 * @description Get a list of active nodes
 * @route GET /api/nodes
 * @access Public
 */
exports.getNodes = asyncHandler(async (req, res) => {
    // For now, return all nodes. In the future, we can filter by activity.
    const nodes = await Node.find().select('nodeId address publicKey');
    res.status(200).send(nodes);
});
