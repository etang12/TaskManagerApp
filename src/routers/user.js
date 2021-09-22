const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCancelEmail } = require('../emails/accounts')
const router = new express.Router()

// add new user to db, user sign up
router.post('/users', async (req, res) => {
    const user = new User(req.body)
    
    try{
        await user.save()
        sendWelcomeEmail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) { 
        res.status(400).send(e)
    }
})

// login route and token (authentication) generator for specific user
// tokens are generated for each particular login session (like different devices logged in at the same time)
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send()
    }
})

// removes user's authentication token when logging out
router.post('/users/logout', auth, async (req, res) => {
    try {
        // checks if current logged in user's token is in tokens array
        // return true if token !== req.token (sent by the client and checked in auth)
        // return false if token === req.token meaning this is the correct token to remove from tokens array
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

// logout all instance's of currently logged in user (clear tokens array)
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

// retrieve user's own profile/data
// auth is middleware function stored in middleware/auth.js
// runs middleware before it runs the async function
// route only runs if user is properly authenticated due to auth
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

// update existing data of a user by id
router.patch('/users/me', auth, async (req, res) => {
    // updates = req.body as an array of keys
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    // checks if updates array contains keys not in allowedUpdates array
    // if there exists a key in updates that is not in allowedUpdates, then patch will fail
    const isValidUpdate = updates.every((update) => {
        return allowedUpdates.includes(update)
    })

    if (!isValidUpdate) {
        return res.status(400).send({error: 'Invalid updates!'})
    }

    try {
        updates.forEach((update) => {
            req.user[update] = req.body[update]
        })
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

// delete user from db
// req.user comes from auth
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        sendCancelEmail(req.user.email, req.user.name)
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

// set up multer middlewareß
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    // filters files to ensure that they are jpg, jpeg, or png by using regex
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(new Error('Please upload an image!'))
        }
        // accept the uploaded file
        cb(undefined, true)
    }
})

// upload profile picture using multer middleware library
// upload.single looks at form-data from request for 'avatar' key and picture as value
// stores binary data of 'avatar' into user db
// use sharp to resize all uploaded images and set them to png (for uniformity/standardization)
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

// removes 'avatar' binary data from user db
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
})

// allows users to see their avatar in browser
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)

        if (!user || !user.avatar) {
            throw new Error
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})

module.exports = router