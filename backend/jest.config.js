module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testTimeout: 30000,
    setupFiles: ['dotenv/config'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
};
