// This middleware enforces a fixed padding size for all incoming requests
// to make traffic analysis based on content length more difficult.

const PADDING_SIZE = 4096; // 4 KB

const requestPadding = (req, res, next) => {
    const contentLength = req.headers['content-length'];

    // This middleware should only apply to requests with a body.
    if (!contentLength) {
        return next();
    }

    if (parseInt(contentLength, 10) < PADDING_SIZE) {
        return res.status(400).send({
            error: `Request body is too small. All requests must be padded to at least ${PADDING_SIZE} bytes.`
        });
    }

    next();
};

module.exports = requestPadding;
