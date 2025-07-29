const cron = require('node-cron');
const SecretMessage = require('../models/SecretMessage');

// Schedule a job to run every hour to delete expired messages
cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled job: deleting expired messages...');
    try {
        const result = await SecretMessage.deleteMany({ expiresAt: { $lte: new Date() } });
        console.log(`Deleted ${result.deletedCount} expired messages.`);
    } catch (error) {
        console.error('Error deleting expired messages:', error);
    }
});
