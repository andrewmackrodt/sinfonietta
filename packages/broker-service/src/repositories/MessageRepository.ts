import { RethinkDB } from '../database/RethinkDB'
import { PaginationOptions, parseCursor } from '@lib/common/cursor'
import { config, injectable } from '@lib/express-mvc/decorators/di'
import { info } from '@lib/express-mvc/helpers/debug'
import * as r from 'rethinkdb'
import { InsertExpression } from 'rethinkdb'
import os from 'os'

export enum ListIndexes {
    LIST_BY_TOPIC_HAVING_STATUS = 'topic_status_created_at_id',
    LIST_BY_TOPIC = 'topic_created_at_id',
    LIST_BY_STATUS = 'status_created_at_id',
    LIST_BY_CREATED_AT = 'created_at_id',
}

export interface ListOptions extends PaginationOptions {
    status?: string
    topic?: string
}

type CreateObjectType<T> = {
    topic: string
    data: T
    maxAttempts?: number
}

export enum MessageStatus {
    PENDING = 'pending',
    IN_FLIGHT = 'in_flight',
    ACK = 'ack',
    FAILED = 'failed',
}

type MessageData = Record<string, unknown>

export interface Message<T extends MessageData = {}> {
    id: string
    attempts: number
    attempts_remaining: number
    claim_identity: string | null
    claim_expires_at: Date | null
    data: T
    event_log: object[]
    is_complete: boolean
    status: MessageStatus
    topic: string
    created_at: Date
    updated_at: Date
}

@injectable()
export class MessageRepository {
    public static readonly TABLE_NAME = 'messages'

    public constructor(
        private readonly db: RethinkDB,
        @config('${queue.claim.default.ttl:120}') private readonly defaultTtl: number,
        @config('${queue.claim.default.max-attempts:100}') private readonly defaultMaxAttempts: number,
    ) { }

    public async list(options?: ListOptions): Promise<Message[]> {
        let before = options?.before ? new Date(options.before) : null
        let beforeExpr: ((doc: r.Expression<unknown>) => r.Expression<boolean>) | undefined
        let after = options?.after ? new Date(options.after) : null
        let afterExpr: ((doc: r.Expression<unknown>) => r.Expression<boolean>) | undefined
        let direction = options?.direction ?? 'asc'
        let isInverseOrderBy = false

        if (options?.cursor) {
            const cursor = parseCursor(options.cursor)
            if (cursor.direction === 'asc') {
                after = new Date(cursor.timestamp)
                if (cursor.id) {
                    afterExpr = <T>(doc: r.Expression<T>) => (
                        cursor.comparator[1] === 't'
                            ? doc('id').gt(cursor.id)
                            : doc('id').ge(cursor.id)
                    )
                }
            } else {
                before = new Date(cursor.timestamp)
                if (cursor.id) {
                    beforeExpr = <T>(doc: r.Expression<T>) => (
                        cursor.comparator[1] === 't'
                            ? doc('id').lt(cursor.id)
                            : doc('id').le(cursor.id)
                    )
                }
            }
            if (cursor.direction !== direction) {
                direction = cursor.direction
                isInverseOrderBy = true
            }
        }

        const leftBound : (string | number | Date | Function)[] = [after  ?? r.minval, r.minval]
        const rightBound: (string | number | Date | Function)[] = [before ?? r.maxval, r.maxval]
        let index = ListIndexes.LIST_BY_CREATED_AT

        if (options?.topic && options?.status) {
            leftBound.unshift(options.status)
            rightBound.unshift(options.status)
            leftBound.unshift(options.topic)
            rightBound.unshift(options.topic)
            index = ListIndexes.LIST_BY_TOPIC_HAVING_STATUS
        } else if (options?.topic) {
            leftBound.unshift(options.topic)
            rightBound.unshift(options.topic)
            index = ListIndexes.LIST_BY_TOPIC
        } else if (options?.status) {
            leftBound.unshift(options.status)
            rightBound.unshift(options.status)
            index = ListIndexes.LIST_BY_STATUS
        }

        let query = r.table(MessageRepository.TABLE_NAME)
            .between(leftBound, rightBound, {
                index,
                left_bound  : 'open',
                right_bound : 'open',
            })

        if (direction === 'desc') {
            query = query.orderBy({ index: r.desc(index) })
        } else {
            query = query.orderBy({ index })
        }

        if (after) {
            query = query.filter(doc => {
                let expr = doc('created_at').gt(after)
                if (afterExpr) {
                    expr = expr.or(doc('created_at').eq(after).and(afterExpr(doc)))
                }
                return expr
            })
        }

        if (before) {
            query = query.filter(doc => {
                let expr = doc('created_at').lt(before)
                if (beforeExpr) {
                    expr = expr.or(doc('created_at').eq(before).and(beforeExpr(doc)))
                }
                return expr
            })
        }

        query = query.limit(options?.limit ?? 100)

        const rows = await this.db.withConnection(async conn => (
            query.run(conn).then(cursor => cursor.toArray())
        ))

        return ! isInverseOrderBy ? rows : rows.reverse()
    }

