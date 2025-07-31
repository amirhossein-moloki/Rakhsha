const cron = require('node-cron');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const cleanup = async () => {
    try {
        const inactiveUsers = await User.find({
            'secondaryPasswordHash': { $ne: null },
            $expr: {
                $lte: [
                    "$lastSecretPriceView",
                    { $subtract: [ new Date(), { $multiply: [ "$settings.secretPriceInterval", 60 * 60 * 1000 ] } ] }
                ]
            }
        }).populate('conversations');

        for (const user of inactiveUsers) {
            // Filter out hidden conversations
            const hiddenConversationIds = user.conversations
                .filter(conv => conv.isHidden)
                .map(conv => conv._id);

            if (hiddenConversationIds.length > 0) {
                // Remove hidden conversations from the user's list
                user.conversations = user.conversations.filter(conv => !conv.isHidden);
            }

            // Reset the user's secret mode fields
            user.secondaryPasswordHash = undefined;
            user.lastSecretPriceView = new Date(); // Reset the clock
            await user.save();
        }
    } catch (error) {
        console.error('Error during secret mode user cleanup job:', error);
    }
};

if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 * * * *', cleanup);
}

module.exports = { cleanup };
