import nodemailer from 'nodemailer'
import sendmailTransport from 'nodemailer-sendmail-transport'
import { getJob } from '.'

/**
 * Default logger options
 * @type {Object}
 */
const defaults = {
  transport: sendmailTransport(),
  mail: {
    from: 'Dispo <dispo@example.com>'
  }
}

/**
 * Mailer
 */
export default class Mailer {

  /**
   * Creates an instance of Mailer.
   *
   * @memberOf Mailer
   * @param {Object} [config={}]
   */
  constructor (config) {
    this.config = Object.assign({}, defaults, config)
  }

  /**
   * Initializes a nodemailer transport
   *
   * @memberOf Mailer
   * @return {Promise<void>}
   */
  init () {
    this._mailer = nodemailer.createTransport(this.config.transport)
  }

  sendMail (job, message) {
    return getJob(job).then(({ data: { notifyOnError, name }, id }) => {
      if (!notifyOnError) return

      return this._mailer.sendMail(Object.assign({}, this.config.mail, {
        to: notifyOnError,
        subject: `Job "${name}" (id ${id}) failed`,
        text: `Job "${name}" (id ${id}) failed\n\n${message}`
      }))
    })
  }
}
