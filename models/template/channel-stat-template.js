export default {
  timestamp: {
    // 日時 必須にしたいけど無理
    type: Date
  },
  view: {
    // 再生数
    type: Number
  },
  comment: {
    // コメント数
    type: Number
  },
  subscriber: {
    // 登録者数 (つべ仕様により切り捨て)
    type: Number
  },
  video: {
    // 動画数
    type: Number
  }
}
