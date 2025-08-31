import { SignalProtocolStore, PreKeyType, SessionType, SignedPreKeyType, IdentityKeyPairType, KeyPairType } from '@privacyresearch/libsignal-protocol-typescript';
import useSessionStore from '@/store/sessionStore';

// A SignalProtocolStore that uses Zustand for persisting sessions
export class PersistentSignalProtocolStore implements SignalProtocolStore {
    private _identityKeyPair: IdentityKeyPairType;
    private _registrationId: number;
    private _preKeys: { [key: number]: KeyPairType } = {};
    private _signedPreKeys: { [key: number]: KeyPairType } = {};

    constructor(identityKeyPair: IdentityKeyPairType, registrationId: number) {
        this._identityKeyPair = identityKeyPair;
        this._registrationId = registrationId;
    }

    getIdentityKeyPair(): Promise<IdentityKeyPairType> {
        return Promise.resolve(this._identityKeyPair);
    }

    getLocalRegistrationId(): Promise<number> {
        return Promise.resolve(this._registrationId);
    }

    isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: number): Promise<boolean> {
        // In a real app, you would check the identity key against a stored contact list
        // For this example, we trust all identities
        return Promise.resolve(true);
    }

    loadPreKey(keyId: number): Promise<KeyPairType | undefined> {
        return Promise.resolve(this._preKeys[keyId]);
    }

    storePreKey(keyId: number, keyPair: KeyPairType): Promise<void> {
        this._preKeys[keyId] = keyPair;
        return Promise.resolve();
    }

    removePreKey(keyId: number): Promise<void> {
        delete this._preKeys[keyId];
        return Promise.resolve();
    }

    loadSignedPreKey(keyId: number): Promise<KeyPairType | undefined> {
        return Promise.resolve(this._signedPreKeys[keyId]);
    }

    storeSignedPreKey(keyId: number, keyPair: KeyPairType): Promise<void> {
        this._signedPreKeys[keyId] = keyPair;
        return Promise.resolve();
    }

    removeSignedPreKey(keyId: number): Promise<void> {
        delete this._signedPreKeys[keyId];
        return Promise.resolve();
    }

    loadSession(identifier: string): Promise<string | undefined> {
        const session = useSessionStore.getState().getSession(identifier);
        return Promise.resolve(session);
    }

    storeSession(identifier: string, record: string): Promise<void> {
        useSessionStore.getState().setSession(identifier, record);
        return Promise.resolve();
    }

    // These methods are not needed for the client side of the protocol
    // but are required by the interface.
    async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
        return undefined;
    }

    async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
        return Promise.resolve(true);
    }
}
