import { info } from '../helpers/debug'
import { isFalseRegExp, isTrueRegExp } from '../helpers/stdlib'
import { env } from '../helpers/system'
import { builder, Builder } from '@lib/common/builder'
import { Server as OvernightServer } from '@overnightjs/core'
import { Controller, RouterLib } from '@overnightjs/core/lib/decorators/types'
import bodyParser from 'body-parser'
import compression from 'compression'
import cookieSession from 'cookie-session'
import cors, { CorsOptions } from 'cors'
import express, { Application, ErrorRequestHandler, RequestHandler } from 'express'
import { engine } from 'express-handlebars'
import express_prom_bundle from 'express-prom-bundle'
import PromiseRouter from 'express-promise-router'
import expressWs, { WebsocketRequestHandler } from 'express-ws'
import morgan from 'morgan'
import { AggregatorRegistry } from 'prom-client'
import { container, inject, injectable } from 'tsyringe'
import WebSocket from 'ws'
import cluster from 'cluster'
import fs from 'fs'
import { createServer, Server as HttpServer } from 'http'
import { constants } from 'http2'

export interface ServerOptions {
    compression?: boolean
    controllers?: Controller[]
    cookieSessionKey?: null | string | string[]
    cors?: boolean | CorsOptions
    errorHandler?: ErrorRequestHandler | null
    hostname?: string
    metrics?: boolean
    notFoundHandler?: RequestHandler | null
    port?: number | boolean
    router?: RouterLib
    socket?: string | boolean | null
    static?: boolean
    staticDenySourcemap?: boolean
    staticPath?: string | null
    staticProxy?: string | null
    timeout?: number
    trustProxy?: boolean
    ws?: boolean
    wsRoutes?: [string, WebsocketRequestHandler][]
}

export type ServerBuilder = Builder<ServerOptions, typeof Server>

@injectable()
export class Server {
    public static readonly DEFAULT_PORT: number = 8080
    public static readonly DEFAULT_SOCKET: string = '/tmp/express.sock'

    private readonly httpServer: HttpServer
    public readonly options: Required<ServerOptions>
    private readonly overnightServer: OvernightServer
    private readonly webSocketServer?: WebSocket.Server

    public static builder(): Builder<ServerOptions, typeof Server> {
        return builder<ServerOptions, typeof Server>(Server)
    }

    public constructor(@inject('http.server.options') options?: ServerOptions) {
        this.options = Object.freeze({
            compression: true,
            controllers: [],
            cookieSessionKey: null,
            cors: true,
            errorHandler: null,
            hostname: '0.0.0.0',
            metrics: true,
            notFoundHandler: null,
            port: 0,
            router: PromiseRouter,
            staticDenySourcemap: process.env.NODE_ENV === 'production',
            socket: null,
            static: false,
            staticPath: 'public',
            staticProxy: null,
            timeout: 30000,
            trustProxy: true,
            ws: false,
            wsRoutes: [],
            ...options,
        })

        this.overnightServer = new OvernightServer(false)

        this.httpServer = this.createHttpServer()

        if (this.options.ws) {
            this.webSocketServer = this.createWsServer()
        }

        this.configure()
    }

    public get app(): Application {
        return this.overnightServer.app
    }

