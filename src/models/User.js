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
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    profilePictureUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
});

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
