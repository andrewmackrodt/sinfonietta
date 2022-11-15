import { RequestHandler } from 'express'
import { constants } from 'http2'

const handler: RequestHandler = (req, res) => {
    if (typeof process.send !== 'function') {
        res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .contentType('text/plain; charset=utf-8')
            .send('# Internal Server Error')

        return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = async (message: any) => {
        if (typeof message === 'object'
            && message !== null
            && message.type === 'api:getMetricsRes'
        ) {
            try {
                res.status(constants.HTTP_STATUS_OK)
                    .contentType('text/plain; charset=utf-8')
                    .send(message.metrics)
            } finally {
                process.removeListener('message', fn)
            }
        }
    }

    process.on('message', fn)
    process.send({ type: 'api:getMetricsReq' })
}

export default handler
