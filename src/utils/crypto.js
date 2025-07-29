const crypto = require('crypto');

const generateKeyPair = () => {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
};

const encryptWithPublicKey = (data, publicKey) => {
    const buffer = Buffer.from(JSON.stringify(data));
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
};

const decryptWithPrivateKey = (encryptedData, privateKey) => {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return JSON.parse(decrypted.toString('utf8'));
};

// Symmetric encryption for messages within a conversation
const generateSymmetricKey = () => crypto.randomBytes(32).toString('hex');

const encryptSymmetric = (data, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSymmetric = (encryptedData, key) => {
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
};


module.exports = {
    generateKeyPair,
    encryptWithPublicKey,
    decryptWithPrivateKey,
    generateSymmetricKey,
    encryptSymmetric,
    decryptSymmetric
};
