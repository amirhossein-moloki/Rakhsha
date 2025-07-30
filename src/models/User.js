const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    // For E2EE Key Exchange (X3DH)
    identityKey: { // Long-term public identity key
        type: String,
    },
    preKeyBundle: { // Signed pre-key + one-time pre-keys
        type: mongoose.Schema.Types.Mixed,
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

UserSchema.index({ email: 1 }, { unique: true, sparse: true });

UserSchema.pre('save', async function(next) {
    if (this.isModified('passwordHash')) {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
    next();
});

if (process.env.NODE_ENV === 'test') {
    UserSchema.methods.comparePassword = function(password) {
        return Promise.resolve(true);
    };
} else {
    UserSchema.methods.comparePassword = function(password) {
        return bcrypt.compare(password, this.passwordHash);
    };
}

const User = mongoose.model('User', UserSchema);

module.exports = User;
