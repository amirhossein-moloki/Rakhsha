const mongoose = require('mongoose');
const argon2 = require('argon2');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    secondaryPasswordHash: {
        type: String,
        select: false // Do not include by default in queries
    },
    // For E2EE Key Exchange (X3DH)
    identityKey: { // ECDH public identity key
        type: String,
        required: true
    },
    preKeyBundle: {
        signedPreKey: {
            publicKey: { type: String, required: true },
            signature: { type: String, required: true }
        },
        oneTimePreKeys: [{
            keyId: { type: Number, required: true },
            publicKey: { type: String, required: true }
        }]
    },
    profilePictureUrl: {
        type: String,
        default: ''
    },
    conversations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    settings: {
        readReceiptsEnabled: {
            type: Boolean,
            default: false
        }
    }
});


UserSchema.pre('save', async function(next) {
    if (this.isModified('passwordHash')) {
        this.passwordHash = await argon2.hash(this.passwordHash);
    }
    if (this.isModified('secondaryPasswordHash')) {
        this.secondaryPasswordHash = await argon2.hash(this.secondaryPasswordHash);
    }
    next();
});

UserSchema.methods.comparePassword = function(password) {
    return argon2.verify(this.passwordHash, password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
