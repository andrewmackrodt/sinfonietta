import { Migration } from '../src/database/Migration'
import r from 'rethinkdb'

export default class CreateMessagesTable_20221106000000 extends Migration {
    public async up(): Promise<void> {
        return this.db.withConnection(async (conn, db) => {
            await db.tableCreate('messages').run(conn)

            await db.table('messages')
                .indexCreate('topic_status_created_at_id', [
                    r.row('topic'),
                    r.row('status'),
                    r.row('created_at'),
                    r.row('id'),
                ])
                .run(conn)

            await db.table('messages')
                .indexCreate('topic_created_at_id', [
                    r.row('topic'),
                    r.row('created_at'),
                    r.row('id'),
                ])
                .run(conn)

            await db.table('messages')
                .indexCreate('status_created_at_id', [
                    r.row('status'),
                    r.row('created_at'),
                    r.row('id'),
                ])
                .run(conn)

            await db.table('messages')
                .indexCreate('created_at_id', [
                    r.row('created_at'),
                    r.row('id'),
                ])
                .run(conn)

            await db.table('messages')
                .indexCreate('topic_is_complete_claim_expires_at', [
                    r.row('topic'),
                    r.row('is_complete'),
                    r.row('claim_expires_at'),
                ])
                .run(conn)

            await db.table('messages')
                .indexCreate('status_claim_expires_at', [
                    r.row('status'),
                    r.row('claim_expires_at'),
                ])
                .run(conn)

            await db.table('messages').indexWait().run(conn)
        })
    }

    public async down(): Promise<void> {
        await this.db.withConnection(async (conn, db) => db.tableDrop('messages'))
    }
}
