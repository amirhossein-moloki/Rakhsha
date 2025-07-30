const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Generates a random 32-byte (256-bit) symmetric key.
 * @returns {string} Hex-encoded 32-byte key.
 */
const generateSymmetricKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypts data using AES-256-CBC.
 * @param {string} text The text to encrypt.
 * @param {string} keyHex The hex-encoded 32-byte encryption key.
 * @returns {string} The IV and the encrypted data, concatenated with a colon and hex-encoded.
 */
const encryptSymmetric = (text, keyHex) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(keyHex, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypts data encrypted with encryptSymmetric.
 * @param {string} text The encrypted text in "iv:encryptedData" format.
 * @param {string} keyHex The hex-encoded 32-byte encryption key.
 * @returns {string} The decrypted text.
 */
const decryptSymmetric = (text, keyHex) => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = Buffer.from(keyHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};


module.exports = {
    generateSymmetricKey,
    encryptSymmetric,
    decryptSymmetric,
};
