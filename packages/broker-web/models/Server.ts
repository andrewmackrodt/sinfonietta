import { Config, config } from './Config'
import { Message } from '@lib/common/socket/Message'

export class Server {
    protected readonly config: Config
    protected webSocket?: WebSocket
    protected webSocketUrl?: string

    protected event: EventTarget = new EventTarget()

    public constructor() {
        this.config = config
    }

    public async ping(): Promise<void> {
        await this.send('ping')
    }

    public async send(topic: string, data?: Record<string, unknown>): Promise<void> {
        const socket = await this.getWebSocket()
        const message: Message =  { topic: topic }

        if  (data) {
            message.data = data
        }

        socket.send(JSON.stringify(message))
    }

    protected async getWebSocket(): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            if ( ! this.webSocket) {
                const webSocket = new WebSocket(this.getWebSocketUrl())

                webSocket.onopen = (e) => {
                    this.webSocket = webSocket

                    return resolve(webSocket)
                }

                webSocket.onmessage = (e) => {
                    const msg: Message = JSON.parse(e.data)

                    this.event.dispatchEvent(new CustomEvent(msg.topic, { detail: msg }))
                }

                webSocket.onclose = (e) => {
                    if ( ! e.wasClean) {
                        console.error('broker-web socket closed', e)

                        delete this.webSocket
                    }
                }

                webSocket.onerror = (e) => {
                    console.error('broker-web socket error', e)

                    delete this.webSocket

                    reject(e)
                }
            } else {
                return resolve(this.webSocket)
            }
        })
    }

    protected getWebSocketUrl(): string {
        if ( ! this.webSocketUrl) {
            const protocol = window.location.protocol.replace(/^http/, 'ws')
            const hostname = window.location.hostname
            let url = `${protocol}//${hostname}`

            if (this.config.port) {
                url += `:${this.config.port}`
            }

            this.webSocketUrl = url
        }

        return this.webSocketUrl
    }
}

export const server = new Server()
