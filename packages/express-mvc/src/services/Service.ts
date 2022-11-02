export interface Service {
    start(): Promise<void>
    stop(): Promise<void>
    isEnabled?: () => boolean
}
