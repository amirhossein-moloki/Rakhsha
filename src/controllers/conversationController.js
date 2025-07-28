const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.createConversation = async (req, res) => {
    try {
        const { type, participants, name } = req.body;
        const conversation = new Conversation({
            type,
            participants,
            name
        });
        await conversation.save();
        res.status(201).send(conversation);
    } catch (error) {
        res.status(400).send({ error: 'Failed to create conversation' });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.user._id });
        res.send(conversations);
    } catch (error) {
        res.status(400).send({ error: 'Failed to get conversations' });
    }
};

const SecretMessage = require('../models/SecretMessage');
const redis = require('redis');

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.conversationId });
        res.send(messages);
    } catch (error) {
        res.status(400).send({ error: 'Failed to get messages' });
    }
};

exports.getSecretMessages = async (req, res) => {
    try {
        const client = redis.createClient();
        await client.connect();
        const isHidden = await client.get(`hidden_mode:${req.user._id}`);
        await client.disconnect();

        if (isHidden) {
            const messages = await SecretMessage.find({ secretConversationId: req.params.conversationId });
            res.send(messages);
        } else {
            res.status(403).send({ error: 'Forbidden' });
        }
    } catch (error) {
        res.status(400).send({ error: 'Failed to get secret messages' });
    }
};
