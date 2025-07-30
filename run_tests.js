const jest = require('jest');

const options = {
    projects: [__dirname],
    silent: false,
    detectOpenHandles: true,
    testPathPattern: [/tests\\/.*\\.test\\.js$/]
};

console.log('Starting Jest programmatically...');

process.env.NODE_ENV = 'test';

jest.runCLI(options, options.projects)
    .then(({ results }) => {
        if (results.success) {
            console.log('Tests passed!');
            process.exit(0);
        } else {
            console.error('Tests failed.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Error running Jest:', error);
        process.exit(1);
    });
