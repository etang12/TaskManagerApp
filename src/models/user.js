const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Age must be a positive number.')
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,
        validate(value) {
            if (validator.contains(value.toLowerCase(), 'password')) {
                throw new Error("Password cannot contain 'password'.")
            }
        }
    },
    avatar: {
        type: Buffer
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})

// virtual property - relationship between two entities (not stored in database)
// local field is the relationship between the user's ID and task
// foreign field is the name of the field on the other schema (task) that will create the relationship
userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

// methods are accessible on the instance (instance methods)
// generates authentication tokens using jsonwebtoken
// each user will have their very own auth tokens to prevent others from modifying their data
userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, 'secretstring')

    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

// format user data to prevent sending of sensitive information like passwords and tokens
// in user routes, when using res.send(), express automatically calls JSON.stringify()
// stringify uses return statement from toJSON to manipulate user object
userSchema.methods.toJSON = function () {
    const user = this
    // sets user to raw user data (no mongoose influence)
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}

// create Mongoose function that finds user based on email and password within databasa/schema
// static methods are accessible on the model (model methods)
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })

    if (!user) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new Error('Unable to login')
    }

    return user
}

// Hash plaintext password before saving user to database
// middleware - execute code before or after an event (Ex. user.save() or user validation)
// execute function on user schema before save event
// 'this' is the document being saved, gives access to individual user that is about to be saved
userSchema.pre('save', async function (next) {
    const user = this
    console.log('just before saving')

    // checks if user is modifying password via creation/update
    // only runs password hashing code when creating user or updating user's password
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    // next() signals the end of function execution to prevent code from hanging and never saving user
    next()
})

// Middleware - Delete user tasks when user is removed
userSchema.pre('remove', async function (next) {
    const user = this
    await Task.deleteMany({ owner: user._id })
    next()
})
const User = mongoose.model('User', userSchema)

module.exports = User