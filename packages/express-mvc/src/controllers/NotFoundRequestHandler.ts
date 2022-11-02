import { RequestHandler } from 'express'
import { constants } from 'http2'

const handler: RequestHandler = ((req, res) => {
    res.status(constants.HTTP_STATUS_NOT_FOUND).json({
        error: { message: 'Not Found' },
    })
})

export default handler
