export type Builder<T, U extends new (params?: T) => InstanceType<U>> = {
    build: () => InstanceType<U>
    toObject: () => T
} & {
    [K in keyof Required<T>]: (value: T[K]) => Builder<T, U>
}

export function builder<T, U extends new (params?: T) => InstanceType<U>>(ctor: U): Builder<T, U> {
    const params: Record<string, unknown> = {}

    return new Proxy({}, {
        get(target, property: string, receiver) {
            switch (property) {
                case 'build':
                    return (): InstanceType<U> => {
                        return new ctor(params as T)
                    }
                case 'toObject':
                    return (): T => {
                        return params as T
                    }
                default:
                    return (value: unknown) => {
                        params[property] = value

                        return receiver
                    }
            }
        },
    }) as Builder<T, U>
}
