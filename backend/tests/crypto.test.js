const {
    generateSymmetricKey,
    encryptSymmetric,
    decryptSymmetric,
    generateECDHKeyPair,
    computeECDHSharedSecret,
    sign,
    verify
} = require('../src/utils/crypto');

describe('Crypto Utilities', () => {
    // Test for Symmetric Encryption (AES-256-GCM)
    describe('Symmetric Encryption/Decryption', () => {
        it('should encrypt and decrypt a message successfully', () => {
            const key = generateSymmetricKey();
            const originalText = 'This is a secret message.';
            const encryptedText = encryptSymmetric(originalText, key);
            const decryptedText = decryptSymmetric(encryptedText, key);

            expect(decryptedText).toBe(originalText);
            expect(encryptedText).not.toBe(originalText);
        });

        it('should fail decryption with a wrong key', () => {
            const key1 = generateSymmetricKey();
            const key2 = generateSymmetricKey();
            const originalText = 'This is another secret.';
            const encryptedText = encryptSymmetric(originalText, key1);

            // Expecting the decryption to throw an error
            expect(() => {
                decryptSymmetric(encryptedText, key2);
            }).toThrow();
        });

        it('should fail decryption if the encrypted text is tampered with', () => {
            const key = generateSymmetricKey();
            const originalText = 'Untampered data.';
            const encryptedText = encryptSymmetric(originalText, key);

            // Tamper with the ciphertext (e.g., change a character)
            const tamperedEncryptedText = encryptedText.slice(0, -1) + 'a';

            expect(() => {
                decryptSymmetric(tamperedEncryptedText, key);
            }).toThrow(/Unsupported state or unable to authenticate/);
        });
    });

    // Test for ECDH Key Exchange
    describe('ECDH Key Exchange', () => {
        it('should compute the same shared secret for both parties', () => {
            // Generate key pairs for Alice and Bob
            const aliceKeys = generateECDHKeyPair();
            const bobKeys = generateECDHKeyPair();

            // Alice computes her shared secret using her private key and Bob's public key
            const aliceSharedSecret = computeECDHSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

            // Bob computes his shared secret using his private key and Alice's public key
            const bobSharedSecret = computeECDHSharedSecret(bobKeys.privateKey, aliceKeys.publicKey);

            // The secrets must be identical
            expect(aliceSharedSecret).toBe(bobSharedSecret);
            expect(aliceSharedSecret).toBeDefined();
            expect(aliceSharedSecret.length).toBe(64); // 256-bit key in hex is 64 chars
        });
    });

    // Test for Digital Signatures (ECDSA)
    describe('Digital Signatures', () => {
        it('should sign data and successfully verify the signature', () => {
            const keyPair = generateECDHKeyPair();
            const data = 'This data needs to be signed.';

            const signature = sign(data, keyPair.privateKey);
            const isValid = verify(data, signature, keyPair.publicKey);

            expect(isValid).toBe(true);
        });

        it('should fail to verify a signature with wrong data', () => {
            const keyPair = generateECDHKeyPair();
            const originalData = 'This is the original data.';
            const tamperedData = 'This is tampered data.';

            const signature = sign(originalData, keyPair.privateKey);
            const isValid = verify(tamperedData, signature, keyPair.publicKey);

            expect(isValid).toBe(false);
        });

        it('should fail to verify a signature with a wrong public key', () => {
            const keyPair1 = generateECDHKeyPair();
            const keyPair2 = generateECDHKeyPair();
            const data = 'Some data to sign.';

            const signature = sign(data, keyPair1.privateKey);
            // Attempt to verify with a different public key
            const isValid = verify(data, signature, keyPair2.publicKey);

            expect(isValid).toBe(false);
        });
    });
});
