const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generates a random 32-byte (256-bit) symmetric key.
 * @returns {string} Hex-encoded 32-byte key.
 */
const generateSymmetricKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypts data using AES-256-GCM (Authenticated Encryption).
 * @param {string} text The text to encrypt.
 * @param {string} keyHex The hex-encoded 32-byte encryption key.
 * @returns {string} A string containing iv, auth tag, and encrypted data, hex-encoded and colon-separated.
 */
const encryptSymmetric = (text, keyHex) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(keyHex, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex')
    ].join(':');
};

/**
 * Decrypts data encrypted with AES-256-GCM.
 * @param {string} text The encrypted text in "iv:authTag:encryptedData" format.
 * @param {string} keyHex The hex-encoded 32-byte encryption key.
 * @returns {string} The decrypted text. Throws an error if authentication fails.
 */
const decryptSymmetric = (text, keyHex) => {
    try {
        const textParts = text.split(':');
        if (textParts.length !== 3) {
            throw new Error('Invalid encrypted text format.');
        }
        const iv = Buffer.from(textParts[0], 'hex');
        const authTag = Buffer.from(textParts[1], 'hex');
        const encryptedText = Buffer.from(textParts[2], 'hex');
        const key = Buffer.from(keyHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generateSymmetricKey,
    encryptSymmetric,
    decryptSymmetric,
};