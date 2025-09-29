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
    const signedPreKeyId = Math.floor(Math.random() * 10000);
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);

    const preKeys: PreKeyType[] = [];
    for (let i = 0; i < 100; i++) {
        const preKeyId = Math.floor(Math.random() * 10000);
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

export async function decryptConversationMetadata(
    encryptedMetadata: string,
    _key: Buffer | Uint8Array
): Promise<ConversationMetadata> {
    if (!encryptedMetadata) {
        return { name: 'Unknown conversation', participants: [] };
    }

    // Attempt direct JSON parsing first (the backend currently stores JSON strings).
    const direct = tryParseJson<ConversationMetadata>(encryptedMetadata);
    if (direct) {
        return direct;
    }

    // If the payload is base64 encoded JSON, decode and retry.
    try {
        const decoded = Buffer.from(encryptedMetadata, 'base64').toString('utf8');
        const parsed = tryParseJson<ConversationMetadata>(decoded);
        if (parsed) {
            return parsed;
        }
        if (decoded) {
            return { name: decoded };
        }
    } catch (error) {
        // Swallow decoding errors and fall back to a descriptive placeholder below.
    }

    // As a final fallback, expose a shortened representation so the UI has something meaningful.
    return {
        name: encryptedMetadata.length > 60 ? `${encryptedMetadata.slice(0, 57)}...` : encryptedMetadata,
        participants: [],
    };
}
