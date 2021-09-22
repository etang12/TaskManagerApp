const jwt = require('jsonwebtoken')
const User = require('../models/user')


const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        // decoded payload for the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // find user with correct id who has authentication value still stored in tokens array
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!user) {
            throw new Error()
        }

        // once user is authenticated, send user in the request to corresponding route
        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.'})
    }
}

module.exports = auth