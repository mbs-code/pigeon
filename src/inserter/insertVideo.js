import consola from 'consola'
import moment from 'moment'
import { get } from 'object-path'
import throwIf from '../lib/throwIf'

import { Channel, Video, VideoStat } from '../../models'

export default async (item, { doChain = false }) => {
  // ID の取得
  const vid = get(item, 'id')
  consola.trace(`>> run '${vid}'`)

  // item が空ならエラー
  throwIf(item == null, new Error('No item data!'))

  // DB から Document の取得 (失敗時は null)
  let video = await Video.findOne({ video_id: vid })
  // const hasDatabase = video != null

  // データ整形 ///////////////////////////////////////////////////

  // チャンネルID
  const channelId = get(item, 'snippet.channelId')

  // タイムスタンプ
  const nowTime = moment() // TODO: フェッチ日時にする

  // サムネイル選択
  const thumbnail =
    get(item, 'snippet.thumbnails.high.url') ||
    get(item, 'snippet.thumbnails.default.url')

  // 状態判定
  // public, unlisted, (private), delete
  const status = get(item, 'status.privacyStatus')

  // 種別判定
  // upcoming, live, archive, video
  let type = 'video'
  if (get(item, 'liveStreamingDetails')) {
    // ライブのみ別処理 live or archive or upcoming
    let ct = get(item, 'snippet.liveBroadcastContent')
    if (ct === 'none') ct = 'archive'
    type = ct
  }

  // 経過時刻処理
  const duration = moment
    .duration(get(item, 'contentDetails.duration', 0))
    .asSeconds()

  // スケジュール上の開始時刻と終了時刻を計算
  // video type によって処理を変える
  let startTime = null
  let endTime = null
  switch (type) {
    case 'upcoming':
      // スケジュール上の予定時刻 endがない場合はstartと同時刻とする
      startTime = get(item, 'liveStreamingDetails.scheduledStartTime')
      endTime = get(item, 'liveStreamingDetails.scheduledEndTime') || startTime
      break
    case 'live':
      // 配信を開始した時間から取得した現在時刻 endは取得した現在時刻とする
      // (検索Query が拾えるように)
      startTime = get(item, 'liveStreamingDetails.actualStartTime')
      endTime = nowTime.toISOString()
      break
    case 'archive':
      // 実際に配信した時間を格納する(取得できない場合は投稿時間から経過時間分)
      startTime = get(item, 'liveStreamingDetails.actualStartTime')
      endTime = get(item, 'liveStreamingDetails.actualEndTime')
      if (!startTime || !endTime) {
        // video と同処理
        startTime = get(item, 'snippet.publishedAt')
        endTime = moment(startTime)
          .add(duration, 'seconds')
          .toISOString()
      }
      break
    case 'video':
      // 投稿時間から経過時間分
      startTime = get(item, 'snippet.publishedAt')
      endTime = moment(startTime)
        .add(duration, 'seconds')
        .toISOString()
      break
  }

  // 統計情報
  const stat = {
    timestamp: nowTime, // TODO: フェッチ日時にする
    view: get(item, 'statistics.viewCount'),
    like: get(item, 'statistics.likeCount'),
    bad: get(item, 'statistics.dislikeCount'),
    fav: get(item, 'statistics.favoriteCount'),
    comment: get(item, 'statistics.commentCount')
  }

  // ライブ中の統計追加
  const cv = get(item, 'liveStreamingDetails.concurrentViewers')
  if (cv) {
    // 開始時間からの時差
    const start = get(item, 'liveStreamingDetails.actualStartTime')
    const diffSec = nowTime.diff(moment(start), 'seconds')

    stat.seconds = diffSec
    stat.concurrent_viewers = cv
  }

  // メインメタ情報
  const meta = {
    video_id: vid,
    title: get(item, 'snippet.title'),
    text: get(item, 'snippet.description'),
    image: thumbnail,
    type,
    status,
    start_time: startTime,
    end_time: endTime,
    second: duration,
    url: `https://www.youtube.com/watch?v=${vid}`,
    published_at: get(item, 'snippet.publishedAt'),
    'time.actual_start_time': get(item, 'liveStreamingDetails.actualStartTime'),
    'time.actual_end_time': get(item, 'liveStreamingDetails.actualEndTime'),
    'time.scheduled_start_time': get(
      item,
      'liveStreamingDetails.scheduledStartTime'
    ),
    'time.scheduled_end_time': get(
      item,
      'liveStreamingDetails.scheduledEndTime'
    )
  }

  // DB 保存処理 //////////////////////////////////////////////////

  // ■ Channel を取得してくる (無かったら null)
  const channel = await Channel.findOne({ channel_id: channelId })

  // 取得できなかったら例外
  // TODO: 連鎖
  throwIf(!channel, new Error("'Channel' is not exist in the database."))

  // ■ Video を作成
  if (!video) video = new Video()
  video.set('channel', channel._id)
  video.set(meta)
  video.set('stats.now', stat)
  await video.save()

  const vlog = `<${video._id}>, ${video.video_id}, ${video.title}`
  consola.trace(`> 'Video' Create. ${vlog}`)

  // ■ Video-Stat を作成
  const videoStat = new VideoStat()
  videoStat.video = video._id
  videoStat.set(stat)
  await videoStat.save()

  const vslog = `<${videoStat._id}>, ${videoStat.timestamp.toISOString()}`
  consola.trace(`> 'VideoStat' Create. ${vslog}`)

  return video
}

/// ////////////////////////////////////////////////////////////
