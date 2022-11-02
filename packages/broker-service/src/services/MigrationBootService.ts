import { MigrationService } from '../database/MigrationService'
import { singleton } from '@lib/express-mvc/decorators/di'
import { isPrimaryOrElectedWorker } from '@lib/express-mvc/helpers/cluster'
import { BootService } from '@lib/express-mvc/services/BootService'

@singleton()
export class MigrationBootService implements BootService {
    public constructor(
        private readonly migrationService: MigrationService,
    ) { }

    public isEnabled(): boolean {
        return isPrimaryOrElectedWorker()
    }

    public async start(): Promise<void> {
        await this.migrationService.run()
    }
}
