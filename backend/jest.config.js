module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testTimeout: 30000,
    // Use setupFilesAfterEnv to ensure the environment is ready before tests run.
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
};