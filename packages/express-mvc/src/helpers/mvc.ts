import { isConstructable } from './stdlib'
import { getRuntimeExt } from './system'
import { glob } from 'glob'

export function findModules<T>(path: string): T[] {
    return glob.sync(`${path}/**/*${getRuntimeExt()}`)
        .filter(filepath => ! filepath.endsWith(getRuntimeExt('.test')))
        .map(filepath => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const plugin = require(filepath.replace(/\.[jt]s$/, ''))

            if (plugin.__esModule) {
                const classes = Object.values(plugin).filter(isConstructable)

                if (classes.length === 1) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return classes[0] as any
                }
            }
        })
        .filter(v => Boolean(v))
}
