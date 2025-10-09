// Load environment variables from the root .env file for the test environment
// The path is relative to the 'backend' directory, where 'npm test' is executed.
require('dotenv').config({ path: '../.env' });