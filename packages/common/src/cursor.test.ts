import {createCursor, parseCursor} from './cursor'

describe('cursor', () => {
    it('createCursor returns url safe base64 string', () => {
        const cursor = createCursor([
            { id: 'a7d0b601-c39a-1d75-6635-c2eb59c4fd7a', created_at: new Date(1704067200000) }
        ], 'asc', 'next')

        expect(cursor).toEqual('AgGMwlH0AKfQtgHDmh11ZjXC61nE_Xo')
    })

    it('parseCursor returns Cursor from url safe base64 string', () => {
        const cursor = parseCursor('AgGMwlH0AKfQtgHDmh11ZjXC61nE_Xo')

        expect(cursor).toEqual({
            comparator: 'gt',
            direction: 'asc',
            id: 'a7d0b601-c39a-1d75-6635-c2eb59c4fd7a',
            timestamp: '2024-01-01T00:00:00.000Z',
        })
    })
})
