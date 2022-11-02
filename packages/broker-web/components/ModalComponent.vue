<template>
    <div class="modal" tabindex="-1" :data-bs-backdrop="backdrop">
        <div class="modal-dialog" :class="dialogClass">
            <div class="modal-content">
                <div v-if="title" class="modal-header">
                    <h5 class="modal-title">
                        {{ title }}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                </div>
                <div class="modal-body">
                    <p v-if="text">
                        {{ text }}
                    </p>
                    <slot />
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Modal } from 'bootstrap'
import { Options, Vue } from 'vue-class-component'
import { Prop } from 'vue-property-decorator'

// @vue/component
@Options({
    emits: [
        'modal-hidden',
    ],
})
export default class ModalComponent extends Vue {
    @Prop({ default: 'true' })
    backdrop!: 'true' | 'false' | 'static'

    @Prop({ default: '' })
    title!: string

    @Prop({ default: '' })
    text!: string

    @Prop({ default: '' })
    dialogClass!: string

    mounted() {
        const modal = new Modal(this.$el)

        this.$el.addEventListener('hidden.bs.modal', () => {
            this.$emit('modal-hidden')
        })

        modal.toggle()
    }
}
</script>
