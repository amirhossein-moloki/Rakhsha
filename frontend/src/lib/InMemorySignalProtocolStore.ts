import { SignalProtocolStore, PreKeyType, SessionType, SignedPreKeyType, IdentityKeyPairType, KeyHelper, KeyPairType } from '@privacyresearch/libsignal-protocol-typescript';
import { Buffer } from 'buffer';

export class InMemorySignalProtocolStore implements SignalProtocolStore {
    private _preKeys: { [key: number]: ArrayBuffer } = {};
    private _signedPreKeys: { [key:number]: ArrayBuffer } = {};
    private _sessions: { [key: string]: ArrayBuffer } = {};
    private _identityKey: ArrayBuffer | undefined;
    private _localRegistrationId: number | undefined;

    constructor(identityKeyPair?: IdentityKeyPairType, registrationId?: number) {
        if (identityKeyPair) {
            this._identityKey = identityKeyPair.privKey;
        }
        this._localRegistrationId = registrationId;
    }

    put(key: string, value: any): Promise<void> {
        if (key === 'identityKey') {
            this._identityKey = value;
        } else if (key.startsWith('preKey')) {
            this._preKeys[parseInt(key.split('.')[1], 10)] = value;
        } else if (key.startsWith('signedPreKey')) {
            this._signedPreKeys[parseInt(key.split('.')[1], 10)] = value;
        } else if (key.startsWith('session')) {
            this._sessions[key.split('.')[1]] = value;
        }
        return Promise.resolve();
    }
    get(key: string, defaultValue: any): Promise<any> {
        if (key === 'identityKey') {
            return Promise.resolve(this._identityKey || defaultValue);
        } else if (key.startsWith('preKey')) {
            return Promise.resolve(this._preKeys[parseInt(key.split('.')[1], 10)] || defaultValue);
        } else if (key.startsWith('signedPreKey')) {
            return Promise.resolve(this._signedPreKeys[parseInt(key.split('.')[1], 10)] || defaultValue);
        } else if (key.startsWith('session')) {
            return Promise.resolve(this._sessions[key.split('.')[1]] || defaultValue);
        }
        return Promise.resolve(defaultValue);
    }
    remove(key: string): Promise<void> {
        if (key.startsWith('preKey')) {
            delete this._preKeys[parseInt(key.split('.')[1], 10)];
        } else if (key.startsWith('signedPreKey')) {
            delete this._signedPreKeys[parseInt(key.split('.')[1], 10)];
        } else if (key.startsWith('session')) {
            delete this._sessions[key.split('.')[1]];
        }
        return Promise.resolve();
    }

    async getIdentityKeyPair(): Promise<IdentityKeyPairType | undefined> {
        if (!this._identityKey) {
            return undefined;
        }
        const pubKey = (await KeyHelper.generateIdentityKeyPair(this._identityKey)).pubKey;
        return { pubKey, privKey: this._identityKey };
    }
    async getLocalRegistrationId(): Promise<number | undefined> {
        return this._localRegistrationId;
    }
    async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: number): Promise<boolean> {
        return Promise.resolve(true);
    }
    async loadPreKey(keyId: number): Promise<ArrayBuffer | undefined> {
        return this._preKeys[keyId];
    }
    async loadSession(identifier: string): Promise<string | undefined> {
        const session = this._sessions[identifier];
        if (session) {
            return session.toString();
        }
        return undefined;
    }
    async loadSignedPreKey(keyId: number): Promise<ArrayBuffer | undefined> {
        return this._signedPreKeys[keyId];
    }
    async removePreKey(keyId: number): Promise<void> {
        delete this._preKeys[keyId];
    }
    async removeSignedPreKey(keyId: number): Promise<void> {
        delete this._signedPreKeys[keyId];
    }
    async storePreKey(keyId: number, keyPair: KeyPairType): Promise<void> {
        this._preKeys[keyId] = keyPair.privKey;
    }
    async storeSignedPreKey(keyId: number, keyPair: KeyPairType): Promise<void> {
        this._signedPreKeys[keyId] = keyPair.privKey;
    }
    async storeSession(identifier: string, record: string): Promise<void> {
        this._sessions[identifier] = Buffer.from(record);
    }
    async loadIdentityKey(identifier: string): Promise<ArrayBuffer | undefined> {
        return undefined;
    }
    async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
        return Promise.resolve(true);
    }
    async getOurIdentity(): Promise<IdentityKeyPairType | undefined> {
        if (!this._identityKey) {
            return undefined;
        }
        const pubKey = (await KeyHelper.generateIdentityKeyPair(this._identityKey)).pubKey;
        return { pubKey, privKey: this._identityKey };
    }
}
