<template>
    <div>
        <div v-if="alert.message" class="mb-3">
            <alert-component
                :level="alert.level ?? 'info'"
                :message="alert.message"
            />
        </div>
        <form class="d-flex flex-row align-items-center flex-wrap">
            <div class="my-3 me-2">
                <label class="sr-only" for="topicInput">Topic</label>
                <input
                    id="topicInput" v-model="topic" type="text" class="form-control"
                    placeholder="Topic (min 4 characters)"
                >
            </div>
            <div class="d-flex flex-row align-items-center my-3 me-2">
                <label for="statusInput" class="me-2">Status</label>
                <select id="statusInput" v-model="status" class="form-select">
                    <option v-for="option of statusOptions" :value="option.value">
                        {{ option.text }}
                    </option>
                </select>
            </div>
            <div class="my-3 me-2">
                <label class="sr-only" for="timestampFromInput">Timestamp From</label>
                <input
                    id="timestampFromInput" v-model="after" type="text" class="form-control"
                    placeholder="From: 1970-01-01T00:00:00.000Z"
                >
            </div>
            <div class="my-3 me-2">
                <label class="sr-only" for="timestampToInput">Timestamp To</label>
                <input id="timestampToInput" v-model="before" type="text" class="form-control" placeholder="To: -">
            </div>
            <button type="submit" class="btn btn-primary my-3" :disabled="isSubmitDisabled" @click="onFilterSubmit">
                Submit
            </button>
        </form>
        <div class="d-inline-flex mb-3">
            <input id="autoRefreshInput" v-model="isAutoRefresh" class="form-check-input me-2" type="checkbox">
            <label class="form-check-label" for="autoRefreshInput">Auto Refresh (5s)</label>
        </div>
        <message-list-component
            mode="remote"
            :rows="rows"
            @row-click="onRowClick"
            @sort-change="onSortChange"
        />
        <div class="d-flex flex-row align-items-center flex-wrap mt-4">
            <router-link v-if="prevLink" class="pe-3" :to="prevLink" @click="onPaginationLinkClick">
                Previous
            </router-link>
            <router-link v-if="nextLink" class="pe-3" :to="nextLink" @click="onPaginationLinkClick">
                Next
            </router-link>
            <div class="d-inline-flex align-items-center" style="margin-left: auto">
                <label for="pageSizeInput" class="d-block col-6">Page Size</label>
                <select id="pageSizeInput" v-model="pageSize" class="form-select">
                    <option v-for="option of [10, 20, 50, 100]" :value="option">
                        {{ option }}
                    </option>
                </select>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import AlertComponent from './AlertComponent.vue'
import MessageListComponent from './MessageListComponent.vue'
import { createUrlFromProps, parsePropsFromUrl, parseUrl, setUrlFromProps } from '../helpers/url'
import { api, ListMessagesOptions, Message, MessageStatus } from '../services/api'
import { createCursor, createCursorFrom, PageDirection, SortDirection } from '@lib/common/cursor'
import { Options, Vue } from 'vue-class-component'
import { RowClickEvent, SortChangeEvent } from 'vue-good-table-next'
import { Watch } from 'vue-property-decorator'
import { RouteLocation } from 'vue-router'

import 'vue-good-table-next/dist/vue-good-table-next.css'

// @vue/component
@Options({
    components: {
        AlertComponent,
        MessageListComponent,
    },
})
export default class MessageSearchComponent extends Vue {
    apiQueryParams: Required<ListMessagesOptions> = {
        topic: '',
        status: '',
        after: '',
        before: '',
        cursor: '',
        direction: 'desc',
        limit: 10,
    }

    // form inputs
    topic = ''
    status = ''
    after = ''
    before = ''
    offset = ''
    direction: SortDirection = 'desc'
    pageSize = 10

    // table data
    rows: Message[] = []

    alert = { level: '', message: '' }
    isAutoRefresh = false
    isLoaded = false
    refreshTimer?: number
    isSubmitDisabled = true
    isUnmounting = false

    //region lifecycle
    created() {
        this.setPropsFromUrl()
        this.loadData()
    }

    beforeUnmount() {
        this.isUnmounting = true
        this.isAutoRefresh = false
    }
    //endregion

    //region data
    async loadData() {
        this.$store.commit('set', { error: null })
        this.alert.message = ''
        this.isLoaded = false

        const setError = (e: unknown): void => {
            this.alert.level = 'danger'
            this.alert.message = e as string
        }

        if (0 === this.topic.length || 4 <= this.topic.length) {
            try {
                const listMessagesOptions = Object.entries(this.apiQueryParams)
                    .reduce(
                        (res, [k, v]) => {
                            if (v !== '') {
                                // @ts-expect-error TS7503
                                res[k] = v
                            }
                            return res
                        },
                        {} as Partial<ListMessagesOptions>)

                const { res: messages, err } = await api.listMessages(listMessagesOptions)

                if (err) {
                    this.isAutoRefresh = false
                    this.alert.level = 'danger'
                    this.alert.message = (err.response?.data ?? 'Unknown network request error') as string
                    return
                }

                this.rows = messages
            } catch (e) {
                this.isAutoRefresh = false
                setError(e)
            }
        } else {
            setError('Topic must be at least 4 characters')
        }

        this.isLoaded = true
    }

    async repeatLoadData() {
        delete this.refreshTimer

        if (this.isUnmounting || ! this.isAutoRefresh) {
            return
        }

        await this.loadData()

        this.refreshTimer = setTimeout(() => this.repeatLoadData(), 5000) as any as number
    }
    //endregion

