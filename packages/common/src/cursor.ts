export type SortDirection = 'asc' | 'desc'

export type PageDirection = 'next' | 'prev'

export enum CursorComparator {
    LESS_THAN = 'lt',
    LESS_THAN_OR_EQUAL = 'le',
    GREATER_THAN = 'gt',
    GREATER_THAN_OR_EQUAL = 'ge',
}

const comparatorIndexes = Object.values(CursorComparator)
    .reduce((res, comparator, i) => {
        res[comparator] = i.toString(10)
        return res
    }, {} as Record<CursorComparator, string>)

export interface Cursor {
    comparator: CursorComparator
    direction: SortDirection
    timestamp: string
    id?: string
}

export interface PaginationOptions {
    after?: string
    before?: string
    direction?: SortDirection
    limit?: number
    cursor?: string
}

interface CursableRecord {
    id?: string
    created_at: Date | string
}

export function createCursor<T extends CursableRecord>(data: T[], sort: SortDirection, page: PageDirection): string {
    if (data.length === 0) {
        return ''
    }

    const record = page === 'next'
        ? data[data.length - 1]
        : data[0]

    const cursor: string[] = []

    const invert = (
            (page === 'next' && sort === 'desc') ||
            (page === 'prev' && sort === 'asc'))
        ? comparatorIndexes[CursorComparator.LESS_THAN]
        : comparatorIndexes[CursorComparator.GREATER_THAN]

    cursor.push(invert)

    let date: Date

    if (typeof record.created_at !== 'object') {
        date = new Date(record.created_at)
    } else {
        date = record.created_at
    }

    cursor.push(date.getTime().toString(10))

    if (record.id) {
        cursor.push(record.id)
    }

    return btoa(cursor.join('|'))
}

export function createCursorFrom(cursor: string, direction: SortDirection, page: PageDirection): string | undefined {
    if ( ! cursor) {
        return
    }

    let current: Cursor

    try {
        current = parseCursor(cursor)
    } catch {
        return
    }

    let comparator: CursorComparator |  undefined

    if (current.direction !== direction) {
        if (page === 'next') {
            comparator = direction === 'asc'
                ? CursorComparator.GREATER_THAN_OR_EQUAL
                : CursorComparator.LESS_THAN_OR_EQUAL
        }
    } else {
        if (page === 'prev') {
            comparator = direction === 'asc'
                ? CursorComparator.LESS_THAN_OR_EQUAL
                : CursorComparator.GREATER_THAN_OR_EQUAL
        }
    }

    if (comparator) {
        return compileCursor({
            comparator,
            direction,
            timestamp: current.timestamp,
            id: current.id,
        })
    }
}

export function compileCursor(cursor: Cursor): string {
    const segments: string[] = []

    const idx = comparatorIndexes[cursor.comparator] ?? comparatorIndexes[CursorComparator.GREATER_THAN]
    segments.push(idx)
    segments.push(new Date(cursor.timestamp).getTime().toString(10))

    if (cursor.id) {
        segments.push(cursor.id)
    }

    return btoa(segments.join('|'))
}

export function parseCursor(cursor: string): Cursor {
    const [cStrIdx, timestamp, id] = atob(cursor).split('|')
    let cIdx = parseInt(cStrIdx)

    if (isNaN(cIdx) || cIdx < 0 || 3 < cIdx) {
        cIdx = 2
    }

    const comparator = Object.values(CursorComparator)[cIdx]

    return {
        comparator: Object.values(CursorComparator)[cIdx],
        direction: comparator[0] === 'g' ? 'asc' : 'desc',
        timestamp: new Date(parseInt(timestamp)).toISOString(),
        id,
    }
}
