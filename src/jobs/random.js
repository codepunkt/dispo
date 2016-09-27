const wait = async (sec = Math.random() * 4 + 1) =>
  new Promise((resolve) => setTimeout(() => resolve(), 1e3 * sec))

export default async (job) => {
  await wait()
  if (Math.random() > 0.6) {
    throw new Error('oh noes')
  }
}
