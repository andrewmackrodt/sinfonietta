export async function waitUntilNotEmpty<T>(
    cb: () => Promise<T>,
    timeoutMs: number,
    delayMs = 1000,
): Promise<T | undefined> {
    const finishAt = new Date(new Date().getTime() + timeoutMs)

    const poll = async (resolve: (value: T | undefined) => void, reject: (err: unknown) => void ) => {
        try {
            const result = await cb()

            if (typeof result !== 'undefined' && result !== null &&
                (
                    (typeof result === 'string' && result !== '') ||
                    (typeof result === 'number' && ! isNaN(result)) ||
                    (Array.isArray(result) && result.length > 0)
                )
            ) {
                resolve(result)
            } else if (new Date() >= finishAt) {
                resolve(undefined)
            } else {
                setTimeout(() => poll(resolve, reject), delayMs)
            }
        } catch (err) {
            reject(err)
        }
    }

    return await new Promise(poll)
}
