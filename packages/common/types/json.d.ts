export type JsonPrimitive = string | number | boolean | null

export interface JsonArray<T extends []> {
    [key: number]: JsonValue<T>
}

export type JsonValue<T> =
    T extends Date ? string :
    T extends object ? JsonData<T> :
    T extends [] ? JsonArray<T> :
    T extends JsonPrimitive ? T :
    never

export type JsonData<T extends object> = {
    [K in keyof T]: JsonValue<T[K]>
}
