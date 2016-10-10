import fs from 'fs'
import { spy } from 'sinon'
import sinonChai from 'sinon-chai'
import chai, { expect } from 'chai'
import path, { resolve } from 'path'
import { getAbsolutePath } from '../src/util'

chai.use(sinonChai)

describe('getAbsolutePath', () => {
  const existingPath = 'src/bin/dispo.js'
  it('throws when file doesnt exist', () => {
    expect(() => getAbsolutePath(existingPath)).to.not.throw
    expect(() => getAbsolutePath('nonexisting.json')).to.throw
  })

  it('returns absolute path when file exists', () => {
    expect(getAbsolutePath(existingPath)).to.equal(resolve(existingPath))
  })

  it('uses native fs and path methods', () => {
    const accessSync = spy(fs, 'accessSync')
    const resolve = spy(path, 'resolve')
    getAbsolutePath(existingPath)
    expect(resolve).to.have.been.calledOnce
    expect(resolve).to.have.been.calledWith(existingPath)
    expect(accessSync).to.have.been.calledOnce
    expect(accessSync).to.have.been.calledWith(resolve(existingPath), fs.constants.R_OK)
    accessSync.restore()
    resolve.restore()
  })

  it('pass 2nd parameter to fs.accessSync', () => {
    const accessSync = spy(fs, 'accessSync')
    getAbsolutePath(existingPath, fs.constants.W_OK)
    expect(accessSync).to.have.been.calledWith(resolve(existingPath), fs.constants.W_OK)
    accessSync.restore()
  })
})
