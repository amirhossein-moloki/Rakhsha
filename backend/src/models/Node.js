const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
    nodeId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    address: {
        type: String,
        required: true,
        unique: true
    },
    publicKey: {
        type: String,
        required: true
    },
    lastSeen: {
        type: Date,
        default: Date.now,
        index: true
    }
});

const Node = mongoose.model('Node', NodeSchema);

module.exports = Node;
