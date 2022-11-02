<template>
    <main>
        <h3 class="pb-2">
            Consume
        </h3>
        <p>Consume messages from a topic.</p>
        <div>
            <div v-if="alert.message" class="mb-3">
                <alert-component
                    :level="alert.level ?? 'info'"
                    :message="alert.message"
                />
            </div>
            <div class="mb-3">
                <label for="topicInput" class="form-label">Topic</label>
                <input id="topicInput" v-model="topic" type="text" class="form-control" placeholder="Topic (min 4 characters)">
            </div>
            <message-list-component :rows="rows" class="mb-3" />
            <div class="mb-3 col-4 col-md-3 col-lg-2">
                <label for="maxMessagesInput" class="form-label">Max Messages</label>
                <input id="maxMessagesInput" v-model="limit" type="number" class="form-control" min="1" max="50">
            </div>
            <div class="mb-3 col-4 col-md-3 col-lg-2">
                <label for="timeoutInput" class="form-label">Timeout</label>
                <input id="timeoutInput" v-model="timeout" type="number" class="form-control" min="0" max="30">
            </div>
            <button type="submit" class="btn btn-primary mt-3" :disabled="isLoading" @click="onConsumeSubmit">
                Consume
            </button>
        </div>
    </main>
</template>

<script lang="ts">
import AlertComponent from '../components/AlertComponent.vue'
import MessageListComponent from '../components/MessageListComponent.vue'
import { api, Message } from '../services/api'
import { Options, Vue } from 'vue-class-component'

// @vue/component
@Options({
    components: {
        AlertComponent,
        MessageListComponent,
    },
})
export default class ConsumePage extends Vue {
    alert = { level: '', message: '' }
    isLoading = false
    rows: Message[] = []
    topic = ''
    limit = 1
    timeout = 30

    async onConsumeSubmit(e: Event) {
        e.preventDefault()

        this.$store.commit('set', { error: null })
        this.alert.message = ''

        const setError = (e: unknown): void => {
            this.alert.level = 'danger'
            this.alert.message = e as string
        }

        if (this.topic.length < 4) {
            return setError('Topic must be at least 4 characters')
        }

        this.isLoading = true

        this.alert.level = 'info'
        this.alert.message = 'Checking for messages ...'

        try {
            const { res: messages, err } = await api.consume(this.topic, this.limit, this.timeout)
            if (err) {
                this.alert.level = 'danger'
                this.alert.message = (err.response?.data ?? 'Unknown network request error') as string
                return
            }
            this.rows = messages
            switch (true) {
                case this.rows.length === 1:
                    this.alert.level = 'success'
                    this.alert.message = '1 message claimed for processing'
                    break
                case this.rows.length > 1:
                    this.alert.level = 'success'
                    this.alert.message = `${this.rows.length} messages claimed for processing`
                    break
                default:
                    this.alert.level = 'info'
                    this.alert.message = 'No messages available for processing'
                    break
            }
        } catch (e) {
            setError(e)
        } finally {
            this.isLoading = false
        }
    }
}
</script>
