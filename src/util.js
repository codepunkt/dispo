import fs from 'fs'
import { resolve } from 'path'

export const getAbsolutePath = (path, mode = fs.constants.R_OK) => {
  const dir = resolve(path)
  return fs.accessSync(dir, mode) || dir
}
