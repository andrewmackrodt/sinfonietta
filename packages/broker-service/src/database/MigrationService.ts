import { Migration, MigrationStatus } from './Migration'
import { MigrationRepository } from './MigrationRepository'
import { RethinkDB } from './RethinkDB'
import { injectable } from '@lib/express-mvc/decorators/di'
import { info } from '@lib/express-mvc/helpers/debug'
import { findModules } from '@lib/express-mvc/helpers/mvc'
import { randomUUID } from 'crypto'
import path from 'path'

const migrationsPath = path.resolve(__dirname, '../../migrations')

type RollbackOptions =
    { batch: string } |
    { id: string } |
    { step: number }

type MigrationConstructor = new (db: RethinkDB) => Migration

@injectable()
export class MigrationService {
    private readonly migrations: Migration[]

    public constructor(
        private readonly db: RethinkDB,
        private readonly repository: MigrationRepository,
    ) {
        this.migrations = this.findMigrations()
    }

    public async run(): Promise<string> {
        const migrationsTableExists = await this.repository.hasMigrationsTable()

        if ( ! migrationsTableExists) {
            await this.repository.createMigrationsTable()
        }

        const incompleteCount = await this.repository.getIncompleteCount()

        if (incompleteCount > 0) {
            throw new Error('Failed to run migrations, at least one migration does not have status "finished"')
        }

        const completed = await this.repository.getCompletedIds()
        const batch = randomUUID()

        info(`Starting migrations batch=${batch}`)

        for (const migration of this.migrations) {
            if (completed.includes(migration.id)) {
                info(`- ${migration.id}\t[Skipped]`)

                continue
            }

            if ( ! await this.repository.setMigrationStarted(migration, batch)) {
                info(`- ${migration.id}\t[Conflict]`)

                return batch
            }

            info(`- ${migration.id}\t[Running]`)

            let migrationStatus = MigrationStatus.FAILED

            try {
                await migration.up()

                migrationStatus = MigrationStatus.FINISHED
            } finally {
                await this.repository.setMigrationFinished(migration, migrationStatus)
            }
        }

        return batch
    }

    public async rollback(options: RollbackOptions): Promise<void> {
        let migrations: Migration[] = []

        switch (true) {
            case 'batch' in options:
                migrations = []
                break
            case 'id' in options:
                migrations = []
                break
            case 'step' in options:
                migrations = []
                break
        }

        for (const migration of migrations) {
            info(`[${migration.id}]\tReverting`)
            await migration.down()
        }
    }

    private findMigrations(): Migration[] {
        return findModules<MigrationConstructor>(migrationsPath).map(ctor => new ctor(this.db))
    }
}
