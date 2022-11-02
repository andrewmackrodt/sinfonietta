export class Config {
    private _port?: number | null

    public get port(): number | null {
        if (typeof this._port === 'undefined') {
            if ( ! Config.global.port) {
                if (window.location.port !== '' &&  window.location.port !== '0') {
                    this._port = parseInt(window.location.port, 10)
                } else {
                    this._port = null
                }
            } else {
                this._port = Config.global.port
            }
        }

        return this._port
    }

    private static get global(): Partial<Config> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globals: Record<string, any> = (window as Record<string, any>).globals

        return globals.config
    }
}

export const config = new Config()
