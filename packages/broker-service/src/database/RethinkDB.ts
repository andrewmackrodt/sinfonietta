import { config, singleton } from '@lib/express-mvc/decorators/di'
import { error } from '@lib/express-mvc/helpers/debug'
import * as r from 'rethinkdb'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type constructor<T> = new (...args: any) => T

@singleton()
export class RethinkDB {
    private static isInitialized = false

    public constructor(
        @config('${rethinkdb.connection.host:127.0.0.1}') private readonly host: string,
        @config('${rethinkdb.connection.database:broker}') private readonly database: string,
    ) { }

    public async getOne<T>(ctor: constructor<T>, cb: (conn: r.Connection, db: r.Db) => Promise<T | undefined>) {
        const row = await this.withConnection(cb)

        if (row) {
            return Object.assign(Object.create(ctor.prototype), row)
        }
    }

    public async getMany<T>(ctor: constructor<T>, cb: (conn: r.Connection, db: r.Db) => Promise<T[]>) {
        const rows = await this.withConnection(cb)

        return rows.map(row => Object.assign(Object.create(ctor.prototype), row))
    }

    public async getConnection(): Promise<r.Connection> {
        const conn = await r.connect({ host: this.host })

        if ( ! RethinkDB.isInitialized) {
            await this.initialize(conn)
        }

        conn.use(this.database)

        return conn
    }

    public async withConnection<T>(cb: (conn: r.Connection, db: r.Db) => Promise<T>) {
        const conn = await this.getConnection()
        try {
            return await cb(conn, r.db(this.database))
        } finally {
            try {
                // noinspection ES6MissingAwait
                conn.close()
            } catch (e) {
                error(e)
            }
        }
    }

    private async initialize(conn: r.Connection) {
        const dbList = await r.dbList().run(conn)

        if ( ! dbList.includes(this.database)) {
            await r.dbCreate(this.database).run(conn)
        }
    }
}
