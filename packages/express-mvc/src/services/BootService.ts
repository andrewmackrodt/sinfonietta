export interface BootService {
    start(): Promise<void>
    isEnabled?: () => boolean
}
