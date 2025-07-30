const cron = require('node-cron');
const Message = require('../models/Message');

// Schedule a job to run every hour to delete expired messages
if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 * * * *', async () => {
        console.log('Running scheduled job: deleting expired messages...');
        try {
            const result = await Message.deleteMany({ expiresAt: { $lte: new Date() } });
            console.log(`Deleted ${result.deletedCount} expired messages.`);
        } catch (error) {
            console.error('Error deleting expired messages:', error);
        }
    });
}
