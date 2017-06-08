# Dispo

[![npm version](https://badge.fury.io/js/dispo.svg)](https://badge.fury.io/js/dispo) [![Build Status](https://travis-ci.org/gonsfx/dispo.svg?branch=master)](https://travis-ci.org/gonsfx/dispo) [![Coverage Status](https://coveralls.io/repos/github/gonsfx/dispo/badge.svg?branch=master)](https://coveralls.io/github/gonsfx/dispo?branch=master) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Dispo is a job and cronjob scheduler for Node.

It uses [Kue](https://github.com/Automattic/kue) as its job queue and [Redis](http://redis.io/) to store job data. Definition of recurring jobs is done using crontab syntax, one-off jobs can be queued using [ZeroMQ](http://zeromq.org/) requests. [nodemailer](https://github.com/nodemailer/nodemailer) and [nodemailer-sendmail-transport](https://github.com/andris9/nodemailer-sendmail-transport) are being used to send emails.

All Jobs, regardless if running automatically or queued on demand for single runs, have to be defined in a configuration file. Jobs defined as cronjobs with a recurring interval are scheduled and run automatically.

## Requirements

- [Redis](http://redis.io/)
- [ZeroMQ](http://zeromq.org/)

## Installation

```
> npm install dispo
```

## Usage

Dispo provides a binary to start from the command line.

```
> node_modules/.bin/dispo -h

Usage: dispo [options]

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -C, --config <config>    config file path, default: `jobs.json`
  -B, --basedir <basedir>  directory used as a base for relative config and job paths
```

The `--config` or `-C` option is required and points to the relative path of the configuration file. If no configuration path is given, the configuration is expected to be in `jobs.json` relative to the current working directory.

### Job configuration

Jobs are defined in the `jobs` property of the configuration file. Each job, identified using a name, must point its `file` property to a JavaScript file exporting a function that is run when the job is executed.

The following configuration example defines a job called `logRandomNumber` that can be queued on-demand and a recurring job called `databaseCleanup` that is defined to run on 01:00 am every day using [crontab syntax](https://en.wikipedia.org/wiki/Cron).

The `attempts` property on the database cleanup job defines that the job is only attempted to run once. When the property is not explicitely set, it defaults to 3 so a job is retried twice on failure. When a recurringly scheduled job/cronjob reaches fails on each of its attempts, it is not automatically rescheduled.

The `recipients` property will override the default set in [mailer.js](src/mailer.js). You can also use it to disable sending an email for a job when it is enabled globally. You can set the global configuration in [index.js](src/index.js).

```json
{
  "jobs": {
    "logRandomNumber": {
      "file": "jobs/logRandomNumber.js"
    },
    "databaseCleanup": {
      "file": "jobs/databaseCleanup.js",
      "cron": "0 1 * * * *",
      "attempts": 1,
      "recipients": "example@email.com"
    }
  }
}
```

#### Send email on job failure

Dispo supports sending an email when a job fails after all available retries, using [nodemailer](https://github.com/nodemailer/nodemailer) to send the mails.
To do so, simply enable the `mailer` in the configuration file and add email addresses that should be notified whenever a job fails to `notifyOnError` on a per job basis.

```json
{
  "options": {
    "mailer": true
  },
  "jobs": {
    "mightFail": {
      "file": "jobs/mightFail.js",
      "cron": "*/1 * * * *",
      "attempts": 3,
      "notifyOnError": "john.doe@example.com"
    }
  }
}
```

By default, dispo will use [nodemailer-sendmail-transport](https://github.com/andris9/nodemailer-sendmail-transport) to send your emails, but you're free to add a different nodemailer transport such as smtp.
You can also set mail options, such as `from`.

```javascript
import nodemailer from 'nodemailer'

module.exports = {
  options: {
    mailer: {
      transport: nodemailer.createTransport('smtp://smtp.example.com')
      mail: {
        from: 'dispo-reporter@example.com'
      }
    }
  },
  jobs: {
    mightFail: {
      file: 'jobs/mightFail.js',
      cron: '*/1 * * * *',
      attempts: 3,
      notifyOnError: 'john.doe@example.com'
    }
  }
}
```

#### Attempts with delay and backoff for failing jobs

Jobs that sometimes fail to execute correctly (or any job in general to be precise) can be configured to restart with a delay after they fail. You can use this feature via the `backoff` property.
Provide `backoff.type = 'fixed'` and the `backoff.delay = <Number>` in milliseconds to set a fixed delay in milliseconds that will be waited after a failed attempt to execute the job.
Provide `backoff.type = 'exponential'` and the `backoff.delay = <Number>` in milliseconds to set a exponential growing delay in milliseconds that will be waited after a failed attempt to execute the job. The base of the expenential growth will be your given delay.

The following configuration example defines a job called `flakyService` that is defined to run every minute on every day.
`flakyService` will be executed a second, third and fourth time when it fails (`attempts: 4`), but the second, third and fourth try will each wait 3 seconds before re-executing.

```json
{
  "flakyService": {
    "file": "jobs/flakyService.js",
    "cron": "*/1 * * * *",
    "attempts": 4,
    "backoff": {
      "delay": 3000,
      "type": "fixed"
    }
  }
}
```

##### incremental

The following configuration example defines a job called `flakyServiceWithLongRegenerationTime` that is defined to run every minute on every day.
`flakyServiceWithLongRegenerationTime` will be executed a second, third, fourth, fifth and sixth time when it fails (`attempts: 4`), but:
- the second try will wait 6 seconds,
- the third try will wait 9 seconds,
- the forth try will wait 12 seconds,
before re-executing.

```json
{
  "flakyServiceWithLongRegenerationTime": {
    "file": "jobs/flakyServiceWithLongRegenerationTime.js",
    "cron": "*/1 * * * *",
    "attempts": 4,
    "backoff": {
      "delay": 3000,
      "type": "incremental"
    }
  }
}
```

##### exponential

The following configuration example defines a job called `anotherFlakyServiceWithLongRegenerationTime` that is defined to run every minute on every day.
`anotherFlakyServiceWithLongRegenerationTime` will be executed a second and third time when it fails (`attempts: 4`), but:
- the second try will wait 4 seconds (= 2000 * 2000 milliseconds),
- the third try will wait 16 seconds (= 4000 * 4000 milliseconds),
before re-executing.

```json
{
  "anotherFlakyServiceWithLongRegenerationTime": {
    "file": "jobs/anotherFlakyServiceWithLongRegenerationTime.js",
    "cron": "*/1 * * * *",
    "attempts": 3,
    "backoff": {
      "delay": 2000,
      "type": "exponential"
    }
  }
}
```
