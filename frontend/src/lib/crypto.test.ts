import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from './crypto';
import { PersistentSignalProtocolStore } from './PersistentSignalProtocolStore';
import useAuthStore from '@/store/authStore';
import useUserStore from '@/store/userStore';
import api from '@/api/axios';
import localforage from 'localforage';

// --- Mocks ---
vi.mock('@/store/authStore');
vi.mock('@/store/userStore');
vi.mock('@/api/axios');

const memoryStore: { [key: string]: any } = {};
vi.mock('localforage', () => ({
    default: {
        getItem: vi.fn(key => Promise.resolve(memoryStore[key] || null)),
        setItem: vi.fn((key, value) => {
            memoryStore[key] = value;
            return Promise.resolve(value);
        }),
        clear: vi.fn(() => {
            Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
            return Promise.resolve();
        }),
    },
}));

describe('Crypto Library', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(localforage.clear)();
        // Reset the singleton store in crypto.ts before each test
        crypto._resetSignalStore();
    });

    it('should generate identity with correct structure', async () => {
        const identity = await crypto.generateIdentity();
        expect(identity).toHaveProperty('_private');
        expect(identity).toHaveProperty('public');
    });

    it('should encrypt and decrypt a message successfully', async () => {
        const aliceIdentity = await crypto.generateIdentity();
        const bobIdentity = await crypto.generateIdentity();

        // --- Step 1: Alice encrypts a message for Bob ---

        // Initialize Alice's store
        crypto.getSignalStore(aliceIdentity._private);

        const bobUser = {
            _id: 'bob',
            username: 'bob',
            ...bobIdentity.public
        };

        // Mock API to return Bob's public bundle
        vi.mocked(api.get).mockResolvedValue({
            data: { ...bobIdentity.public },
        });

        const message = "Hello Bob!";
        const encryptedMessage = await crypto.encryptMessage(bobUser, message);
        expect(encryptedMessage).toBeDefined();

        // --- Step 2: Bob decrypts the message from Alice ---

        // Reset the singleton store to simulate a different user
        crypto._resetSignalStore();

        // Initialize Bob's store
        crypto.getSignalStore(bobIdentity._private);


        const decryptedMessage = await crypto.decryptMessage(
            aliceIdentity.public.identityKey,
            aliceIdentity.public.registrationId,
            encryptedMessage
        );

        expect(decryptedMessage).toBe(message);
    });
});