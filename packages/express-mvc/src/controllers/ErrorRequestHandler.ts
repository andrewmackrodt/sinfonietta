import { error } from '../helpers/debug'
import { ErrorRequestHandler } from 'express'
import { constants } from 'http2'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handler: ErrorRequestHandler = ((err, req, res, next) => {
    let status = constants.HTTP_STATUS_INTERNAL_SERVER_ERROR
    const data = {
        error: { message: 'An unknown error occurred please try again later.' } as Record<string, unknown>,
    }
    let obj = err
    let logError = true
    if (typeof obj === 'object') {
        if (typeof obj.message !== 'string' && typeof obj.error === 'object') {
            obj = obj.error

            if ('name' in obj && obj.name === 'ValidationError') {
                status = constants.HTTP_STATUS_BAD_REQUEST
                data.error.message = `Validation Error: ${obj.message}`
                data.error.details = obj.details
                obj = {}
                logError = false
            }
        }
        if (typeof obj.message === 'string' && obj.message !== '') {
            data.error.message = obj.message
        }
    }
    if (logError) {
        error(`Unhandled error processing request ${req.path}:`, err)
    }
    res.status(status).json(data)
})

export default handler
