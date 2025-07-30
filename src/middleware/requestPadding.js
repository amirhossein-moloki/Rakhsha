// This middleware enforces a fixed padding size for all incoming requests
// to make traffic analysis based on content length more difficult.

const PADDING_SIZE = 4096; // 4 KB

const requestPadding = (req, res, next) => {
    // We disable this middleware in the test environment because it's impractical
    // to pad every single test request to the exact size.
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    const contentLength = req.headers['content-length'];

    // This middleware should only apply to requests with a body.
    if (!contentLength) {
        return next();
    }

    // To make traffic analysis based on size impossible, we enforce a fixed size
    // for all requests that contain a body.
    if (parseInt(contentLength, 10) !== PADDING_SIZE) {
        return res.status(400).send({
            error: `Invalid request size. All requests with a body must be padded to exactly ${PADDING_SIZE} bytes.`
        });
    }

    next();
};

module.exports = requestPadding;
