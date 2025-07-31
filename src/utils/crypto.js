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
    ecdh.setPrivateKey(privateKey, 'base64');
    return ecdh.computeSecret(otherPublicKey, 'base64', 'hex');
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
