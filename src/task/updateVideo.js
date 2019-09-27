import consola from 'consola'
import { get } from 'object-path'
import throwIf from '../lib/throwIf'
import arrayToMap from '../lib/arrayToMap'
import YoutubePaginator from '../lib/YoutubePaginator'
import ItemSequencer from '../lib/itemSequencer'

import insertVideo from '../inserter/insertVideo'

export default async (api, videoIDs = [], options = { doChain: false }) => {
  const len = videoIDs.length
  consola.info(`[Update Video] run ${len} items ...`)

  // API の処理を実装
  // TODO: maxResult 関係
  // もしかしたらIDで検索すると maxResult が反応しない？
  // Search あたりで試してみる必要がある
  const paginator = new YoutubePaginator(async (next) => {
    const res = await api.videos.list({
      id: videoIDs.join(', '),
      part:
        'id, snippet, contentDetails, liveStreamingDetails, status, statistics',
      maxResults: 50,
      pageToken: next
    })
    return res
  })

  // 連続処理
  const res = new ItemSequencer()
  do {
    // API を叩く
    const items = await paginator.exec()

    const mes2 = `res:${paginator.statusCode}, next:${paginator.hasNext()}`
    consola.debug(`[Update Video] Fetch ${items.length} items (${mes2})`)

    // item が一つも取得できなかったらエラー
    throwIf(items.length === 0, new Error('Video data fetch error.'))

    // マッピング
    const map = arrayToMap(items, (item) => get(item, 'id'), videoIDs)

    // 逐次処理プロセス
    const seq = await process(map, options)
    res.merge(seq)
  } while (paginator.hasNext())

  // 結果表示
  const results = res.getResult()
  const mes = res.format('%r%, %t/%l, skip:%f')
  consola.info(
    `[Update Video] Finish! Update ${results.length} items. (${mes})`
  )
}

/// ////////////////////////////////////////////////////////////

const process = async (map, options) => {
  const seq = new ItemSequencer(map)
  seq.onSuccess = (value, key, res) => {
    consola.debug(`[Update Video] Updated. '${key}'`)
  }
  seq.onError = (value, key, error) => {
    consola.warn({
      message: `[Update Video] '${key}' - ${error.message}`,
      badge: false
    })
  }

  // 一つずつ保存する
  await seq.forEach(async (value, key, iseq) => {
    const res = await insertVideo(value, options)
    return res
  })

  // 結果表示
  const res = seq.getResult()
  const mes = seq.format('%r%, %t/%l, skip:%f')
  consola.debug(`[Update Video] Update ${res.length} items. (${mes})`)

  return seq
}