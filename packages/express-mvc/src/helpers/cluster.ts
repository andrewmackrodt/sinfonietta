import cluster from 'cluster'

export function isPrimaryOrElectedWorker(): boolean {
    return cluster.isPrimary || Boolean(process.env.WORKER_IS_PRIMARY)
}