    public async get(id: string): Promise<Message | null> {
        return this.db.withConnection(async conn => (
            r.table<Message>(MessageRepository.TABLE_NAME).get(id).run(conn)
        ))
    }

    public async ack(id: string): Promise<Message | { error: unknown }> {
        const writeResult = await this.db.withConnection(async conn => (
            r.table<Message>(MessageRepository.TABLE_NAME)
                .get(id)
                .update(r.branch<Message>(
                    r.row('status').eq(MessageStatus.IN_FLIGHT).and(
                    r.row('claim_expires_at').gt(r.now())),
                    {
                        attempts_remaining: 0,
                        claim_identity: null,
                        claim_expires_at: null,
                        event_log: r.row('event_log').append({ event_type: 'ack', timestamp: r.now() }),
                        is_complete: true,
                        status: MessageStatus.ACK,
                        updated_at: r.now(),
                    },
                    {},
                ), {
                    returnChanges: true,
                })
                .run(conn)
        ))

        if (writeResult.skipped) {
            return { error: { code: 'not_found', message: 'Message not found' } }
        }

        if (writeResult.unchanged) {
            return { error: {
                code: 'not_in_flight',
                message: 'Message could not be acknowledged because it is not in-flight or the claim has expired',
            } }
        }

        return writeResult.changes[0].new_val
    }

    public async create<T extends MessageData>(messages: CreateObjectType<T>[]): Promise<Message<T>[]>
    public async create<T extends MessageData>(topic: string, data: T, maxAttempts: number): Promise<Message<T>>

    public async create<T extends MessageData>(
        topic: string | CreateObjectType<T>[],
        data?: T,
        maxAttempts?: number,
    ): Promise<Message<T> | Message<T>[]> {
        const insertData: InsertExpression<Message<T>>[] =
            ( ! Array.isArray(topic) ? [{ topic, data, maxAttempts }] : topic)
                .map(obj => ({
                    attempts: 0,
                    attempts_remaining: obj.maxAttempts ?? this.defaultMaxAttempts,
                    claim_identity: null,
                    claim_expires_at: r.now(),
                    data: obj.data as any,
                    event_log: [],
                    is_complete: false,
                    status: MessageStatus.PENDING,
                    topic: obj.topic,
                    created_at: r.now(),
                    updated_at: r.now(),
                }))

        const queryResult = await this.db.withConnection(async conn => (
            r.table<Message<T>>(MessageRepository.TABLE_NAME)
                .insert(insertData, { returnChanges: true })
                .run(conn)
        ))

        if (queryResult.errors) {
            throw queryResult.first_error
        }

        const messages = queryResult.changes?.map(change => change.new_val) ?? []

        if ( ! Array.isArray(topic)) {
            return messages[0]
        } else {
            return messages
        }
    }

