import AppComponent from './components/AppComponent.vue'
import routes from './routes'
import { store } from './store'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const app = createApp({
    components: { AppComponent },
    template: '<app-component />',
})

app.use((() => {
    const router = createRouter({ history: createWebHistory(), routes })

    router.beforeEach(async (to, from, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta: Record<string, any> = to.meta
        let title = 'Sinfonietta'
        if (meta.title) {
            title = `${meta.title} | ${title}`
        }
        document.title = title
        store.commit('set', { error: null })
        next()
    })

    return router
})())

app.use(store)

app.mount('#app')
