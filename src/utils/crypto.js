const CryptoJS = require('crypto-js');

const generateKey = () => CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key

const encrypt = (data, key) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

const decrypt = (encryptedData, key) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

module.exports = {
    generateKey,
    encrypt,
    decrypt
};
