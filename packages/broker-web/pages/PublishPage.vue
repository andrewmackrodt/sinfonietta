<template>
    <main>
        <h3 class="pb-2">
            Publish
        </h3>
        <p>Publish a message to a topic.</p>
        <form>
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
            <div class="mb-3">
                <label for="dataInput" class="form-label">Data</label>
                <textarea id="dataInput" v-model="messageData" class="form-control" rows="8" />
            </div>
            <div class="mb-3 col-4 col-md-3 col-lg-2">
                <label for="maxAttemptsInput" class="form-label">Max Attempts</label>
                <input id="maxAttemptsInput" v-model="maxAttempts" type="number" class="form-control" min="0" max="100">
            </div>
            <button type="submit" class="btn btn-primary mt-3" @click="onPublishSubmit">
                Publish
            </button>
        </form>
    </main>
</template>

<script lang="ts">
import AlertComponent from '../components/AlertComponent.vue'
import { api } from '../services/api'
import { Options, Vue } from 'vue-class-component'

// @vue/component
@Options({
    components: {
        AlertComponent,
    },
})
export default class PublishPage extends Vue {
    alert = { level: '', message: '' }
    topic = ''
    messageData = ''
    maxAttempts = 100

    async onPublishSubmit(e: Event) {
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

        let data: Record<string, unknown>
        try {
            data = JSON.parse(this.messageData)
            if (typeof data !== 'object' || Object.keys(data).length === 0) {
                return setError('Data must be a non-empty JSON Object')
            }
        } catch (e) {
            return setError('Data must be a JSON Object')
        }

        try {
            const { res: message, err } = await api.publish(this.topic, data, this.maxAttempts)
            if (err) {
                this.alert.level = 'danger'
                this.alert.message = (err.response?.data ?? 'Unknown network request error') as string
                return
            }
            this.alert.level = 'success'
            this.alert.message = `Message created: ${message.id}`
        } catch (e) {
            setError(e)
        }
    }
}
</script>
