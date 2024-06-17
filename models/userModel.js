const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'please tell your name']
    },
    email: {
        type: String,
        required: [true, 'please tell you email'],
        unique: true,
        lowercase: true, // convert the email entered into lowercase
        validate: [validator.isEmail, 'please enter a valid email address']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'please provide a password'],
        minlength: 8,
        select: false // so when in a query like getUser or getUsers --> password will not shown to user
    },
    passwordConfirm: {
        type: String,
        required: [true, 'confirm the password please'],
        validate: {
            validator: function(el) {
                // this only works on new document --> save or create, not update
                return el === this.password;
            },
            message: 'Type correct password!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// query middleware --> apply to all find methods to return only active users
userSchema.pre(/^find/, function(next) {
    this.find({active: {$ne: false}});
    next();
});

// document middleware
userSchema.pre('save', function(next) {
    if(!this.isModified('password') || this.isNew) {
        return next();
    }
    this.passwordChangedAt = Date.now() - 1000; // subtract 1 sec to ensure token is always created after passwordChange
    next();
})

userSchema.pre('save', async function(next) {
    // if user has updated email only, dont encrypt password again, so this will run only when password is updated or created a new user
    if(!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
    if(this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        console.log(changedTimeStamp, JWTTimeStamp);
        // return true --> if password is changed after JWT token is assigned
        return changedTimeStamp > JWTTimeStamp;
    }
    return false;
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10*60*1000; // expires in 10 minutes
    console.log(resetToken, this.passwordResetToken, this.passwordResetExpires);
    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;