const _env = (process.env ?? {}) as Record<string, string>

export function env(name: string, defaultValue: string): string
export function env(name: string, defaultValue?: string): string | undefined

export function env(name: string, defaultValue?: string) {
    if ((name in _env) && _env[name].length > 0) {
        return _env[name]
    } else {
        return defaultValue
    }
}

export function isTypeScript(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean(process.env.TS_NODE_DEV || (<any>process)[Symbol.for('ts-node.register.instance')])
}

export function getRuntimeExt(name?: string) : string {
    const ext = isTypeScript() ? 'ts' : 'js'

    return `${name ?? ''}.${ext}`
}
