const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !password) {
            return res.status(400).send({ error: 'Username and password are required' });
        }

        const user = new User({
            username,
            email, // email is optional
            passwordHash: password
        });
        await user.save();
        res.status(201).send({ message: 'User registered successfully' });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).send({ error: 'Username or email already exists' });
        }
        res.status(400).send({ error: 'Failed to register user' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!password || (!email && !username)) {
            return res.status(400).send({ error: 'Email or username, and password are required' });
        }

        let user;
        if (email) {
            user = await User.findOne({ email });
        } else {
            user = await User.findOne({ username });
        }

        if (!user) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.send({ token });
    } catch (error) {
        res.status(400).send({ error: 'Failed to login' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.send(user);
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate' });
    }
};
