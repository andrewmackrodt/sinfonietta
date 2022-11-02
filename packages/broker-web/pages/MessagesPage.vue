<template>
    <main>
        <h3 class="pb-2">
            Messages
        </h3>
        <p>Read only view of message history.</p>
        <message-search-component />
    </main>
</template>

<script lang="ts">
import MessageSearchComponent from '../components/MessageSearchComponent.vue'
import { Options, Vue } from 'vue-class-component'

// @vue/component
@Options({
    components: {
        MessageSearchComponent,
    },
})
export default class MessagesPage extends Vue {

}
</script>