    public async disclaimInFlightExpiredMessages(): Promise<Message[]> {
        info('disclaiming expired in-flight messages')

        const queryResult = await this.db.withConnection(async conn => {
            return r.table<Message>(MessageRepository.TABLE_NAME)
                .between(
                    [MessageStatus.IN_FLIGHT, r.minval],
                    [MessageStatus.IN_FLIGHT, r.now()],
                    { index: 'status_claim_expires_at' },
                )
                .update(
                    r.branch<Message>(
                        r.row('attempts_remaining').gt(0),
                        // timeout message with remaining attempts
                        {
                            claim_identity: null,
                            claim_expires_at: r.now(),
                            event_log: r.row('event_log').append({ event_type: 'timeout', timestamp: r.now() }),
                            status: MessageStatus.PENDING,
                            updated_at: r.now(),
                        },
                        // fail message with no remaining attempts
                        {
                            claim_identity: null,
                            claim_expires_at: null,
                            event_log: r.row('event_log')
                                .append({ event_type: 'timeout', timestamp: r.now() })
                                .append({ event_type: 'fail', timestamp: r.now() }),
                            is_complete: true,
                            status: MessageStatus.FAILED,
                            updated_at: r.now(),
                        },
                    ), {
                        returnChanges: true,
                    })
                .run(conn)
        })

        const messages = (typeof queryResult.changes !== 'undefined' ? queryResult.changes : [])
            .map(change => {
                const row = change.new_val
                info({
                    message: 'disclaim expired message',
                    topic: row.topic,
                    id: row.id,
                    status: row.status,
                    attempts_remaining: row.attempts_remaining,
                })

                return change.new_val
            })

        if (queryResult.errors) {
            throw queryResult.first_error
        }

        return messages
    }

    public async claim<T extends MessageData>(topic: string, limit = 1): Promise<Message<T>[]> {
        const queryResult = await this.db.withConnection(async conn => {
            return r.table<Message<T>>(MessageRepository.TABLE_NAME)
                .between(
                    [topic, false, r.minval],
                    [topic, false, r.now()],
                    { index: 'topic_is_complete_claim_expires_at' },
                )
                .orderBy({ index: 'topic_is_complete_claim_expires_at' })
                .limit(limit)
                .update(
                    r.branch<Message<T>>(
                        r.row('claim_expires_at').le(r.now()),
                        r.branch<Message<T>>(
                            r.row('attempts_remaining').gt(0),
                            // claim message with remaining attempts
                            {
                                attempts: r.row('attempts').add(1),
                                attempts_remaining: r.row('attempts_remaining').sub(1),
                                claim_identity: `${os.hostname()}:${process.pid}`,
                                claim_expires_at: r.now().add(this.defaultTtl),
                                event_log: r.branch(
                                    r.row('status').eq(MessageStatus.IN_FLIGHT),
                                    // re-claim message in-flight
                                    r.row('event_log')
                                        .append({ event_type: 'timeout', timestamp: r.now() })
                                        .append({ event_type: 'claim', timestamp: r.now() }),
                                    // claim new message
                                    r.row('event_log').append({ event_type: 'claim', timestamp: r.now() }),
                                ),
                                status: MessageStatus.IN_FLIGHT,
                                updated_at: r.now(),
                            },
                            // fail message with no remaining attempts
                            {
                                claim_identity: null,
                                claim_expires_at: null,
                                event_log: r.row('event_log').append({ event_type: 'fail', timestamp: r.now() }),
                                is_complete: true,
                                status: MessageStatus.FAILED,
                                updated_at: r.now(),
                            },
                        ),
                        {},
                    ), {
                        returnChanges: true,
                    })
                .run(conn)
        })

        const messages = (typeof queryResult.changes !== 'undefined' ? queryResult.changes : [])
            .map(change => change.new_val)
            .filter(row => {
                if (row.is_complete) {
                    info('failed message', row.id)
                }

                return ! row.is_complete
            })

        if (queryResult.errors) {
            throw queryResult.first_error
        }

        return messages
    }
}
