const dotenv = require('dotenv');
const path = require('path');

// Explicitly load the .env file from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });