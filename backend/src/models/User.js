const mongoose = require('mongoose');
const argon2 = require('argon2');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    secondaryPasswordHash: {
        type: String,
        select: false // Do not include by default in queries
    },
    // For E2EE Key Exchange (Signal Protocol)
    identityKey: { type: String },
    registrationId: { type: Number },
    preKeyBundle: {
        signedPreKey: {
            keyId: { type: Number },
            publicKey: { type: String },
            signature: { type: String }
        },
        oneTimePreKeys: [{
            keyId: { type: Number },
            publicKey: { type: String }
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
    lastSecretPriceView: {
        type: Date,
        default: Date.now
    },
    settings: {
        readReceiptsEnabled: {
            type: Boolean,
            default: false
        },
        secretPriceInterval: {
            type: Number,
            default: 12
        }
    }
});


UserSchema.pre('save', async function(next) {
    // The hashing is now expected to be done in the controller/service layer
    // before saving. This hook is now only for other potential pre-save logic.
    // We can still hash the secondary password here if it's set.
    if (this.isModified('secondaryPasswordHash') && this.secondaryPasswordHash) {
        this.secondaryPasswordHash = await argon2.hash(this.secondaryPasswordHash);
    }
    next();
});

UserSchema.methods.comparePassword = function(password) {
    return argon2.verify(this.passwordHash, password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;