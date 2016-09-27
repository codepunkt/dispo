import path from 'path'
import chalk from 'chalk'
import winston from 'winston'
import prettyMs from 'pretty-ms'
import { isEmpty, isObject } from 'lodash'
import formatDate from 'dateformat'
import { ensureDirSync } from 'fs-extra'
import { getJob } from '.'

/**
 * Maps log levels to terminal colors
 * @type {Object}
 */
const mapLevelToColor = {
  error: 'red',
  info: 'white',
  verbose: 'cyan',
  warn: 'yellow'
}

/**
 * Default logger options
 * @type {Object}
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
 * @param  {String} createdAt - The jobs createdAt timestamp
 * @param  {String} delay - The jobs delay
 * @return {String} Human readable time of the next job run
 */
const runsIn = (createdAt, delay) => {
  return prettyMs(Number(createdAt) + Number(delay) - Date.now())
}

/**
 * Returns formatted date
 *
 * @param  {Date} date - Date to be formatted
 * @param  {String} format - Date format
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

  init () {
    ensureDirSync(path.resolve(this.config.path))
    this.winston = new winston.Logger(this.config.winstonConfig)
  }

  error (...params) { this.winston.error(...params) }
  info (...params) { this.winston.info(...params) }
  verbose (...params) { this.winston.verbose(...params) }
  warn (...params) { this.winston.warn(...params) }

  async logStart (job) {
    const { data, id } = await getJob(job)
    this.winston.info(`Starting ${data.name}`, Object.assign({ id }, data))
  }

  async logComplete (job) {
    const { _attempts, data, duration, id } = isObject(job) ? job : await getJob(job)
    const message = `Finished ${data.name} after ${prettyMs(Number(duration))}`
    this.winston.info(message, Object.assign({ id, duration, tries: _attempts }, data))
  }

  async logFailure (job, msg) {
    const { data, id } = await getJob(job)
    const message = `Failed ${data.name} with message "${msg}" after ${data.attempts} tries`
    this.winston.error(message, Object.assign({ id, message: msg }, data))
  }

  async logFailedAttempt (job, msg) {
    const { data, id } = await getJob(job)
    this.winston.warn(`Error on ${data.name}`, Object.assign({ id, message: msg }, data))
  }

  async logQueued ({ data, id, created_at: createdAt, _delay: delay }) {
    const message = `Queued ${data.name} to run in ${runsIn(createdAt, delay)}`
    this.winston.info(message, Object.assign({ id }, data))
  }
}
