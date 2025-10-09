import { KeyHelper, KeyPairType, PreKeyType } from '@privacyresearch/libsignal-protocol-typescript';
import { Buffer } from 'buffer';
import { User } from '@/types/user';
import CryptoWorker from './crypto.worker?worker';

let worker: Worker | null = null;
const requestPromises = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
let messageIdCounter = 0;

function getWorker(): Worker {
    if (!worker) {
        worker = new CryptoWorker();
        worker.onmessage = (event: MessageEvent) => {
            const { id, success, payload, error } = event.data;
            const promise = requestPromises.get(id);
            if (promise) {
                if (success) {
                    promise.resolve(payload);
                } else {
                    promise.reject(new Error(error));
                }
                requestPromises.delete(id);
            }
        };
    }
    return worker;
}

function postMessageToWorker(action: string, payload: any): Promise<any> {
    const id = messageIdCounter++;
    const worker = getWorker();
    return new Promise((resolve, reject) => {
        requestPromises.set(id, { resolve, reject });
        worker.postMessage({ id, action, payload });
    });
}

// Define an interface for the private keys to improve type safety and readability
export interface PrivateKeys {
    identityKeyPair: KeyPairType;
    registrationId: number;
    preKeys: PreKeyType[];
    signedPreKey: PreKeyType;
}

// This function now initializes the worker's signal store
export function getSignalStore(privateKeys: PrivateKeys | { _private: PrivateKeys }): Promise<string> {
    const keys: PrivateKeys = '_private' in privateKeys ? privateKeys._private : privateKeys;
    return postMessageToWorker('init', { privateKeys: keys });
}

export async function generateIdentity() {
    const registrationId = KeyHelper.generateRegistrationId();
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    // Use a cryptographically secure random number generator for the key ID.
    // The ID should be a high-entropy random integer. Using a 31-bit integer.
    const signedPreKeyId = window.crypto.getRandomValues(new Uint32Array(1))[0] & 0x7FFFFFFF;
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);

    const preKeys: PreKeyType[] = [];
    // Generate a batch of pre-keys. Ensure their IDs are unique.
    const preKeyIds = new Set<number>();
    while (preKeyIds.size < 100) {
        preKeyIds.add(window.crypto.getRandomValues(new Uint32Array(1))[0] & 0x7FFFFFFF);
    }

    for (const preKeyId of preKeyIds) {
        const preKey = await KeyHelper.generatePreKey(preKeyId);
        preKeys.push(preKey);
    }

    return {
        _private: {
            identityKeyPair,
            registrationId,
            preKeys,
            signedPreKey,
        },
        public: {
            identityKey: Buffer.from(identityKeyPair.pubKey).toString('hex'),
            registrationId,
            signedPreKey: {
                keyId: signedPreKey.keyId,
                publicKey: Buffer.from(signedPreKey.keyPair.pubKey).toString('hex'),
                signature: Buffer.from(signedPreKey.signature).toString('hex'),
            },
            oneTimePreKeys: preKeys.map(p => ({
                keyId: p.keyId,
                publicKey: Buffer.from(p.keyPair.pubKey).toString('hex'),
            })),
        }
    };
}

// Define an interface for the pre-key bundle to improve type safety and readability
export interface PreKeyBundle {
    identityKey: string;
    registrationId: number;
    signedPreKey: {
        keyId: number;
        publicKey: string;
        signature: string;
    };
    oneTimePreKeys: {
        keyId: number;
        publicKey: string;
    }[];
}

export function encryptMessage(recipient: User, message: string): Promise<any> {
    return postMessageToWorker('encrypt', { recipient, message });
}

export function decryptMessage(senderIdentityKey: string, registrationId: number, ciphertext: any): Promise<string> {
    return postMessageToWorker('decrypt', { senderIdentityKey, registrationId, ciphertext });
}

const aescbc = 'AES-GCM'
const pbkdf2 = 'PBKDF2'

/**
 * Derives a key from a password using PBKDF2.
 * @param password The password to derive the key from.
 * @param salt The salt to use for key derivation.
 * @returns A promise that resolves to a CryptoKey.
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: pbkdf2 },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: pbkdf2,
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: aescbc, length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts the private keys using a password.
 * @param privateKeys The private keys to encrypt.
 * @param password The password to use for encryption.
 * @returns A promise that resolves to a base64 encoded string containing the encrypted data, salt, and IV.
 */
