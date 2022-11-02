import { Server } from '../http/Server'
import { Service } from './Service'
import { singleton } from 'tsyringe'

@singleton()
export class HttpService implements Service {
    private readonly server: Server

    public constructor(server: Server) {
        this.server = server
    }

    public get app() {
        return this.server.app
    }

    public start() {
        return this.server.start()
    }

    public stop() {
        return this.server.stop()
    }
}
