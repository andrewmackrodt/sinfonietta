<template>
    <footer>
        <div class="container">
            <div class="d-flex flex-column flex-sm-row justify-content-between">
                <p class="small">
                    &copy; {{ year }} Sinfonietta
                </p>
            </div>
        </div>
    </footer>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component'

export default class FooterComponent extends Vue {
    public get year() {
        return new Date().getFullYear()
    }
}
</script>

<style scoped lang="scss">
@import "styles/env";

footer {
    padding-top: $section-padding-y;
    padding-bottom: $section-padding-y;
}
</style>
