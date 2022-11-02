import { Vue } from 'vue-class-component'

export function parseUrl(url: string): { baseHref: string; qs: Record<string, string> } {
    const segments = url.split('?', 2)
    const baseHref = segments[0]
    const qs: Record<string, string> = {}

    if (segments.length > 1) {
        segments[1].split('&')
            .reduce((qs, paramValueString) => {
                const paramValueArray = paramValueString.split('=', 2)
                const key = decodeURIComponent(paramValueArray[0])
                let value = paramValueArray[1] ?? ''
                if (value.length) value = decodeURIComponent(value)
                qs[key] = value
                return qs
            }, qs)
    }

    return { baseHref, qs }
}

type UrlProps = Record<string, string | number | boolean>

export function createUrlFromProps(props: UrlProps, baseUrl?: string) {
    if ( ! baseUrl) {
        baseUrl = window.location.href
    }

    const { baseHref, qs } = parseUrl(baseUrl)

    for (const [k, v] of Object.entries(props as UrlProps)) {
        const str = v.toString()
        if (str !== '') {
            qs[k] = v.toString()
        } else {
            delete qs[k]
        }
    }

    return `${baseHref}?` + Object.keys(qs)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]))
        .join('&')
}

export function setUrlFromProps(props: UrlProps, options?: { pushState?: boolean; url?: string }) {
    const urlFromProps = options?.url
        ? createUrlFromProps(props, options.url)
        : createUrlFromProps(props)

    if (options?.pushState) {
        history.pushState({}, '', urlFromProps)
    } else {
        history.replaceState({}, '', urlFromProps)
    }
}

interface BaseUrlProp<T> {
    property: string & keyof T
}

type UrlProp<T> = ( BaseUrlProp<T> & { type?: 'string'; cb?: (value: string) => void; defaultValue?: string } )
    | ( BaseUrlProp<T> & { type: 'number'; cb?: (value: number) => void; defaultValue?: number } )
    | ( BaseUrlProp<T> & { type: 'boolean'; cb?: (value: boolean) => void; defaultValue?: boolean } )

export function parsePropsFromUrl<T>(props: UrlProp<T>[], url?: string) {
    if ( ! url) url = window.location.href
    const { qs } = parseUrl(url)

    const parsed: Record<string, unknown> = {}

    for (const prop of props) {
        let parsedValue: unknown

        if (prop.property in qs && qs[prop.property] !== '') {
            switch (prop.type) {
                case 'number':
                    const number = parseFloat(qs[prop.property])
                    if ( ! isNaN(number)) {
                        parsedValue = number
                    } else {
                        parsedValue = undefined
                    }
                    break
                case 'boolean':
                    parsedValue = qs[prop.property] === 'true'
                    break
                default:
                    parsedValue = qs[prop.property]
            }
        } else {
            if ( ! ('defaultValue' in prop)) {
                continue
            }
            parsedValue = prop.defaultValue
        }

        parsed[prop.property] = parsedValue

        if (typeof prop.cb === 'function') {
            prop.cb(parsedValue as never)
        }
    }

    return parsed
}
