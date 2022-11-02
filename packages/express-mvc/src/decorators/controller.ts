import * as Overnight from '@overnightjs/core'
import { injectable } from 'tsyringe'
import type { constructor } from 'tsyringe/dist/typings/types'

export function Controller(path?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (target: constructor<any>) => {
        injectable()(target)
        Overnight.ClassOptions({ caseSensitive: true, mergeParams: true, strict: true })(target)

        if (typeof path === 'undefined') {
            path = ''
        }

        return Overnight.Controller(path)(target)
    }
}

function wrapHttpMethod(method: (path: string) => MethodDecorator): (path?: string) => MethodDecorator {
    return (path?: string) => {
        if (typeof path === 'undefined') {
            path = ''
        }

        return method(path)
    }
}

export const Delete = wrapHttpMethod(Overnight.Delete)
export const Get = wrapHttpMethod(Overnight.Get)
export const Head = wrapHttpMethod(Overnight.Head)
export const Options = wrapHttpMethod(Overnight.Options)
export const Patch = wrapHttpMethod(Overnight.Patch)
export const Post = wrapHttpMethod(Overnight.Post)
export const Put = wrapHttpMethod(Overnight.Put)

export const ClassMiddleware = Overnight.ClassMiddleware
export const Middleware = Overnight.Middleware
