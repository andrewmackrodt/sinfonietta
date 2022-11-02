import AlertComponent from './components/AlertComponent.vue'
import ConsumePage from './pages/ConsumePage.vue'
import HomePage from './pages/HomePage.vue'
import MessagesPage from './pages/MessagesPage.vue'
import PublishPage from './pages/PublishPage.vue'
import { RouteMeta, RouteRecordRaw } from 'vue-router'

export type RouteRecord = RouteRecordRaw & {
    name: string
    meta?: RouteMeta & {
        showInNav?: boolean
        title?: string
    }
}

const routes: RouteRecord[] = [
    {
        component: HomePage,
        name: 'home',
        path: '/',
        meta: { showInNav: true },
    },
    {
        component: MessagesPage,
        name: 'messages',
        path: '/messages',
        meta: { showInNav: true, title: 'Messages' },
    },
    {
        component: PublishPage,
        name: 'publish',
        path: '/publish',
        meta: { showInNav: true, title: 'Publish' },
    },
    {
        component: ConsumePage,
        name: 'consume',
        path: '/consume',
        meta: { showInNav: true, title: 'Consume' },
    },
    {
        component: AlertComponent,
        name: 'not-found',
        path: '/:params(.*)*',
        props: { message: 'Not Found', level: 'danger' },
    },
]

export default routes
