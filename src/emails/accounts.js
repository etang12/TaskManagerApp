const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'etang12@ucsc.edu',
        subject: 'Welcome to the Task Manager app!',
        text: `Thanks for joining the Task Manager app, ${name}! I hope you find this app useful! Feel free to contact us with any concerns.`
    })
}

const sendCancelEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'etang12@ucsc.edu',
        subject: 'Sorry to see you leave...',
        text: `Goodbye, ${name}. We hope to see you again soon! Would you care to provide the reason for your cancellation? Thanks!.`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancelEmail
}