import { Migration, MigrationStatus } from './Migration'
import { MigrationRepository } from './MigrationRepository'
import { RethinkDB } from './RethinkDB'
import { injectable } from '@lib/express-mvc/decorators/di'
import { info } from '@lib/express-mvc/helpers/debug'
import glob from 'glob'
import { randomUUID } from 'crypto'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTs = Boolean(process.env.TS_NODE_DEV || (<any>process)[Symbol.for('ts-node.register.instance')])
const ext = isTs ? 'ts' : 'js'
const migrationsPath = path.resolve(__dirname, '../../migrations')

type RollbackOptions =
    { batch: string } |
    { id: string } |
    { step: number }

@injectable()
export class MigrationService {
    public constructor(
        private readonly db: RethinkDB,
        private readonly repository: MigrationRepository,
    ) { }

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

        for (const migration of this.getAvailable()) {
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

    private getAvailable(): Migration[] {
        const migrations: Migration[] = []

        /* eslint-disable @typescript-eslint/no-var-requires */
        glob.sync(`${migrationsPath}/*.${ext}`).map(filepath => {
            const ctor = require(filepath).default
            const migration = new ctor(this.db)

            migrations.push(migration)
        })
        /* eslint-enable @typescript-eslint/no-var-requires */

        return migrations
    }
}
