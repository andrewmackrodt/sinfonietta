import { container } from 'tsyringe'

global.afterEach(() => {
    container.clearInstances()
})
