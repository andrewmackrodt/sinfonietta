import { error } from './helpers/debug'
import { Service } from './services/Service'
import { singleton } from 'tsyringe'

export interface RepeatCancellable {
    cancelFn: () => void
    promise: Promise<void>
}

interface Timeout {
    cancellable: RepeatCancellable
    timeout: NodeJS.Timeout
}

@singleton()
export class Scheduler implements Service {
    private readonly generators: (() => Promise<unknown>)[] = []
    private readonly promises: Promise<unknown>[] = []
    private readonly timeouts: Timeout[] = []

    private isStarted = false
    private isShutdown = false

    private stopFn?: () => void

    public async start(): Promise<void> {
        while (this.generators.length > 0) {
            const generator = this.generators.splice(0, 1)[0]
            const promise = this.getPromise(generator)
            this.promises.push(promise)
        }

        this.isStarted = true

        // keep scheduler alive after all promises fulfilled
        return new Promise<void>(async resolve => {
            this.stopFn = resolve
        })
    }

    public async stop(): Promise<void> {
        this.isShutdown = true

        if (this.stopFn) {
            await this.stopFn()

            delete this.stopFn
        }

        while (this.timeouts.length > 0) {
            const { timeout, cancellable } = this.timeouts.splice(0, 1)[0]
            cancellable.cancelFn()
        }

        await Promise.allSettled(this.promises)

        this.isStarted = false
    }

    public once<T>(generator: () => Promise<T>) {
        if (this.isStarted) {
            this.promises.push(this.getPromise(generator))
        } else {
            this.generators.push(generator)
        }
    }

    public repeatWithDelay(generator: () => Promise<unknown>, delayMillis: number): RepeatCancellable {
        const cancellable: RepeatCancellable = {
            promise: Promise.resolve(),
            cancelFn: () => null,
        }

        cancellable.promise = new Promise<void>(resolveCancellable => {
            const repeat = async (
                resolveRepeat: (value: void) => void,
                reject: (err: unknown) => void,
                timeout?: Timeout,
            ) => {
                cancellable.cancelFn = () => {
                    if (timeout) {
                        clearTimeout(timeout.timeout)

                        const index = this.timeouts.indexOf(timeout)

                        if (index !== -1) {
                            this.timeouts.splice(index, 1)
                        }
                    }

                    resolveRepeat()
                    resolveCancellable()
                }

                if (this.isShutdown) {
                    return cancellable.cancelFn()
                }

                try {
                    await generator()
                } catch (err) {
                    error(err)
                }

                if ( ! this.isShutdown) {
                    if (timeout) {
                        timeout.timeout.refresh()
                    } else {
                        timeout = {
                            timeout: setTimeout(() => repeat(resolveRepeat, reject, timeout), delayMillis),
                            cancellable,
                        }

                        this.timeouts.push(timeout)
                    }
                } else {
                    cancellable.cancelFn()
                }
            }

            if (this.isStarted) {
                this.promises.push(this.getPromise(() => new Promise(repeat)))
            } else {
                this.generators.push(() => new Promise(repeat))
            }
        })

        return cancellable
    }

    private getPromise(generator: () => Promise<unknown>) {
        const promise = generator()
            .catch(err => error(err))
            .finally(() => {
                const index = this.promises.indexOf(promise)

                if (index !== -1) {
                    this.promises.splice(index, 1)
                }
            })

        return promise
    }
}
