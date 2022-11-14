import { MessageRepository } from '../repositories/MessageRepository'
import { waitUntilNotEmpty } from '@lib/common/poll'
import { Controller, ClassMiddleware, Middleware, Get, Post } from '@lib/express-mvc/decorators/controller'
import { Response } from 'express'
import { ContainerTypes, ValidatedRequest, ValidatedRequestSchema, createValidator } from 'express-joi-validation'
import Joi from 'joi'

const validator = createValidator({ passError: true })

interface ProduceBody {
    data: Record<string, unknown>
    max_attempts: number
}

interface ProduceQuerySchema extends ValidatedRequestSchema {
    [ContainerTypes.Params]: {
        topic: string
    }

    [ContainerTypes.Body]: ProduceBody | ProduceBody[]
}

const produceItemSchema = Joi.object({
    data: Joi.object().required(),
    max_attempts: Joi.number().min(1).max(100).default(100),
})

const produceBodySchema = Joi.alternatives().try(
    produceItemSchema,
    Joi.array().items(produceItemSchema),
)

interface ConsumeQuerySchema extends ValidatedRequestSchema {
    [ContainerTypes.Params]: {
        topic: string
    }

    [ContainerTypes.Query]: {
        limit: number
        timeout: number
        topic: string
    }
}

const consumeQuerySchema = Joi.object({
    limit: Joi.number().min(0).max(50).default(1),
    timeout: Joi.number().min(0).max(120).default(10),
})

@ClassMiddleware(validator.params(Joi.object({
    topic: Joi.string().min(4).regex(/^[A-Za-z](?:[A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)*$/).required(),
})))
@Controller('api/v1/topics/:topic')
export class TopicBrokerController {
    private readonly messageRepository: MessageRepository

    public constructor(messageRepository: MessageRepository) {
        this.messageRepository = messageRepository
    }

    @Middleware(validator.body(produceBodySchema))
    @Post('produce')
    public async produce(req: ValidatedRequest<ProduceQuerySchema>, res: Response) {
        const messageDataList = (Array.isArray(req.body) ? req.body : [req.body])
            .map(messageData => ({
                ...{ topic: req.params.topic },
                ...messageData,
            }))

        const messages = await this.messageRepository.create(messageDataList)

        if (Array.isArray(req.body)) {
            res.json(messages)
        } else {
            res.json(messages[0])
        }
    }

    @Middleware(validator.query(consumeQuerySchema))
    @Get('consume')
    public async consume(req: ValidatedRequest<ConsumeQuerySchema>, res: Response) {
        const jobs = (
            await waitUntilNotEmpty(
                () => this.messageRepository.claim(req.params.topic, req.query.limit),
                req.query.timeout * 1000)
        ) ?? []

        res.json(jobs)
    }
}
