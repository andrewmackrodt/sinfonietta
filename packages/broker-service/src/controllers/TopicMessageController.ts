import { MessageRepository, MessageStatus } from '../repositories/MessageRepository'
import { Controller, ClassMiddleware, Middleware, Get, Post } from '@lib/express-mvc/decorators/controller'
import { Response } from 'express'
import { ContainerTypes, ValidatedRequest, ValidatedRequestSchema, createValidator } from 'express-joi-validation'
import Joi from 'joi'
import { constants } from 'http2'

const validator = createValidator({ passError: true })
const joiUuid = Joi.string().length(36).regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)

const listQuerySchema = Joi.object({
    after: Joi.string().isoDate().when('afterId', { then: Joi.required() }),
    before: Joi.string().isoDate().when('beforeId', { then: Joi.required() }),
    cursor: Joi.string().base64(),
    direction: Joi.string().valid('asc', 'desc').default('asc'),
    limit: Joi.number().min(0).max(100).default(10),
    status: Joi.string().valid(...Object.values(MessageStatus)),
})

interface ListQuerySchema extends ValidatedRequestSchema {
    [ContainerTypes.Query]: {
        after?: string
        before?: string
        cursor?: string
        direction: 'asc' | 'desc'
        limit: number
        status?: MessageStatus
    }
}

@ClassMiddleware(validator.params(Joi.object({
    topic: Joi.string().min(4).regex(/^[A-Za-z](?:[A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)*$/).required(),
})))
@Controller('api/v1/topics/:topic/messages')
export class TopicMessageController {
    private readonly messageRepository: MessageRepository

    public constructor(messageRepository: MessageRepository) {
        this.messageRepository = messageRepository
    }

    @Middleware(validator.query(listQuerySchema))
    @Get()
    public async listMessages(req: ValidatedRequest<ListQuerySchema>, res: Response): Promise<void> {
        const messages = await this.messageRepository.list({
            ...req.query,
            ...{ topic: req.params.topic },
        })

        res.json(messages)
    }

    @Middleware(validator.params(Joi.object({
        topic: Joi.string().min(4).regex(/^[a-z]+$/).required(),
        id: joiUuid.required(),
    })))
    @Get(':id')
    public async getMessage(req: ValidatedRequest<ListQuerySchema>, res: Response): Promise<void> {
        const message = await this.messageRepository.get(req.params.id)
        if (message && message.topic === req.params.topic) {
            res.json(message)
        } else {
            res.status(constants.HTTP_STATUS_NOT_FOUND).json({ error: { code: 'not_found' } })
        }
    }
}
