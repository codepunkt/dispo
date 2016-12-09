import path from 'path'
import chalk from 'chalk'
import winston from 'winston'
import prettyMs from 'pretty-ms'
import formatDate from 'dateformat'
import { isEmpty } from 'lodash'
import { existsSync, mkdirSync } from 'fs'
import { getJob } from '.'

/**
 * Maps log levels to terminal colors
 */
const mapLevelToColor = {
  error: 'red',
  info: 'white',
  verbose: 'cyan',
  warn: 'yellow'
}

/**
 * Default logger options
 */
const defaults = {
  winstonConfig: {
    level: 'verbose',
    transports: [
      new winston.transports.Console({
        timestamp: true,
        formatter: (options) => {
          const color = mapLevelToColor[options.level]
          let result = chalk[color](`[${dateTime()}] ${options.message}`)

          if (!isEmpty(options.meta)) {
            result += chalk.dim(chalk[color](`\n  ${JSON.stringify(options.meta)}`))
          }

          return result
        }
      }),
      new winston.transports.File({ filename: 'log/scheduler.log' })
    ]
  }
}

/**
 * Returns human readable time of the next job run based on the jobs creation date and delay
 *
 * @param {String} createdAt - The jobs createdAt timestamp
 * @param {String} delay - The jobs delay
 * @return {String} Human readable time of the next job run
 */
const runsIn = (createdAt, delay) => {
  return prettyMs(Number(createdAt) + Number(delay) - Date.now())
}

/**
 * Returns formatted date
 *
 * @param {Date} [date=Date.now()] - Date to be formatted
 * @param {String} [format=HH:MM:ss] - Date format
 * @return {String} Formatted date
 */
const dateTime = (date = Date.now(), format = 'HH:MM:ss') => {
  return formatDate(date, format)
}

/**
 * Logger
 */
export default class Logger {
  constructor (options) {
    this.config = Object.assign({}, defaults, options)
  }

  /**
   * @memberOf Logger
   */
  init () {
    const logpath = path.resolve(this.config.path)
    if (!existsSync(logpath)) {
      mkdirSync(logpath)
    }
    this.winston = new winston.Logger(this.config.winstonConfig)
  }

  /**
   * @param {Array<any>} params
   * @memberOf Logger
   */
  error (...params) { this.winston.error(...params) }
  /**
   * @param {Array<any>} params
   * @memberOf Logger
   */
  info (...params) { this.winston.info(...params) }
  /**
   * @param {Array<any>} params
   * @memberOf Logger
   */
  verbose (...params) { this.winston.verbose(...params) }
  /**
   * @param {Array<any>} params
   * @memberOf Logger
   */
  warn (...params) { this.winston.warn(...params) }

  /**
   * @param {{data:{name:String},id:String}} job
   * @memberOf Logger
   */
  logStart (job) {
    getJob(job).then(({ data, id }) => {
      this.winston.info(`Starting ${data.name}`, Object.assign({ id }, data))
    })
  }

  /**
   * @param {{_attempts:String,data:{name:String},duration:String,id:String}} job
   * @memberOf Logger
   */
  logComplete (job) {
    getJob(job).then(({ _attempts, data, duration, id }) => {
      const message = `Finished ${data.name} after ${prettyMs(Number(duration))}`
      this.winston.info(message, Object.assign({ id, duration, tries: _attempts }, data))
    })
  }

  /**
   * @param {{data:{attempts:String,name:String},id:String}} job
   * @param {String} msg
   * @memberOf Logger
   */
  logFailure (job, msg) {
    getJob(job).then(({ data, id }) => {
      const message = `Failed ${data.name} with message "${msg}" after ${data.attempts} tries`
      this.winston.error(message, Object.assign({ id, message: msg }, data))
    })
  }

  /**
   * @param {{data:{name:String},id:String}} job
   * @param {String} msg
   * @memberOf Logger
   */
  logFailedAttempt (job, msg) {
    getJob(job).then(({ data, id }) => {
      this.winston.warn(`Error on ${data.name}`, Object.assign({ id, message: msg }, data))
    })
  }

  /**
   * @param {{data:{name:String},_delay:String,created_at:String,id:String}} job
   * @memberOf Logger
   */
  logQueued ({ data, id, created_at: createdAt, _delay: delay }) {
    const message = `Queued ${data.name} to run in ${runsIn(createdAt, delay)}`
    this.winston.info(message, Object.assign({ id }, data))
  }
}