    public start(): Promise<void> {
        const port = this.getPort()
        let isListening = false

        if (port) {
            isListening = true
            this.httpServer.listen(port, this.options.hostname, () => {
                info(`running server on port ${port}`)
            })
        }

        const socket = this.getSocket()

        if (socket) {
            isListening = true
            this.httpServer.listen(socket, () => {
                info(`running server on socket ${socket}`)
            })
        }

        return new Promise((resolve) => {
            if ( ! isListening) return resolve()

            this.httpServer.on('close', resolve)
        })
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => (
            this.httpServer.close((err) => {
                if (err) return reject(err)
                resolve(err)
            })
        ))
    }

    protected getPort(): number | undefined {
        if (typeof this.options.port === 'boolean') {
            if ( ! this.options.port) {
                return
            }
        } else {
            if (this.options.port < 0) {
                throw new Error('port number must be a positive')
            }

            if (this.options.port > 0) {
                return this.options.port
            }
        }

        if (env('PORT', '').length === 0 ||
            env('PORT') === '0' ||
            isTrueRegExp(env('PORT', ''))
        ) {
            return Server.DEFAULT_PORT
        }

        const parsed = Number.parseInt(env('PORT', ''))

        if (Number.isNaN(parsed)) {
            throw new Error('PORT must be a number')
        }

        return parsed
    }

    protected getSocket(): string | undefined {
        if (typeof this.options.socket === 'string') {
            return this.options.socket
        }

        if (
            this.options.socket === false ||
            (
                this.options.socket === null &&
                (
                    env('SOCKET', '').length === 0 ||
                    isFalseRegExp(env('SOCKET', ''))
                )
            )
        ) {
            return
        }

        if (isTrueRegExp(env('SOCKET', ''))) {
            return Server.DEFAULT_SOCKET
        }

        return env('SOCKET')
    }

    private configure(): void {
        this.app.disable('x-powered-by')

        if (this.options.trustProxy) {
            this.app.set('trust proxy', true)
        }

        this.app.use(bodyParser.json())

        if (this.options.compression) {
            this.app.use(compression())
        }

        if (this.options.cookieSessionKey) {
            let keys = this.options.cookieSessionKey

            if (typeof keys === 'string') {
                keys = [keys]
            }

            this.app.use(cookieSession({ keys }))
        }

        if (this.options.cors) {
            if (typeof this.options.cors === 'object') {
                this.app.use(cors(this.options.cors))
            } else {
                this.app.use(cors())
            }
        }

        this.app.use(morgan('combined', { stream: { write: msg => info(msg.trimEnd()) } }))

        if (this.options.metrics) {
            const promOpts: express_prom_bundle.Opts = { autoregister: true, includeMethod: true, includePath: true }

            if (cluster.isWorker) {
                new AggregatorRegistry()
                promOpts.autoregister = false
            }

            this.app.use(express_prom_bundle(promOpts))
        }

        this.app.engine('handlebars', engine())
        this.app.set('view engine', 'handlebars')
        this.app.set('views', './views')

        this.overnightServer.addControllers(
            this.options.controllers.map(c => {
                // resolve classes from the container if not a class instance
                if ( ! Object.getPrototypeOf(c)?.prototype) {
                    c = container.resolve(c)
                }
                return c
            }),
            this.options.router,
            (req, res, next) => next(),
        )

        if (this.options.static) {
            this.serveStatic()
        }

        if (this.options.notFoundHandler) {
            this.app.use(this.options.notFoundHandler)
        }

        if (this.options.errorHandler) {
            this.app.use(this.options.errorHandler)
        }
    }

    private createHttpServer(): HttpServer {
        const server = createServer(this.app)
        server.setTimeout(this.options.timeout)

        return server
    }

    private createWsServer(): WebSocket.Server {
        const instance = expressWs(this.app, this.httpServer)

        for (const [route, wsRequestHandler] of this.options.wsRoutes) {
            instance.app.ws(route, wsRequestHandler)
        }

        return instance.getWss()
    }

    private serveStatic(): void {
        if (this.options.staticDenySourcemap) {
            this.app.use('*', (req, res, next) => {
                if ( ! req.baseUrl.endsWith('.map')) {
                    return next()
                }
                res.status(constants.HTTP_STATUS_FORBIDDEN).send()
            })
        }

        if (this.options.staticProxy) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware

            const proxyRequestHandler = createProxyMiddleware({
                target: this.options.staticProxy,
                changeOrigin: true,
                ws: false,
            })

            this.app.use('*', (req, res, next) => {
                if (req.baseUrl == '/api' || req.baseUrl.startsWith('/api/')) {
                    return next()
                }
                return proxyRequestHandler(req, res, next)
            })
        }

        if (this.options.staticPath) {
            this.app.use(express.static(this.options.staticPath))

            if ( ! this.options.staticProxy) {
                try {
                    const index = fs.realpathSync(`${this.options.staticPath}/index.html`)

                    this.app.use((req, res) => {
                        res.sendFile(index)
                    })
                } catch (e) {
                    // TODO log error
                }
            }
        }
    }
}
