import { debug } from 'debug'
import { AggregatorRegistry } from 'prom-client'
import cluster from 'cluster'
import os from 'os'

const log = debug('cluster')

log.enabled = true

const promAggregatorRegistry = new AggregatorRegistry()

if (cluster.isPrimary) {
    let respawn = true

    process.on('SIGINT', () => {
        // prevent terminated workers from respawning
        respawn = false
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worker.on('message', async (message: any) => {
            if (typeof message === 'object'
                && message !== null
                && message.type === 'api:getMetricsReq'
            ) {
                worker.send({
                    type: 'api:getMetricsRes',
                    metrics: await promAggregatorRegistry.clusterMetrics(),
                })
            }
        })
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
