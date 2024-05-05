import { container, inject } from 'tsyringe'
import fs from 'fs'
import path from 'path'

export const configFromEnv: Record<string, boolean> = {}

export * from 'tsyringe'

const configNameDefaultPattern = new RegExp('^\\$\\{([^}]+):([^}]*)\\}$')

const propertiesFile = path.resolve('./config/properties.js')

if (fs.existsSync(propertiesFile)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const properties = require(propertiesFile)

    for (const [name, useValue] of Object.entries(properties)) {
        if ( ! configFromEnv[name]) {
            container.register(name, { useValue })
        }
    }
}

export function config(name: string) {
    let isFromEnv = false
    let value: string | undefined

    const match = configNameDefaultPattern.exec(name)

    if (match) {
        [/* str */, name, value] = match
    }

    const constantName = name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()

    for (const k of [name, constantName]) {
        if (k in process.env) {
            isFromEnv = true
            value = process.env[k]
        }
    }

    if ((( ! container.isRegistered(name)) || isFromEnv) && typeof value !== 'undefined') {
        let useValue: unknown
        if (value === 'true') useValue = true
        else if (value === 'false') useValue = false
        else if (value.match(/^0$|^[1-9][0-9]*$/)) useValue = parseInt(value, 10)
        else if (value === 'null') useValue = null
        else useValue = value
        container.register(name, { useValue })
    }

    configFromEnv[name] = isFromEnv

    return (target: unknown, propertyKey: (string | symbol | undefined), parameterIndex: number) => {
        return inject(name)(target, propertyKey, parameterIndex)
    }
}
