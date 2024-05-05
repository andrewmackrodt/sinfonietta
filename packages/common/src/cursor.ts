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
        res[comparator] = i
        return res
    }, {} as Record<CursorComparator, number>)

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

function hex2bytes(value: string): number[] {
    if (value.length % 2 !== 0) {
        value = '0' + value
    }
    const bytes: number[] = []
    for (let i = 0; i < value.length; i += 2) {
        bytes.push(parseInt(value.substring(i, i + 2), 16))
    }
    return bytes
}

function dec2bytes(value: number): number[] {
    return hex2bytes(value.toString(16))
}

export function compileCursor(cursor: Cursor): string {
    const bytes: number[] = []
    const comparator = comparatorIndexes[cursor.comparator] ?? comparatorIndexes[CursorComparator.GREATER_THAN]
    bytes.push(...dec2bytes(comparator))
    bytes.push(...dec2bytes(new Date(cursor.timestamp).getTime()))
    if (cursor.id) {
        bytes.push(...hex2bytes(cursor.id.toLowerCase().replace(/[^a-f0-9]/g, '')))
    }
    const str = bytes.map(n => String.fromCharCode(n)).join('')
    return btoa(str).replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '')
}

export function createCursor<T extends CursableRecord>(data: T[], sort: SortDirection, page: PageDirection): string {
    if (data.length === 0) {
        return ''
    }

    const record = page === 'next'
        ? data[data.length - 1]
        : data[0]

    const comparator = (
            (page === 'next' && sort === 'desc') ||
            (page === 'prev' && sort === 'asc'))
        ? CursorComparator.LESS_THAN
        : CursorComparator.GREATER_THAN

    const timestamp = (
        typeof record.created_at === 'object'
            ? record.created_at
            : new Date(record.created_at))
        .toISOString()

    return compileCursor({
        comparator,
        direction: 'asc',
        timestamp,
        id: record.id,
    })
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

function bytes2hex(value: number[]): string {
    return value.map(n => {
        let hex = n.toString(16)
        if (hex.length < 2) {
            hex = '0' + hex
        }
        return hex
    }).join('')
}

function bytes2dec(value: number[]): number {
    return parseInt(bytes2hex(value), 16)
}

export function parseCursor(cursor: string): Cursor {
    const bytes: number[] = []
    const str = atob(cursor.replace(/_/g, '/').replace(/-/g, '+'))
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i))
    }

    const comparator = Object.values(CursorComparator)[bytes2dec(bytes.slice(0, 1))]
    const timestamp = bytes2dec(bytes.slice(1, 7))
    let rawId = bytes2hex(bytes.slice(7))
    let id: string | undefined
    if (rawId) {
        id = [
            rawId.substring(0, 8),
            rawId.substring(8, 12),
            rawId.substring(12, 16),
            rawId.substring(16, 20),
            rawId.substring(20),
        ].join('-')
    }

    return {
        comparator,
        direction: comparator[0] === 'g' ? 'asc' : 'desc',
        timestamp: new Date(timestamp).toISOString(),
        id,
    }
}
