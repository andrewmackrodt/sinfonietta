<template>
    <div>
        <vue-good-table
            :mode="mode"
            :columns="columns"
            :rows="tableRows"
            @cell-click="onCellClick"
            @row-click="(e) => $emit('row-click', e)"
            @sort-change="(e) => $emit('sort-change', e)"
        />
        <modal-component
            v-if="modal"
            backdrop="static"
            class="message-modal"
            :title="modal.title"
            dialog-class="modal-lg"
            @modal-hidden="onModalHidden"
        >
            <pre>{{ modal.text }}</pre>
        </modal-component>
    </div>
</template>

<script lang="ts">
import ModalComponent from './ModalComponent.vue'
import { Message } from '@lib/broker-client/BrokerClient'
import { ExtractProps, Options, Vue } from 'vue-class-component'
import { VueGoodTable, Column, CellClickEvent } from 'vue-good-table-next'
import { Prop } from 'vue-property-decorator'

import 'vue-good-table-next/dist/vue-good-table-next.css'

// @vue/component
@Options({
    components: {
        ModalComponent,
        VueGoodTable,
    },
    emits: [
        'cell-click',
        'row-click',
        'sort-change',
    ],
})
export default class MessageListComponent extends Vue {
    columns: Column[] = [
        { label: '', field: 'info', sortable: false, tdClass: 'info-col', width: '10px' },
        { label: 'ID', field: 'id', sortable: false },
        { label: 'Topic', field: 'topic', sortable: false },
        { label: 'Status', field: 'status', sortable: false },
        { label: 'Attempts', field: 'attempts', sortable: false, type: 'number' },
        { label: 'Remaining', field: 'attempts_remaining', sortable: false, type: 'number' },
        { label: 'Completed', field: 'is_complete', sortable: false, type: 'boolean' },
        { label: 'Next Attempt', field: 'claim_expires_at', sortable: false },
        { label: 'Created', field: 'created_at', sortable: true },
    ]

    // @ts-expect-error TS2749
    modal: Partial<ExtractProps<ModalComponent>> | null = null

    @Prop({ default: '' }) mode!: string
    @Prop({ default: [] }) rows!: Message[]

    get tableRows() {
        return this.rows.map(row => ({ ...{ info: '🔎' }, ...row }))
    }

    onCellClick(e: CellClickEvent<Message>) {
        this.$emit('cell-click', e)

        if (e.event.defaultPrevented || e.column.field !== 'info') {
            return
        }

        this.modal = {
            title: `${e.row.id}`,
            text: JSON.stringify(
                Object.entries(e.row).reduce(
                    (res, [key, value]) => {
                        if ( ! ['vgt_id', 'originalIndex', 'info'].includes(key)) {
                            res[key] = value
                        }
                        return res
                    }, {} as Record<string, unknown>,
                ), null, 4),

        }
    }

    onModalHidden() {
        this.modal = null
    }
}
</script>

<style scoped lang="scss">
::v-deep(table.vgt-table) {
    font-size: 12px;

    td.info-col {
        cursor: pointer;
    }
}
</style>
