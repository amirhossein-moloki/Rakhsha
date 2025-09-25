import { KeyHelper, KeyPairType, PreKeyType, SessionBuilder, SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript';
import { PersistentSignalProtocolStore } from './PersistentSignalProtocolStore';
import { Buffer } from 'buffer';
import { User } from '@/types/user';

let signalStore: PersistentSignalProtocolStore | null = null;

// Define an interface for the private keys to improve type safety and readability
export interface PrivateKeys {
    identityKeyPair: KeyPairType;
    registrationId: number;
    preKeys: PreKeyType[];
    signedPreKey: PreKeyType;
}

export function getSignalStore(privateKeys?: PrivateKeys): PersistentSignalProtocolStore {
    if (!signalStore) {
        if (!privateKeys) {
            throw new Error("Private keys are required to initialize the Signal store.");
        }
        const { identityKeyPair, registrationId } = privateKeys;
        signalStore = new PersistentSignalProtocolStore(identityKeyPair, registrationId);

        // Load pre-keys into the store
        privateKeys.preKeys.forEach((p: PreKeyType) => {
            signalStore?.storePreKey(p.keyId, p);
        });
        signalStore.storeSignedPreKey(privateKeys.signedPreKey.keyId, privateKeys.signedPreKey.keyPair);
    }
    return signalStore;
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

import api from '@/api/axios';

export async function buildSession(preKeyBundle: PreKeyBundle) {
    const store = getSignalStore();

    const processedBundle = {
        ...preKeyBundle,
        identityKey: Buffer.from(preKeyBundle.identityKey, 'hex'),
        signedPreKey: {
            ...preKeyBundle.signedPreKey,
            publicKey: Buffer.from(preKeyBundle.signedPreKey.publicKey, 'hex'),
            signature: Buffer.from(preKeyBundle.signedPreKey.signature, 'hex'),
        },
        oneTimePreKeys: preKeyBundle.oneTimePreKeys.map((k: any) => ({
            ...k,
            publicKey: Buffer.from(k.publicKey, 'hex'),
        })),
    };

    const recipientAddress = new SignalProtocolAddress(processedBundle.identityKey, preKeyBundle.registrationId);
    const sessionBuilder = new SessionBuilder(store, recipientAddress);
    await sessionBuilder.processPreKey(processedBundle);
}

export async function encryptMessage(recipient: User, message: string) {
    const store = getSignalStore();
    if (!recipient.identityKey) {
        throw new Error(`Recipient ${recipient._id} has no identity key.`);
    }

    const recipientAddress = new SignalProtocolAddress(Buffer.from(recipient.identityKey, 'hex'), recipient.registrationId);
    const sessionCipher = new SessionCipher(store, recipientAddress);

    // Check if a session exists. If not, build one.
    const sessionExists = await store.loadSession(recipientAddress.toString());
    if (!sessionExists) {
        if (!recipient.username) {
            throw new Error(`Recipient ${recipient._id} has no username.`);
        }
        // Fetch pre-key bundle from the server
        const { data: preKeyBundle } = await api.get(`/users/${recipient.username}/pre-key-bundle`);
        await buildSession(preKeyBundle);
    }

    const messageBuffer = Buffer.from(message, 'utf8');
    // The library expects a standard ArrayBuffer. The Uint8Array constructor
    // copies the buffer data into a new ArrayBuffer.
    const arrayBuffer = new Uint8Array(messageBuffer).buffer;
    const ciphertext = await sessionCipher.encrypt(arrayBuffer);
    return ciphertext;
}

export async function decryptMessage(senderIdentityKey: string, registrationId: number, ciphertext: any) {
    const store = getSignalStore();
    const senderAddress = new SignalProtocolAddress(Buffer.from(senderIdentityKey, 'hex'), registrationId);
    const sessionCipher = new SessionCipher(store, senderAddress);

    let plaintext: ArrayBuffer;
    if (ciphertext.type === 3) { // PreKeyWhisperMessage
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
    } else { // WhisperMessage
        plaintext = await sessionCipher.decryptWhisperMessage(ciphertext.body, 'binary');
    }
    return Buffer.from(plaintext).toString('utf8');
}

// This function is for testing purposes only, to reset the singleton store.
export function _resetSignalStore() {
    signalStore = null;
}
