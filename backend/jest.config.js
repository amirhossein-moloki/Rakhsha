module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testTimeout: 30000,
    setupFiles: ['<rootDir>/tests/jest.setup.js'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
};
