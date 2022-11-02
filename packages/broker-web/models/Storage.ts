export class Storage {
    protected readonly storage: globalThis.Storage

    public constructor() {
        let storage = localStorage
        try {
            const key = '__storage_' + new Date().getTime()
            storage.setItem(key, '1')
            storage.removeItem(key)
        } catch (err) {
            console.error('failed to use localStorage using sessionStorage fallback')
            storage = sessionStorage
        }
        this.storage = storage
    }

    public clear(): void {
        this.storage.clear()
    }

    public getItem(key: string): string | null {
        return this.storage.getItem(key)
    }

    public getItemOrFail(key: string): string  {
        const value = this.getItem(key)
        if (value === null) {
            throw new Error(`key is not defined: ${key}`)
        }
        return value
    }

    public getJsonItem<T extends Record<string, unknown>>(key: string): T | null {
        const value = this.storage.getItem(key)
        if (value === null) {
            return null
        } else {
            return JSON.parse(value)
        }
    }

    public getJsonItemOrFail<T extends Record<string, unknown>>(key: string): T {
        const value = this.getJsonItem<T>(key)
        if (value === null) {
            throw new Error(`key is not defined: ${key}`)
        }
        return value
    }

    public removeItem(key: string): void {
        this.storage.removeItem(key)
    }

    public setItem(key: string, value: string): void {
        try {
            this.storage.setItem(key, value)
        } catch (err) {
            console.error('failed to write to storage', err)
        }

    }

    public setJsonItem(key: string, value: Record<string, unknown>): void {
        try {
            this.storage.setItem(key, JSON.stringify(value))
        } catch (err) {
            console.error('failed to write to storage', err)
        }

    }
}

export const storage = new Storage()
