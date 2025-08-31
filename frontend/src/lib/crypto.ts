import { KeyHelper, SignedPublicPreKeyType, PublicPreKeyType, KeyPairType, SessionBuilder, SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript';
import { InMemorySignalProtocolStore } from './InMemorySignalProtocolStore';
import { Buffer } from 'buffer';

// This is a placeholder for the registration ID.
// In a real app, this would be generated once and stored.
const registrationId = KeyHelper.generateRegistrationId();

export async function generateIdentity() {
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  // The signed pre-key ID should be a random integer.
  const signedPreKeyId = Math.floor(Math.random() * 10000);
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);

  const preKeys: KeyPairType[] = [];
  // Generate 100 one-time pre-keys
  for (let i = 0; i < 100; i++) {
    // The pre-key ID should be a random integer.
    const preKeyId = Math.floor(Math.random() * 10000);
    const preKey = await KeyHelper.generatePreKey(preKeyId);
    preKeys.push(preKey);
  }

  const publicOneTimePreKeys = preKeys.map(p => p.public);

  return {
    registrationId,
    identityKey: identityKeyPair.pubKey,
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: signedPreKey.pubKey,
      signature: signedPreKey.signature,
    },
    oneTimePreKeys: publicOneTimePreKeys,
    _private: {
      identityKeyPair,
      preKeys,
      signedPreKey,
    }
  };
}

export function createStore(identity: any) {
    const store = new InMemorySignalProtocolStore(identity._private.identityKeyPair, identity.registrationId);
    identity._private.preKeys.forEach((p: KeyPairType) => {
        store.storePreKey(p.keyId, p);
    });
    store.storeSignedPreKey(identity._private.signedPreKey.keyId, identity._private.signedPreKey);
    return store;
}

export async function buildSession(store: InMemorySignalProtocolStore, preKeyBundle: any) {
    const recipientAddress = new SignalProtocolAddress(preKeyBundle.identityKey, preKeyBundle.registrationId);
    const sessionBuilder = new SessionBuilder(store, recipientAddress);
    await sessionBuilder.processPreKey(preKeyBundle);
}

export async function encryptMessage(store: InMemorySignalProtocolStore, recipientId: string, message: string) {
    const recipientAddress = new SignalProtocolAddress(recipientId, 1); // registrationId is not available here, using a placeholder
    const sessionCipher = new SessionCipher(store, recipientAddress);
    const ciphertext = await sessionCipher.encrypt(Buffer.from(message, 'utf8'));
    return ciphertext;
}

export async function decryptMessage(store: InMemorySignalProtocolStore, senderId: string, ciphertext: any) {
    const senderAddress = new SignalProtocolAddress(senderId, 1); // registrationId is not available here, using a placeholder
    const sessionCipher = new SessionCipher(store, senderAddress);
    let plaintext: ArrayBuffer;
    if (ciphertext.type === 3) { // PreKeyWhisperMessage
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary');
    } else { // WhisperMessage
        plaintext = await sessionCipher.decryptWhisperMessage(ciphertext.body, 'binary');
    }
    return Buffer.from(plaintext).toString('utf8');
}

async function importConversationKey(key: Buffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function decryptConversationMetadata(encryptedMetadata: string, conversationKey: Buffer) {
    const [ivHex, ciphertextHex] = encryptedMetadata.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const key = await importConversationKey(conversationKey);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return JSON.parse(Buffer.from(decrypted).toString('utf8'));
}
