// This middleware enforces a fixed padding size for all incoming requests
// to make traffic analysis based on content length more difficult.

const PADDING_SIZE = 4096; // 4 KB

const requestPadding = (req, res, next) => {
    // This middleware should only apply to requests with a JSON body.
    // We skip it for multipart/form-data, which is used for file uploads.
    if (!req.headers['content-length'] || req.headers['content-type']?.includes('multipart/form-data')) {
        return next();
    }

    const contentLength = req.headers['content-length'];

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
