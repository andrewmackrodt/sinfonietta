<template>
    <nav-component class="container-fluid" />
    <div v-if="error" class="container mt-4 mb-0">
        <alert-component level="danger" :message="error" />
    </div>
    <router-view :class="['container']" />
    <footer-component class="container-fluid" />
</template>

<script lang="ts">
import AlertComponent from './AlertComponent.vue'
import FooterComponent from './FooterComponent.vue'
import NavComponent from './NavComponent.vue'
import { Options, Vue } from 'vue-class-component'

// global styles
import 'bootstrap/scss/bootstrap.scss'
import '@app/broker-web/styles/style.scss'

// global scripts
import '@popperjs/core'
import 'bootstrap'

// @vue/component
@Options({
    components: {
        AlertComponent,
        NavComponent,
        FooterComponent,
    },
})
export default class AppComponent extends Vue {
    public get error(): unknown {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.$store.state as any).error
    }
}
</script>

<style lang="scss">
@import "styles/env";

#app main {
    padding-top: $section-padding-y;
    padding-bottom: $section-padding-y;
}
</style>
