import { debug } from 'debug'
import cluster, { Worker } from 'cluster'
import os from 'os'

export function isPrimaryOrElectedWorker(): boolean {
    return cluster.isPrimary || Boolean(process.env.WORKER_IS_PRIMARY)
}

export function clusterApplication(options?: {
    workerCount?: number
    cb?: (worker: Worker) => void
}) {
    const log = debug('cluster')

    log.enabled = true

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
        const pid = worker.process.pid

        log(`worker started (${pid})`)

        if ( ! primaryWorkerId) {
            primaryWorkerId = worker.id

            log(`elected primary worker (${pid})`)
        }

        if (options?.cb) {
            options.cb(worker)
        }
    }

    cluster.on('exit', (worker, code, signal) => {
        const status = code ?? signal
        const pid = worker.process.pid

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

    const workerCount = options?.workerCount ?? os.cpus().length

    for (let i = 0; i < workerCount; i++) {
        createWorker()
    }
}
