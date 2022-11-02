import { Message, MessageRepository } from '../repositories/MessageRepository'
import { waitUntilNotEmpty } from '@lib/common/poll'
import { Controller, Middleware, Get } from '@lib/express-mvc/decorators/controller'
import { Response } from 'express'
import { ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema } from 'express-joi-validation'
import Joi from 'joi'

const validator = createValidator({ passError: true })

interface ProduceQuerySchema extends ValidatedRequestSchema {
    [ContainerTypes.Query]: {
        batch: boolean
        count: number
        topic: string
    }
}

const produceQuerySchema = Joi.object({
    batch: Joi.boolean().default(false),
    count: Joi.number().min(1).max(1000).default(1),
    topic: Joi.string().min(4).regex(/^[A-Za-z](?:[A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)*$/).default('debug'),
})

interface ConsumeQuerySchema extends ValidatedRequestSchema {
    [ContainerTypes.Query]: {
        limit: number
        timeout: number
        topic: string
    }
}

const consumeQuerySchema = Joi.object({
    limit: Joi.number().min(0).max(50).default(1),
    timeout: Joi.number().min(0).max(120).default(10),
    topic: Joi.string().min(4).regex(/^[A-Za-z](?:[A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)*$/).default('debug'),
})

@Controller('debug')
export class DebugController {
    private readonly messageRepository: MessageRepository

    public constructor(messageRepository: MessageRepository) {
        this.messageRepository = messageRepository
    }

    @Middleware(validator.query(produceQuerySchema))
    @Get('produce')
    public async produceRequestHandler(req: ValidatedRequest<ProduceQuerySchema>, res: Response): Promise<void> {
        let messages: Message[]

        if (req.query.batch) {
            messages = await this.messageRepository.create(
                new Array(req.query.count).fill(null).map(() => ({
                    topic: req.query.topic,
                    data: { random: Math.random() },
                    maxAttempts: 100,
                })))
        } else {
            messages = []

            for (let i = 0; i < req.query.count; i++) {
                const data = { random: Math.random() }
                const message = await this.messageRepository.create(req.query.topic, data, 100)

                messages.push(message)
            }
        }

        res.json(messages)
    }

    @Middleware(validator.query(consumeQuerySchema))
    @Get('consume')
    public async consumeRequestHandler(req: ValidatedRequest<ConsumeQuerySchema>, res: Response): Promise<void> {
        const jobs = (
            await waitUntilNotEmpty(
                () => this.messageRepository.claim(req.query.topic, req.query.limit),
                req.query.timeout * 1000)
        ) ?? []

        res.json(jobs)
    }
}
