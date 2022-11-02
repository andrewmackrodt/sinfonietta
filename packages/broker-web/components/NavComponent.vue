<template>
    <header class="sticky-top bg-dark">
        <nav class="container px-sm-2 navbar navbar-dark navbar-expand-md">
            <a href="/" class="navbar-brand">
                <img
                    src="/assets/icons/favicon-48x48.png"
                    alt="Site logo"
                    :style="{
                        'max-height': '32px',
                        'margin-right': '1em',
                        'object-fit': 'contain',
                    }"
                >
                <span class="align-middle">Sinfonietta</span>
            </a>
            <button
                type="button" aria-controls="navbarToggleHeader" aria-expanded="false" aria-label="Toggle navigation"
                data-bs-toggle="collapse" data-bs-target="#navbarToggleHeader" class="navbar-toggler"
            >
                <span class="navbar-toggler-icon" />
            </button>
            <div id="navbarToggleHeader" class="navbar-collapse collapse">
                <ul class="navbar-nav">
                    <li v-for="item in menu" class="nav-item">
                        <router-link
                            :class="[
                                'nav-link',
                                item.selected ? 'active' : '',
                            ]" :to="item.href"
                        >
                            {{ item.name }}
                        </router-link>
                    </li>
                </ul>
            </div>
        </nav>
    </header>
</template>

<script lang="ts">
import { RouteRecord } from '../routes'
import { Vue } from 'vue-class-component'

export default class NavComponent extends Vue {
    public mounted() {
        const navbarToggleHeader = document.getElementById('navbarToggleHeader') as HTMLButtonElement

        document.querySelectorAll<HTMLLinkElement>('#navbarToggleHeader a.nav-link')
            .forEach(a => {
                a.addEventListener('click', () => {
                    if (navbarToggleHeader.classList.contains('show')) {
                        navbarToggleHeader.classList.remove('show')
                        navbarToggleHeader.setAttribute('aria-expanded', 'false')
                    }
                })
            })
    }

    public get menu(): object[] {
        const routes = (this.$router.options.routes as RouteRecord[]).filter(route => route.meta?.showInNav)
        const currentPath = this.$route.path

        const titleCase = (name: string) => name.split(/[_-]/)
            .map(word => word[0].toUpperCase() + word.slice(1))
            .join(' ')

        return routes.map(route => ({
            name: route.meta?.title || titleCase(route.name),
            href: { path: route.path },
            selected: route.path === currentPath,
        }))
    }
}
</script>

<style scoped lang="scss">
header {
    opacity: 0.95;
}
</style>
