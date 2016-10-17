import fs from 'fs'
import { resolve } from 'path'

export const getAbsolutePath = (path, mode = fs.R_OK) => {
  const dir = resolve(path)
  return fs.accessSync(dir, mode) || dir
}

export const parseJobs = (jobs, basedir) => {
  const res = []

  for (let name of Object.keys(jobs)) {
    const { file, cron, attempts, recipients } = jobs[name]

    if (!file) {
      throw new Error(`no file defined for job "${name}"`)
    }

    const job = require(getAbsolutePath(resolve(basedir, file)))
    res.push(Object.assign(cron ? { cron } : {}, recipients ? { recipients } : {}, {
      attempts: attempts || 3,
      fn: job.default || job,
      name
    }))
  }

  return res
}
