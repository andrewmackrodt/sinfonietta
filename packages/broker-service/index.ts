import 'reflect-metadata'

import { MessageService } from './src/services/MessageService'
import { MigrationBootService } from './src/services/MigrationBootService'
import { Application } from '@lib/express-mvc/Application'
import errorHandler from '@lib/express-mvc/controllers/ErrorRequestHandler'
import notFoundHandler from '@lib/express-mvc/controllers/NotFoundRequestHandler'
import { findModules } from '@lib/express-mvc/helpers/mvc'
import { isTrueRegExp } from '@lib/express-mvc/helpers/stdlib'
import { Server } from '@lib/express-mvc/http/Server'
import { HttpService } from '@lib/express-mvc/services/HttpService'
import { Controller } from '@overnightjs/core/lib/decorators/types'
import PromiseRouter from 'express-promise-router'
import fs from 'fs'
import path from 'path'

const expressMvcDirname = path.dirname(require.resolve('@lib/express-mvc/Application'))

let staticPath: string | null = null
let staticProxy: string | null = null

if (fs.existsSync(`${__dirname}/public`)) {
    staticPath = `${__dirname}/public`
} else {
    staticProxy = 'http://127.0.0.1:5000'
}

export const app = new Application()

const httpService = app.resolve(HttpService, {
    'http.server.options': Server.builder()
        .compression(true)
        .controllers([
            ...findModules<Controller>(`${__dirname}/src/controllers`),
            ...findModules<Controller>(`${expressMvcDirname}/controllers`),
        ])
        .cookieSessionKey(null)
        .cors(true)
        .errorHandler(errorHandler)
        .hostname('0.0.0.0')
        .metrics(true)
        .notFoundHandler(notFoundHandler)
        .port(0)
        .router(PromiseRouter)
        .socket(null)
        .static(true)
        .staticDenySourcemap(process.env.NODE_ENV === 'production')
        .staticPath(staticPath)
        .staticProxy(staticProxy)
        .timeout(120000)
        .trustProxy(true)
        .ws(false)
        .wsRoutes([])
        .toObject(),
    })

app.registerBootServices(
    app.resolve(MigrationBootService),
)

app.registerServices(
    httpService,
    app.resolve(MessageService),
)

if ( ! process.env.JEST_WORKER_ID && require.main === module) {
    void app.start({
        cluster: isTrueRegExp(process.env.CLUSTER),
    })
}
