<template lang="pug">
  div(v-if='account._id')
    v-row

      v-col
        v-row
          v-col
            v-card
              v-card-title {{ account.name }}
              v-card-text asd
        
        v-row
          v-col(v-for='(channel, key) in account.channels' :key='key')
            ChannelPanel(:channel='channel')

      v-col
        VideoList(:videos='videos' :imageWidth='200')

</template>

<script>
import ChannelPanel from '~/components/ChannelPanel'
import VideoList from '~/components/VideoList'

export default {
  components: {
    ChannelPanel,
    VideoList
  },

  data() {
    return {
      account: {},
      videos: [],
      paginator: {}
    }
  },

  async mounted() {
    await this.getDataFromApi()
  },

  methods: {
    async getDataFromApi() {
      const id = this.$nuxt.$route.params.id // account hash

      // fetch account
      const account = await this.$axios.$get(`/account/${id}`)
      this.account = account

      // fetch videos
      const channelKeys = account.channels.map((e) => e._id)
      const { items, paginator } = await this.$axios.$get(`/video`, {
        params: {
          channel: channelKeys.join(','),
          limit: 20,
          sort: 'start_time',
          order: 'desc'
        }
      })

      this.videos = items || []
      this.paginator = paginator
    }
  }
}
</script>
