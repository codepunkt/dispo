import nodemailer from 'nodemailer'
import sendmailTransport from 'nodemailer-sendmail-transport'
import { getJob } from '.'

/**
 * Default logger options
 * @type {Object}
 */
const defaults = {
  nodemailerConfig: {
    transportOptions: null,
    mailOptions: {
      from: 'info@dispo-cheduler.com',
      to: '', // list of receivers, override this through the jobs config file
      subject: 'Dispo - job and cronjob scheduler for Node',
      text: ''
    }
  }
}

/**
 * Mailer
 */
export default class Mailer {
  constructor (options) {
    this.config = Object.assign({}, defaults, options)
  }

  init () {
    this._mailer = nodemailer.createTransport(this.config.nodemailerConfig.transportOptions || sendmailTransport())
  }

  async sendMail (job) {
    let mailOptions = this.config.nodemailerConfig.mailOptions
    const { data, id } = await getJob(job)

    // set recipients to empty string to disable mail in a per job basis
    if ('recipients' in data) {
      mailOptions.to = data.recipients
    }

    if (!('enabled' in this.config)) {
      return
    }
    if (this.config.enabled === false) {
      return
    }
    if (mailOptions.to === '') {
      return
    }

    mailOptions.text = `Job ${id} - ${data.name}: Failed on all ${data.attempts} attempts.`

    return this._mailer.sendMail(mailOptions)
  }
}
