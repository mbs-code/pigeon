import os from 'os'
import path from 'path'
import log4js from 'log4js'
import dateFormat from 'date-format'
import chalk from 'chalk'

const isCLI = process.env.NODE_ENV === 'cli'

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO' // DEBUG: TRACE or DEBUG, PRODUCTION: INFO or OFF
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || ''
const LOG_FILENAME = isCLI ? 'cli.log' : 'cron.log'

const levelColors = {
  TRACE: { meta: 'grey', body: 'grey', trace: null },
  DEBUG: { meta: 'green', body: 'white', trace: null },
  INFO: { meta: 'cyan', body: 'cyan', trace: null },
  WARN: { meta: 'yellow', body: 'yellow', trace: null },
  ERROR: { meta: 'red', body: 'red', trace: 'white' },
  FATAL: { meta: 'magenta', body: 'magenta', trace: 'white' }
}

const coloring = function(color, text) {
  if (color && chalk[color]) {
    return chalk[color](text)
  }
  return text
}

log4js.addLayout('origin', function({ addColor }) {
  return function(e) {
    const date = new Date(e.startTime)
    const level = e.level.levelStr.toUpperCase() // 大文字
    const hasCallStack = e.hasOwnProperty('callStack') // callStack を持っているか

    const dateStr = dateFormat('yyyy-MM-dd hh:mm:ss.SSS', date)
    const message = e.data.join(' ') // データはスペース区切り
    const levelStr = level.padEnd(5).slice(0, 5) // 5文字
    const color = levelColors[level]

    // メタ情報
    const meta = `${levelStr} ${dateStr} [${e.categoryName}]`
    const prefix = addColor ? coloring(color.meta, meta) : meta

    // ログ本体
    const body = addColor ? coloring(color.body, message) : message

    // スタックトレース
    let suffix = ''
    if (hasCallStack && color.trace) {
      const callStack = e.callStack
      suffix += os.EOL
      suffix += addColor ? coloring(color.trace, callStack) : callStack
    }

    return `${prefix} ${body}${suffix}`
  }
})

const logType = isCLI ? 'file' : 'dateFile'
log4js.configure({
  appenders: {
    out: { type: 'stdout', layout: { type: 'origin', addColor: true } },
    logFile: {
      type: logType,
      filename: path.join(LOG_DIRECTORY, LOG_FILENAME),
      pattern: 'yyyy-MM-dd',
      alwaysIncludePattern: true,
      daysToKeep: 5,
      backups: 1,
      keepFileExt: true,
      layout: { type: 'origin', addColor: false }
    },
    errFile: {
      type: 'file',
      filename: path.join(LOG_DIRECTORY, 'error.log'),
      maxLogSize: 1048576,
      backups: 1,
      keepFileExt: true,
      layout: { type: 'origin', addColor: false }
    },
    traceFile: {
      type: 'file',
      filename: path.join(LOG_DIRECTORY, 'trace.log'),
      maxLogSize: 1048576,
      backups: 1,
      keepFileExt: true,
      layout: { type: 'origin', addColor: false }
    },
    show: { type: 'logLevelFilter', appender: 'out', level: LOG_LEVEL },
    log: { type: 'logLevelFilter', appender: 'logFile', level: 'INFO' },
    err: { type: 'logLevelFilter', appender: 'errFile', level: 'WARN' }
  },
  categories: {
    default: {
      appenders: ['show', 'log', 'err', 'traceFile'],
      level: 'ALL',
      enableCallStack: true
    }
  }
})

export default log4js
export const EOL = os.EOL
export const plane = log4js.getLogger()
export const cli = log4js.getLogger('cli')
export const cron = log4js.getLogger('cron')
export const batch = log4js.getLogger('batch')
