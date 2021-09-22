const express = require('express')
require('./db/mongoose')
const userRouter = require('./routers/user')
const taskRouter = require('./routers/task')

const app = express()
const port = process.env.PORT

// express middleware - execute some code before running through route handlers
// without middleware: request --> run route handler
// with middleware: request --> do something --> run route handler

//automatically parses incoming JSON to an object that can be accessed through request handlers
app.use(express.json())
// uses user/task routes defined in separate files
app.use(userRouter)
app.use(taskRouter)


app.listen(port, () => {
    console.log('Server is up on ' + port)
})