    //region getters
    get statusOptions() {
        return [
            { text: '', value: '' },
            ...Object.values(MessageStatus).map(value => ({
                text: value.split('_')
                    .map(word => word[0].toUpperCase() + word.slice(1))
                    .join(' '),
                value,
            })),
        ]
    }

    get prevLink(): string | undefined {
        return this.getPageUrl('prev')
    }

    get nextLink(): string | undefined {
        return this.getPageUrl('next')
    }
    //endregion

    //region events
    onFilterSubmit(e: MouseEvent) {
        e.preventDefault()
        this.isSubmitDisabled = true
        this.apiQueryParams.topic = this.topic
        this.apiQueryParams.status = this.status
        this.apiQueryParams.after = this.after
        this.apiQueryParams.before = this.before
        this.apiQueryParams.cursor = this.offset = ''
        this.updateUrlHistoryState({ pushState: true })
        this.onFilterSubmitLoadData()
    }

    onPaginationLinkClick(e: MouseEvent) {
        e.preventDefault()
        this.isAutoRefresh = false
        const target = e.target as HTMLLinkElement
        const { qs } = parseUrl(target.href)
        this.apiQueryParams.cursor = qs.offset
        this.updateUrlHistoryState({ pushState: true, url: target.href })
    }

    onRowClick(e: RowClickEvent<Message>) {
        this.isAutoRefresh = false
    }

    onSortChange(e: SortChangeEvent) {
        if (e.length !== 1 || e[0].field !== 'created_at') {
            return
        }

        this.apiQueryParams.cursor = ''
        this.offset = ''
        this.apiQueryParams.direction = e[0].type === 'asc' ? 'asc' : 'desc'
        this.direction = this.apiQueryParams.direction
    }
    //endregion

    //region watches
    @Watch('$route')
    onUrlChange(route: RouteLocation) {
        if (route.name === 'messages') {
            this.isAutoRefresh = false
            this.setPropsFromUrl()
            this.loadData()
        }
    }

    @Watch('topic')
    @Watch('status')
    @Watch('after')
    @Watch('before')
    onFilterChange() {
        if (this.isLoaded) {
            this.isSubmitDisabled = false
        }
    }

    @Watch('pageSize')
    onPageSizeChange(pageSize: number) {
        this.apiQueryParams.cursor = ''
        this.offset = ''
        this.apiQueryParams.limit = pageSize
    }

    @Watch('direction')
    @Watch('pageSize')
    onFilterSubmitLoadData() {
        this.isAutoRefresh = false
        this.updateUrlHistoryState()
        this.loadData()
    }

    @Watch('isAutoRefresh')
    onAutoRefreshChange(isEnabled: boolean) {
        if (isEnabled) {
            if (this.offset) {
                this.apiQueryParams.cursor = ''
                this.offset = ''
                this.updateUrlHistoryState({ pushState: true })
            }

            this.repeatLoadData()
        } else {
            if ( ! this.refreshTimer) {
                return
            }

            clearTimeout(this.refreshTimer)

            delete this.refreshTimer
        }
    }
    //endregion

    //region url handling
    getPageUrl(page: PageDirection) : string | undefined {
        let offset: string | undefined

        if ( ! this.rows.length) {
            offset = createCursorFrom(
                this.apiQueryParams.cursor,
                this.apiQueryParams.direction,
                page,
            )
        } else {
            offset = createCursor(this.rows, this.apiQueryParams.direction, page)
        }

        if ( ! offset) {
            return
        }

        return createUrlFromProps(
            {
                topic: this.apiQueryParams.topic,
                status: this.apiQueryParams.status,
                after: this.apiQueryParams.after,
                before: this.apiQueryParams.before,
                direction: this.apiQueryParams.direction,
                pageSize: this.apiQueryParams.limit,
                offset,
            },
            this.$router.currentRoute.value.path,
        )
    }

    setPropsFromUrl() {
        parsePropsFromUrl([
            {
                property: 'topic',
                defaultValue: '',
                cb: (value) => {
                    this.topic = value
                    this.apiQueryParams.topic = value
                },
            },
            {
                property: 'status',
                defaultValue: '',
                cb: (value) => {
                    this.status = value
                    this.apiQueryParams.status = value
                },
            },
            {
                property: 'after',
                defaultValue: '',
                cb: (value) => {
                    this.after = value
                    this.apiQueryParams.after = value
                },
            },
            {
                property: 'before',
                defaultValue: '',
                cb: (value) => {
                    this.before = value
                    this.apiQueryParams.before = value
                },
            },
            {
                property: 'direction',
                defaultValue: 'desc',
                cb: (value) => {
                    if (value === 'asc' || value === 'desc') {
                        this.direction = value
                        this.apiQueryParams.direction = value
                    } else {
                        this.direction = 'desc'
                        this.apiQueryParams.direction = 'desc'
                    }
                },
            },
            {
                property: 'pageSize',
                type: 'number',
                defaultValue: 10,
                cb: (value) => {
                    this.pageSize = value
                    this.apiQueryParams.limit = value
                },
            },
            {
                property: 'offset',
                defaultValue: '',
                cb: (value) => {
                    this.offset = value
                    this.apiQueryParams.cursor = value
                },
            },
        ])
    }

    updateUrlHistoryState(options?: { pushState?: boolean; url?: string }) {
        setUrlFromProps({
            topic: this.apiQueryParams.topic,
            status: this.apiQueryParams.status,
            after: this.apiQueryParams.after,
            before: this.apiQueryParams.before,
            direction: this.apiQueryParams.direction,
            pageSize: this.apiQueryParams.limit,
            offset: this.apiQueryParams.cursor,
        }, options)
    }
    //endregion
}
</script>
