const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = new express.Router()

// add new task to db
router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

// retrieve all tasks from db for currently logged in user only
// finds all tasks where owner value is equal to currently logged in user's id (sent from auth middleware function)
// GET /tasks?completed=true
// GET /tasks?limit=10&skip=20
// GET /tasks?sortBy=createdAt:desc
router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}

    // check if completed query is provided in request
    if (req.query.completed) {
        match.completed = req.query.completed === "true"
    }
    // check if sortBy query is provided in request
    // parses query and determines desc/asc order
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        console.log(parts)
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }
    try {
        // limit and skip options provided to include pagination
        const tasks = await Task.find({ owner: req.user._id, ...match }, null, { 
            limit: parseInt(req.query.limit), 
            skip: parseInt(req.query.skip),
            sort
        })
        // const tasks = await Task.find({owner: req.user._id})
        // await req.user.populate('tasks').execPopulate()
        res.send(tasks)
    } catch (e) {
        res.status(500).send()
    }
})

// retrieve task by id from db
router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        // const task = await Task.findById(_id)
        const task = await Task.findOne({ _id, owner: req.user._id })

        // 404 if task's owner id does not match request id (currently logged in user's id)
        if(!task) {
            return res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

// update task by id from db
// task's owner id must match currently logged in user's id (retrieved from auth middleware function as req.user._id)
// prevent users from tampering with each other's data
router.patch('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    const body = req.body
    // updates sets req.body into an array of keys
    const updates = Object.keys(req.body)
    const allowedUpdates = ['desc', 'completed']
    // checks if updates array contains keys not in allowedUpdates array
    // if there exists a key in updates that is not in allowedUpdates, then patch will fail
    const isValidUpdate = updates.every((update) => {
        return allowedUpdates.includes(update)
    }) 

    if(!isValidUpdate) {
        res.status(400).send({error: 'Invalid updates'})
    }

    try {
        const task = await Task.findOne({ _id, owner: req.user._id  })

        if (!task) {
            return res.status(404).send()
        }

        updates.forEach((update) => {
            task[update] = body[update]
        })
        
        await task.save()
        res.send(task)
    } catch (e) {
        console.log('what')
        res.status(400).send(e)
    }
})

// delete task by id from db
router.delete('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        // const task = await Task.findByIdAndDelete(_id)
        const task = await Task.findOneAndDelete({ _id, owner: req.user._id })

        if(!task) {
           return res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router