import { Conversation } from "@/types/conversation";

const KEY_STORAGE_PREFIX = 'conversation-key-';

/**
 * Generates a new AES-GCM CryptoKey for a conversation.
 * @returns A promise that resolves to a CryptoKey.
 */
export async function generateConversationKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true, // allow the key to be extractable for storage
        ['encrypt', 'decrypt']
    );
}

/**
 * Stores a conversation key in IndexedDB.
 * @param conversationId The ID of the conversation.
 * @param key The CryptoKey to store.
 */
export async function storeConversationKey(conversationId: string, key: CryptoKey): Promise<void> {
    // In a real app, you would use a robust storage library like localforage
    // that gracefully handles IndexedDB. For this example, we use localStorage
    // after exporting the key, which is less ideal but simpler.
    const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(`${KEY_STORAGE_PREFIX}${conversationId}`, JSON.stringify(exportedKey));
}

/**
 * Retrieves a conversation key from IndexedDB.
 * @param conversationId The ID of the conversation.
 * @returns A promise that resolves to the CryptoKey or null if not found.
 */
export async function getConversationKey(conversationId: string): Promise<CryptoKey | null> {
    const storedKey = localStorage.getItem(`${KEY_STORAGE_PREFIX}${conversationId}`);
    if (!storedKey) {
        return null;
    }
    try {
        const jwk = JSON.parse(storedKey);
        return await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            {
                name: 'AES-GCM',
            },
            true,
            ['encrypt', 'decrypt']
        );
    } catch (error) {
        console.error('Failed to import conversation key:', error);
        return null;
    }
}

/**
 * Gets a conversation key, generating and storing it if it doesn't exist.
 * This is a simplified placeholder for demonstration. In a real E2EE app,
 * the key must be securely shared between participants, not just generated locally.
 * @param conversationId The ID of the conversation.
 * @returns A promise that resolves to a CryptoKey.
 */
export async function getOrCreateConversationKey(conversationId: string): Promise<CryptoKey> {
    let key = await getConversationKey(conversationId);
    if (!key) {
        // This is a placeholder logic. In a real app, the key would be
        // created and securely shared with other participants.
        console.warn(`No key found for ${conversationId}. Generating a new one locally. This is not secure for multi-user chats.`);
        key = await generateConversationKey();
        await storeConversationKey(conversationId, key);
    }
    return key;
}