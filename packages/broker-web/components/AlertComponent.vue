<template>
    <p class="alert mb-0" :class="[alertClass]" role="alert">
        {{ message }}
    </p>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component'
import { Prop } from 'vue-property-decorator'

export default class AlertComponent extends Vue {
    @Prop({ default: 'danger' })
    public readonly level!: string

    @Prop({ default: 'An unhandled error has occurred' })
    public readonly message!: string

    public get alertClass(): string {
        return `alert-${this.level}`
    }
}
</script>