export async function encryptPrivateKeys(privateKeys: PrivateKeys, password: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromPassword(password, salt);
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(JSON.stringify(privateKeys));

    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: aescbc,
            iv: iv,
        },
        key,
        dataToEncrypt
    );

    const saltBuffer = Buffer.from(salt);
    const ivBuffer = Buffer.from(iv);
    const encryptedBuffer = Buffer.from(encryptedData);

    // Combine salt, iv, and encrypted data into one buffer and then base64 encode it.
    const combined = Buffer.concat([saltBuffer, ivBuffer, encryptedBuffer]);
    return combined.toString('base64');
}

/**
 * Decrypts the private keys using a password.
 * @param encryptedKeysB64 The base64 encoded encrypted private keys.
 * @param password The password to use for decryption.
 * @returns A promise that resolves to the decrypted private keys.
 */
export async function decryptPrivateKeys(encryptedKeysB64: string, password: string): Promise<PrivateKeys> {
    const combined = Buffer.from(encryptedKeysB64, 'base64');

    // Extract salt, iv, and encrypted data from the combined buffer.
    const salt = new Uint8Array(combined.slice(0, 16));
    const iv = new Uint8Array(combined.slice(16, 28));
    const encryptedData = new Uint8Array(combined.slice(28));

    const key = await deriveKeyFromPassword(password, salt);

    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: aescbc,
            iv: iv,
        },
        key,
        encryptedData
    );

    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedData);
    return JSON.parse(decryptedString);
}


// This function is for testing purposes only, to reset the singleton store.
export function _resetSignalStore() {
    signalStore = null;
}

function tryParseJson<T = any>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch (error) {
        return null;
    }
}

export interface ConversationMetadata {
    name: string;
    participants?: string[];
    [key: string]: unknown;
}

/**
 * Encrypts conversation metadata using AES-GCM.
 * @param metadata The conversation metadata to encrypt.
 * @param key The symmetric key (CryptoKey) to use for encryption.
 * @returns A promise that resolves to a base64 encoded string containing the IV and ciphertext.
 */
export async function encryptConversationMetadata(metadata: ConversationMetadata, key: CryptoKey): Promise<string> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM is standard
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(JSON.stringify(metadata));

    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: aescbc, // Reusing the 'AES-GCM' constant
            iv: iv,
        },
        key,
        dataToEncrypt
    );

    const ivBuffer = Buffer.from(iv);
    const encryptedBuffer = Buffer.from(encryptedData);

    // Combine IV and encrypted data, then base64 encode.
    const combined = Buffer.concat([ivBuffer, encryptedBuffer]);
    return combined.toString('base64');
}


export async function decryptConversationMetadata(
    encryptedMetadataB64: string,
    key: CryptoKey
): Promise<ConversationMetadata> {
    if (!encryptedMetadataB64) {
        return { name: 'Unknown conversation', participants: [] };
    }

    try {
        const combined = Buffer.from(encryptedMetadataB64, 'base64');

        // Extract IV and ciphertext from the combined buffer.
        const iv = new Uint8Array(combined.slice(0, 12));
        const encryptedData = new Uint8Array(combined.slice(12));

        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: aescbc, // Reusing the 'AES-GCM' constant
                iv: iv,
            },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        const decryptedString = decoder.decode(decryptedData);
        return JSON.parse(decryptedString) as ConversationMetadata;

    } catch (error) {
        console.error("Failed to decrypt conversation metadata:", error);
        // Fallback for metadata that might not have been encrypted with the new method yet.
        // This logic attempts to parse the string as if it were unencrypted legacy data.

        // 1. Try parsing as raw JSON
        const direct = tryParseJson<ConversationMetadata>(encryptedMetadataB64);
        if (direct) {
            return direct;
        }

        // 2. Try parsing as base64-encoded JSON
        try {
            const decoded = Buffer.from(encryptedMetadataB64, 'base64').toString('utf8');
            const parsed = tryParseJson<ConversationMetadata>(decoded);
            if (parsed) {
                return parsed;
            }
        } catch (e) {
            // This catch handles cases where the string is not valid Base64.
            // We can ignore it and proceed to the final fallback.
        }

        // 3. If all else fails, return the placeholder.
        // This will be hit if decryption fails AND it's not valid legacy data.
        return { name: 'Could not decrypt name' };
    }
}
