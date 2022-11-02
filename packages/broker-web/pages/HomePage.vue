<template>
    <main>
        <p>
            Sinfonietta is a demo message broker implementation using a database backend.
        </p>
        <p>
            The implementation attempts to provide a FIFO queue† across multiple producers and consumers††. Consumed
            messages become "in-flight" with a configurable TTL. If a message is not ACK'd within the TTL, it
            is re-added to the end of the queue. If the message fails <i>max attempt</i> times, it will be marked as
            "failed".
        </p>
        <p>
            Message history and events are preserved regardless of a message being successfully processed ("ack") or
            reaching max attempts ("failed").
        </p>
        <p class="small">
            † Multiple messages stored at the same millisecond may be consumed out of order.
        </p>
        <p class="small">
            †† Consumption is non-blocking which means that the order of processing is not guaranteed in a system with
            multiple parallel consumers. For example, if Client A consumes Message 1, Client B may consume and ack
            Message 2 before Client A has ack'd Message 1. However, messages are still expected to have been delivered
            in FIFO order.
        </p>
    </main>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component'

export default class HomePage extends Vue {

}
</script>
