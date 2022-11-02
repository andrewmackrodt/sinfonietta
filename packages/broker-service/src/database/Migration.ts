import { RethinkDB } from './RethinkDB'

export enum MigrationStatus {
    STARTED   = 'started',
    FINISHED  = 'finished',
    FAILED    = 'failed',
}

export abstract class Migration {
    public readonly id: string
    protected readonly db: RethinkDB

    public constructor(db: RethinkDB) {
        this.id = Object.getPrototypeOf(this).constructor.name
        this.db = db
    }

    public abstract up(): Promise<void>
    public abstract down(): Promise<void>
}
