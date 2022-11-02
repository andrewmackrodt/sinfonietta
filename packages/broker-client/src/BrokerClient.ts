import { builder, Builder } from '@lib/common/builder'
import axios, { AxiosError, AxiosInstance } from 'axios'

function isAxiosError(err: unknown): err is AxiosError {
    return typeof err === 'object'
        && err !== null
        && Object.getPrototypeOf(err).constructor.name === 'AxiosError'
}

//region interfaces
type ApiMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

interface Query {
    [key: string]: string | number | boolean
}

interface RequestParams {
    qs?: Query
    data?: { [key: string]: unknown }
}

type Response<T, U = unknown> =
    { res: T; err: null } |
    { res: null; err: AxiosError<U> }

export type ListMessagesOptions = {
    status?: string
    topic?: string
    after?: string
    before?: string
    direction?: 'asc' | 'desc'
    limit?: number
    cursor?: string
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
    claim_expires_at: string | null
    data: T
    event_log: object[]
    is_complete: boolean
    status: MessageStatus
    topic: string
    created_at: string
    updated_at: string
}

export interface BrokerClientOptions {
    axios?: AxiosInstance
}

interface PublishDataArray<T extends MessageData> {
    data: T
    maxAttempts?: number
}

export type BrokerClientBuilder = Builder<BrokerClientOptions, typeof BrokerClient>
//endregion

export class BrokerClient {
    public readonly axios: AxiosInstance

    public static builder(): Builder<BrokerClientOptions, typeof BrokerClient> {
        return builder<BrokerClientOptions, typeof BrokerClient>(BrokerClient)
    }

    public constructor(options?: BrokerClientOptions) {
        this.axios = options?.axios ?? axios.create()
    }

    public consume<T extends MessageData>(topic: string, limit = 1, timeout = 10) {
        return this.get<Message<T>[]>(`api/v1/topics/${topic}/consume`, { limit, timeout })
    }

    public publish<T extends MessageData>(topic: string, data: PublishDataArray<T>[]): Promise<Response<Message<T>[]>>
    public publish<T extends MessageData>(topic: string, data: T, maxAttempts?: number): Promise<Response<Message<T>>>

    public publish<T extends MessageData>(topic: string, data: PublishDataArray<T>[] | T, maxAttempts?: number) {
        if ( ! Array.isArray(data)) {
            return this.post<Message<T>>(`api/v1/topics/${topic}/produce`, {
                data,
                max_attempts: maxAttempts,
            })
        } else {
            return this.post<Message<T>[]>(`api/v1/topics/${topic}/produce`, data)
        }
    }

    public listMessages(options?: ListMessagesOptions) {
        return this.get<Message[]>('api/v1/messages', options)
    }

    protected async request<T>(
        method: ApiMethod,
        endpoint: string,
        params?: RequestParams,
    ): Promise<Response<T>> {
        const baseUrl = window.location.href.replace(/([A-Za-z0-9])\/.*/, '$1').replace(/\/$/, '')
        const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`

        try {
            const response = await this.axios(url, {
                headers: { 'Content-Type': 'application/json' },
                method,
                ...(params?.qs ? { params: params.qs } : {}),
                ...(params?.data ? { data: params.data } : {}),

            })

            return { res: response.data, err: null }
        } catch (err) {
            if ( ! isAxiosError(err)) {
                throw err
            }

            return { res: null, err }
        }
    }

    protected async get<T>(endpoint: string, qs?: Query): Promise<Response<T>> {
        return this.request('get', endpoint, { qs: qs as Record<string, string> })
    }

    protected async post<T, U extends { [key: string]: unknown } = {}>(
        endpoint: string,
        data?: U,
    ): Promise<Response<T>> {
        return this.request('post', endpoint, { data })
    }
}
