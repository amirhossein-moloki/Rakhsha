const cron = require('node-cron');
const Message = require('../models/Message');

// This job handles messages with a schema-level TTL index (e.g., for compliance).
// It runs once an hour.
cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled job: deleting messages with TTL...');
    try {
        // The actual deletion is handled by MongoDB's TTL index feature.
        // This log is just to confirm the job is running.
        // We could query for messages near expiry to get a count, but it's not necessary.
        console.log('TTL cleanup job executed. MongoDB will handle the deletion.');
    } catch (error) {
        console.error('Error during TTL cleanup check:', error);
    }
});

// This job runs every minute to specifically target and delete "hidden" messages.
cron.schedule('* * * * *', async () => {
    console.log('Running scheduled job: deleting hidden messages...');
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = await Message.deleteMany({
            hidden: true,
            timestamp: { $lte: fiveMinutesAgo }
        });
        if (result.deletedCount > 0) {
            console.log(`Deleted ${result.deletedCount} hidden messages.`);
        }
    } catch (error) {
        console.error('Error deleting hidden messages:', error);
    }
});
