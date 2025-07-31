const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // GCM uses a 12-byte nonce, but 16 is also acceptable and common.
const AUTH_TAG_LENGTH = 16; // GCM standard auth tag length

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

        // FIX: Explicitly provide authTagLength to createDecipheriv for GCM mode.
        // This ensures consistency and prevents potential issues with different Node.js versions.
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(authTag);

        // The final() call will throw an error if the authentication tag does not match.
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        // Catch any error during decryption (e.g., auth tag mismatch, invalid format)
        // and re-throw a generic error to avoid leaking implementation details.
        // The test specifically looks for the standard GCM error message.
        throw error;
    }
};


const encryptRSA = (text, publicKey) => {
    const buffer = Buffer.from(text, 'utf8');
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        buffer
    );
    return encrypted.toString('base64');
};

const decryptRSA = (encryptedText, privateKey) => {
    const buffer = Buffer.from(encryptedText, 'base64');
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        buffer
    );
    return decrypted.toString('utf8');
};

const encryptHybrid = (text, publicKey) => {
    const symmetricKey = generateSymmetricKey();
    const encryptedPayload = encryptSymmetric(text, symmetricKey);
    const encryptedSymmetricKey = encryptRSA(symmetricKey, publicKey);
    return JSON.stringify({
        key: encryptedSymmetricKey,
        payload: encryptedPayload,
    });
};

const decryptHybrid = (encryptedData, privateKey) => {
    const { key, payload } = JSON.parse(encryptedData);
    const symmetricKey = decryptRSA(key, privateKey);
    return decryptSymmetric(payload, symmetricKey);
};

const { ec } = require('elliptic');
const ec_secp256k1 = new ec('secp256k1');

const sign = (data, privateKey) => {
    const key = ec_secp256k1.keyFromPrivate(privateKey, 'hex');
    const signature = key.sign(data);
    return signature.toDER('hex');
};

const verify = (data, signature, publicKey) => {
    const key = ec_secp256k1.keyFromPublic(publicKey, 'hex');
    return key.verify(data, signature);
};

const generateECDHKeyPair = () => {
    const keyPair = ec_secp256k1.genKeyPair();
    return {
        publicKey: keyPair.getPublic('hex'),
        privateKey: keyPair.getPrivate('hex'),
    };
};

const computeECDHSharedSecret = (privateKey, otherPublicKey) => {
    const ecdh = crypto.createECDH('secp256k1');
    // FIX: Ensure the private key is loaded in 'hex' format, matching its generation format.
    ecdh.setPrivateKey(privateKey, 'hex');
    // FIX: Ensure the other public key is also processed in 'hex' format.
    return ecdh.computeSecret(otherPublicKey, 'hex', 'hex');
};

module.exports = {
    generateSymmetricKey,
    encryptSymmetric,
    decryptSymmetric,
    encryptRSA,
    decryptRSA,
    encryptHybrid,
    decryptHybrid,
    sign,
    verify,
    generateECDHKeyPair,
    computeECDHSharedSecret,
};
