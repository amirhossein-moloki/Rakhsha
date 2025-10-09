import { describe, it, expect, vi } from 'vitest';
import {
  encryptConversationMetadata,
  decryptConversationMetadata,
  ConversationMetadata,
} from './crypto';
import { generateConversationKey } from './key-manager';

// Mocking browser crypto for Node environment if needed, but Vitest's environment should handle it.

describe('Conversation Metadata Encryption and Decryption', () => {
  it('should encrypt and then decrypt metadata back to its original form', async () => {
    // 1. Setup
    const key = await generateConversationKey();
    const originalMetadata: ConversationMetadata = {
      name: 'Secret Chat 🤫',
      participants: ['user1', 'user2'],
      topic: 'Project Phoenix',
    };

    // 2. Action
    const encryptedB64 = await encryptConversationMetadata(originalMetadata, key);
    const decryptedMetadata = await decryptConversationMetadata(encryptedB64, key);

    // 3. Assertion
    expect(typeof encryptedB64).toBe('string');
    expect(encryptedB64).not.toEqual(JSON.stringify(originalMetadata));
    expect(decryptedMetadata).toEqual(originalMetadata);
  });

  it('should return a placeholder for un-decryptable metadata', async () => {
    // 1. Setup
    const key1 = await generateConversationKey();
    const key2 = await generateConversationKey(); // A different key
    const originalMetadata: ConversationMetadata = { name: 'Top Secret' };

    // 2. Action
    const encryptedB64 = await encryptConversationMetadata(originalMetadata, key1);
    // Attempt to decrypt with the wrong key
    const decryptedMetadata = await decryptConversationMetadata(encryptedB64, key2);

    // 3. Assertion
    expect(decryptedMetadata).toEqual({ name: 'Could not decrypt name' });
  });

  it('should handle legacy plaintext JSON metadata for backward compatibility', async () => {
    const key = await generateConversationKey();
    const legacyMetadata = { name: 'Old Chat', participants: ['p1'] };
    const legacyJson = JSON.stringify(legacyMetadata);

    const decrypted = await decryptConversationMetadata(legacyJson, key);
    expect(decrypted).toEqual(legacyMetadata);
  });

  it('should handle legacy base64 encoded JSON metadata', async () => {
      const key = await generateConversationKey();
      const legacyMetadata = { name: 'Another Old Chat' };
      const legacyBase64 = Buffer.from(JSON.stringify(legacyMetadata)).toString('base64');

      const decrypted = await decryptConversationMetadata(legacyBase64, key);
      expect(decrypted).toEqual(legacyMetadata);
  });
});