import Vue from 'vue'
import VuetifyToast from 'vuetify-toast-snackbar'

Vue.use(VuetifyToast, {
  x: 'right',
  y: 'bottom',
  timeout: 0, // 0: fixed
  color: 'grey darken-4',
  closeIcon: 'mdi-close',

  queueable: false, // 一つずつ処理する
  // multiLine: false,
  // vertical: false,
  shorts: {
    info: {
      // 5秒で消える
      icon: 'mdi-information',
      textColor: 'red',
      iconColor: 'blue',
      timeout: 5000,
      dismissable: true, // タッチで終了
      showClose: false
    },
    error: {
      // クリックして消える
      icon: 'mdi-alert',
      iconColor: 'red',
      timeout: 0,
      dismissable: false,
      showClose: true
    }
  }
})
