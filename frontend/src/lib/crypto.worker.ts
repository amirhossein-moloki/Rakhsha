/// <reference lib="webworker" />
import { KeyHelper, KeyPairType, PreKeyType, SessionBuilder, SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript';
import { PersistentSignalProtocolStore } from './PersistentSignalProtocolStore';
import { Buffer } from 'buffer';
import axios from 'axios';

// This is a simplified API instance for the worker.
// In a real app, you might want a more robust way to handle the base URL.
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Adjust if your API is elsewhere
});


let signalStore: PersistentSignalProtocolStore | null = null;

// Define an interface for the private keys to improve type safety and readability
export interface PrivateKeys {
    identityKeyPair: KeyPairType;
    registrationId: number;
    preKeys: PreKeyType[];
    signedPreKey: PreKeyType;
}

export function createStore(privateIdentity: PrivateKeys | { _private: PrivateKeys }): PersistentSignalProtocolStore {
    const keys: PrivateKeys = '_private' in privateIdentity ? privateIdentity._private : privateIdentity;
    const { identityKeyPair, registrationId } = keys;
    const store = new PersistentSignalProtocolStore(identityKeyPair, registrationId);

    keys.preKeys.forEach((p: PreKeyType) => {
        void store.storePreKey(p.keyId, p);
    });
    void store.storeSignedPreKey(keys.signedPreKey.keyId, keys.signedPreKey.keyPair);

    return store;
}

export function getSignalStore(privateKeys?: PrivateKeys | { _private: PrivateKeys }): PersistentSignalProtocolStore {
    if (!signalStore) {
        if (!privateKeys) {
            throw new Error('Private keys are required to initialize the Signal store.');
        }
        signalStore = createStore(privateKeys);
    }
    return signalStore;
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

async function handleEncrypt(recipient: any, message: string) {
    const store = getSignalStore();
    if (!recipient.identityKey) {
        throw new Error(`Recipient ${recipient._id} has no identity key.`);
    }

    const recipientAddress = new SignalProtocolAddress(Buffer.from(recipient.identityKey, 'hex'), recipient.registrationId);
    const sessionCipher = new SessionCipher(store, recipientAddress);

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
    const arrayBuffer = new Uint8Array(messageBuffer).buffer;
    const ciphertext = await sessionCipher.encrypt(arrayBuffer);
    return ciphertext;
}

async function handleDecrypt(senderIdentityKey: string, registrationId: number, ciphertext: any) {
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


self.onmessage = async (event: MessageEvent) => {
    const { id, action, payload } = event.data;

    try {
        let result;
        switch (action) {
            case 'init':
                getSignalStore(payload.privateKeys);
                result = 'Store initialized';
                break;
            case 'encrypt':
                result = await handleEncrypt(payload.recipient, payload.message);
                break;
            case 'decrypt':
                result = await handleDecrypt(payload.senderIdentityKey, payload.registrationId, payload.ciphertext);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        self.postMessage({ id, success: true, payload: result });
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
};