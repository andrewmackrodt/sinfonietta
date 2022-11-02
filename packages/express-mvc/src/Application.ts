import { Scheduler } from './Scheduler'
import { container, DependencyContainer, injectable, InjectionToken } from './decorators/di'
import { info, error } from './helpers/debug'
import { BootService } from './services/BootService'
import { Service } from './services/Service'
import EventEmitter2 from 'eventemitter2'

@injectable()
export class Application {
    private readonly container: DependencyContainer
    private readonly events: EventEmitter2
    private readonly bootServices: BootService[]
    private readonly services: Service[]

    public constructor() {
        this.container = container.createChildContainer()
        this.events = new EventEmitter2()
        this.container.registerInstance(EventEmitter2, this.events)
        this.bootServices = []
        this.services = []
    }

    public registerBootServices(...services: BootService[]) {
        this.bootServices.push(...services)
    }

    public registerServices(...services: Service[]) {
        this.services.push(...services)
    }

    public resolve<T>(token: InjectionToken<T>, options?: Record<string, unknown>): T {
        let container = this.container

        if (options) {
            container = container.createChildContainer()

            for (const [k, v] of Object.entries(options)) {
                container.register(k, { useValue: v })
            }
        }

        return container.resolve(token)
    }

    public async start(): Promise<unknown> {
        if ( ! process.env.JEST_WORKER_ID) {
            process.on('SIGTERM', () => this.stop())

            let forceExitNextSigInt = false

            process.on('SIGINT', () => {
                if ( ! forceExitNextSigInt) {
                    this.stop()
                    forceExitNextSigInt = true
                } else {
                    process.exit(130)
                }
            })
        }

        for (const service of this.bootServices) {
            if (typeof service.isEnabled === 'function' && ! service.isEnabled()) {
                continue
            }
            await service.start()
        }

        const services: Service[] = [
            ...this.services,
            this.resolve(Scheduler),
        ]

        for (const service of services) {
            if (typeof service.isEnabled === 'function' && ! service.isEnabled()) {
                continue
            }
            this.events.on('app.start', () => service.start())
            this.events.on('app.shutdown', () => service.stop())
        }

        return this.events.emitAsync('app.start')
    }

    public async stop(): Promise<void> {
        let exitCode = 0
        try {
            await this.events.emitAsync('app.shutdown')
        } catch (e) {
            error('error during shutdown', e)
            exitCode = 255
        }
        if ( ! process.env.JEST_WORKER_ID) {
            process.exit(exitCode)
        } else {
            info(`shutdown: exit code ${exitCode}`)
        }
    }
}
