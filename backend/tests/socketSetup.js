const { app, io } = require('../src/server');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;
let httpServer;

module.exports.setup = (done) => {
    MongoMemoryServer.create()
        .then(mongo => {
            mongoServer = mongo;
            const mongoUri = mongoServer.getUri();
            return mongoose.connect(mongoUri);
        })
        .then(() => {
            httpServer = http.createServer(app);
            io.attach(httpServer);
            httpServer.listen(done);
        });
};

module.exports.teardown = (done) => {
    io.close();
    httpServer.close(() => {
        mongoose.disconnect()
            .then(() => mongoServer.stop())
            .then(done);
    });
};

module.exports.getPort = () => {
    return httpServer.address().port;
}
