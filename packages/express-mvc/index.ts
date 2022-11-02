import 'reflect-metadata'

import { Application } from './src/Application'
import errorHandler from './src/controllers/ErrorRequestHandler'
import notFoundHandler from './src/controllers/NotFoundRequestHandler'
import { findModules } from './src/helpers/mvc'
import { Server } from './src/http/Server'
import { HttpService } from './src/services/HttpService'
import { Controller } from '@overnightjs/core/lib/decorators/types'
import PromiseRouter from 'express-promise-router'

export const app = new Application()

const httpService = app.resolve(HttpService, {
    'http.server.options': Server.builder()
        .compression(true)
        .controllers(findModules<Controller>(`${__dirname}/src/controllers`))
        .cookieSessionKey(null)
        .cors(true)
        .errorHandler(errorHandler)
        .hostname('0.0.0.0')
        .metrics(true)
        .notFoundHandler(notFoundHandler)
        .port(0)
        .router(PromiseRouter)
        .socket(null)
        .static(false)
        .staticDenySourcemap(process.env.NODE_ENV === 'production')
        .timeout(120000)
        .trustProxy(true)
        .ws(false)
        .wsRoutes([])
        .toObject(),
    })

app.registerServices(httpService)

if (require.main === module && ! process.env.JEST_WORKER_ID) {
    void app.start()
}
