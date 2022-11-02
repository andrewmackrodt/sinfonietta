import { debug } from 'debug'
import express from 'express'
import { clusterMetrics } from 'express-prom-bundle'
import cluster from 'cluster'
import os from 'os'

const log = debug('cluster')

log.enabled = true

if (cluster.isPrimary) {
    let respawn = true

    const metricsApp = express()
    metricsApp.use('/metrics', clusterMetrics())
    const metricsServer = metricsApp.listen(5001)

    process.on('SIGINT', () => {
        // prevent terminated workers from respawning
        respawn = false

        // close metrics server
        metricsServer.close()
    })

    let primaryWorkerId: number | null = null

    const createWorker = () => {
        const workerEnv: Record<string, string> = {}
        if ( ! primaryWorkerId) {
            workerEnv.WORKER_IS_PRIMARY = 'true'
        }
        const worker = cluster.fork(workerEnv)
        const pid = worker.process.pid ?? -1
        log(`worker started (${pid})`)
        if ( ! primaryWorkerId) {
            primaryWorkerId = worker.id
            log(`elected primary worker (${pid})`)
        }
    }

    cluster.on('exit', (worker, code, signal) => {
        const status = code ?? signal
        const pid = worker.process.pid ?? -1

        if (worker.isDead() && respawn) {
            // restart the worker if it has died and SIGINT has not been received
            log(`worker died (${pid}) [${status}]`)
            if (worker.id === primaryWorkerId) {
                primaryWorkerId = null
            }
            createWorker()
        } else {
            // otherwise remove the worker from the pool
            if (code === 0) {
                log(`worker shutdown (${pid}) [${status}]`)
            } else {
                log(`worker exited (${pid}) [${status}]`)
            }
        }
    })

    os.cpus().map(() => createWorker())
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require(process.cwd() + '/index')

    void app.start()
}
