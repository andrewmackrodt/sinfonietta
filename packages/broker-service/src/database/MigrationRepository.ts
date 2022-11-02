import { Migration, MigrationStatus } from './Migration'
import { RethinkDB } from './RethinkDB'
import { injectable } from '@lib/express-mvc/decorators/di'
import r from 'rethinkdb'

@injectable()
export class MigrationRepository {
    private static readonly TABLE_NAME = 'migrations'
    private readonly db: RethinkDB

    public constructor(db: RethinkDB) {
        this.db = db
    }

    public async hasMigrationsTable(): Promise<boolean> {
        return this.db.withConnection(async (conn, db) => {
            const tableList = await db.tableList().run(conn)

            return tableList.includes(MigrationRepository.TABLE_NAME)
        })
    }

    public async createMigrationsTable(): Promise<void> {
        return this.db.withConnection(async (conn, db) => {
            await db.tableCreate(MigrationRepository.TABLE_NAME).run(conn)
        })
    }

    public async setMigrationStarted(migration: Migration, batch: string): Promise<boolean> {
        return this.db.withConnection(async (conn, db) => {
            const res = await db.table(MigrationRepository.TABLE_NAME)
                .insert({
                    id: migration.id,
                    started_at: r.now(),
                    finished_at: null,
                    status: MigrationStatus.STARTED,
                    batch,
                })
                .run(conn)

            return res.inserted === 1
        })
    }

    public async setMigrationFinished(
        migration: Migration,
        status: MigrationStatus.FINISHED | MigrationStatus.FAILED,
    ): Promise<void> {
        return this.db.withConnection(async (conn, db) => {
            await db.table(MigrationRepository.TABLE_NAME)
                .get(migration.id)
                .update({ finished_at: r.now(), status })
                .run(conn)
        })
    }

    public async getIncompleteCount(): Promise<number> {
        return this.db.withConnection(async (conn, db) => {
            return db.table(MigrationRepository.TABLE_NAME)
                .filter(doc => doc('status').ne(MigrationStatus.FINISHED))
                .count()
                .run(conn)
        })
    }

    public async getCompletedIds(): Promise<string[]> {
        return this.db.withConnection(async (conn, db) => {
            const cursor = await db.table(MigrationRepository.TABLE_NAME)
                .filter(doc => doc('status').eq(MigrationStatus.FINISHED))
                .getField('id')
                .run(conn)

            return await cursor.toArray()
        })
    }
}
