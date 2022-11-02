import base from 'base-x'

const b10 = base('0123456789')
const b2 = base('01')
const b62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')

const crypto = typeof window !== 'undefined' ? window.crypto : require('crypto')

export interface UniqueIdOptions {
    /**
     * The number of bits for the generated id.
     *
     * Default: 119 - 20 characters
     */
    bits?: number

    /**
     * The number of bits for the timestamp portion.
     *
     * Default: 42 - max unix timestamp 4398046511103 [2109-05-15T07:35:11.103Z]
     */
    timestampBits?: number

    /**
     * Generates lexicographically sortable keys if true.
     *
     * Default: false
     */
    lexicographical?: boolean
}

export class UniqueId {
    protected readonly bits: number
    protected readonly timestampBits: number
    protected readonly lexicographical: boolean

    private maxIdLength?: number

    public constructor(options?: UniqueIdOptions) {
        const opts: Required<UniqueIdOptions> = Object.assign(
            {
                bits: 119,
                timestampBits: 42,
                lexicographical: false,
            },
            options)

        this.bits = opts.bits
        this.timestampBits = opts.timestampBits
        this.lexicographical = opts.lexicographical
    }

    public generate(seedTime? : number): string {
        if (typeof seedTime === 'undefined') {
            seedTime = new Date().getTime()
        }

        const buffer = b10.decode(seedTime.toString(10))

        let bits = b2.encode(buffer).padStart(this.timestampBits, '0')

        if (bits.length > this.timestampBits) {
            throw new Error('timestamp out of range')
        }

        if (this.lexicographical) {
            bits += this.generateRandomBits()
        } else {
            bits = this.generateRandomBits() + bits
        }

        return b62.encode(b2.decode(bits)).replace(/^0+/, '').padStart(this.getMaxIdLength(), '0')
    }

    protected generateRandomBits(): string {
        const length = this.bits - this.timestampBits
        let random = ''
        while (random.length < length) {
            let int: number

            if (typeof window !== 'undefined') {
                int = window.crypto.getRandomValues(new Uint32Array(1))[0]
            } else {
                int = crypto.randomFillSync(new Uint32Array(1))[0]
            }

            random += b2.encode(b10.decode(int.toString(10)))
        }
        return random.slice(0, length)
    }

    protected getMaxIdLength(): number {
        if ( ! this.maxIdLength) {
            const maxId = b62.encode(b2.decode(new Array(this.bits).fill(1).join('')))

            this.maxIdLength = maxId.length
        }

        return this.maxIdLength
    }
}

const uid = new UniqueId()

export function uuid(seedTime?: number): string {
    return uid.generate(seedTime)
}
