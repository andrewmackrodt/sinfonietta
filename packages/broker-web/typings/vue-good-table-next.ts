declare module 'vue-good-table-next' {
    import { Vue } from 'vue-class-component'

    export class VueGoodTable extends Vue {

    }

    interface ColumnBase {
        label: string
        field: string
        type?: 'number' | 'decimal' | 'percentage' | 'boolean' | 'date'
        sortable?: boolean
        formatFn?: (value: unknown) => unknown
        html?: boolean
        width?: string
        hidden?: boolean
        thClass?: string
        tdClass?: string | ((row: unknown) => string)
        globalSearchDisabled?: boolean
        tooltip?: string
    }

    export type Column = ColumnBase
        | ( ColumnBase & {
            type: 'date'
            dateInputFormat?: string
            dateOutputFormat?: string
        })
        | ( ColumnBase & {
            sortable: true
            firstSortType?: 'asc' | 'desc'
            sortFn?: (x: unknown, y: unknown, col: unknown, rowX: unknown, rowY: unknown) => boolean
        })

    export interface ServerParams {
        columnFilters: Record<string, string>
        sort: { field: string; type: 'asc' | 'desc' }[]
        page: number
        perPage: number
    }

    export interface CellClickEvent<T> {
        column: Column
        event: MouseEvent
        row: T & { vgt_id: number; originalIndex: number }
        rowIndex: number
    }

    export interface RowClickEvent<T> {
        event: MouseEvent
        pageIndex: number
        row: T & { vgt_id: number; originalIndex: number }
        selected: boolean
    }

    export type SortChangeEvent = { field: string; type: 'asc' | 'desc' | 'none' }[]
}
