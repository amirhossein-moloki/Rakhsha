const redis = require('redis');
const crypto = require('crypto');

const generateOtp = () => {
    return crypto.randomBytes(3).toString('hex'); // 6-character OTP
};

const activateHiddenMode = async (req, res, next) => {
    const { otp } = req.body;
    const client = redis.createClient();
    await client.connect();

    try {
        const storedOtp = await client.get(`otp:${req.user._id}`);
        if (otp && storedOtp === otp) {
            await client.set(`hidden_mode:${req.user._id}`, 'true', 'EX', 3600); // Activate for 1 hour
            await client.del(`otp:${req.user._id}`); // OTP is single-use
            res.status(200).send({ message: 'Hidden mode activated' });
        } else {
            res.status(401).send({ error: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to activate hidden mode' });
    } finally {
        await client.disconnect();
    }
};

const generateHiddenModeOtp = async (req, res) => {
    const otp = generateOtp();
    const client = redis.createClient();
    await client.connect();

    try {
        await client.set(`otp:${req.user._id}`, otp, 'EX', 300); // OTP is valid for 5 minutes
        res.status(200).send({ otp });
    } catch (error) {
        res.status(500).send({ error: 'Failed to generate OTP' });
    } finally {
        await client.disconnect();
    }
};

module.exports = {
    activateHiddenMode,
    generateHiddenModeOtp
};
