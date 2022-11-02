import { MessageRepository } from '../repositories/MessageRepository'
import { Scheduler, RepeatCancellable } from '@lib/express-mvc/Scheduler'
import { config, singleton } from '@lib/express-mvc/decorators/di'
import { isPrimaryOrElectedWorker } from '@lib/express-mvc/helpers/cluster'
import { Service } from '@lib/express-mvc/services/Service'

@singleton()
export class MessageService implements Service {
    private cancellable?: RepeatCancellable

    public constructor(
        private readonly messageRepository: MessageRepository,
        private readonly scheduler: Scheduler,
        @config('${queue.disclaim-inflight-schedule-ms:60000}') private readonly scheduleMs: number,
    ) { }

    public isEnabled(): boolean {
        return isPrimaryOrElectedWorker()
    }

    public start(): Promise<void> {
        if (this.cancellable) {
            return this.cancellable.promise
        }

        this.cancellable = this.scheduler.repeatWithDelay(
            () => (
                this.messageRepository.disclaimInFlightExpiredMessages()
            ),
            this.scheduleMs)

        return this.cancellable.promise
    }

    public stop(): Promise<void> {
        if (this.cancellable) {
            const { promise, cancelFn } = this.cancellable
            cancelFn()
            delete this.cancellable
            return promise
        } else {
            return Promise.resolve()
        }
    }
}
