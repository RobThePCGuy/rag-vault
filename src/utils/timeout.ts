// Shared timeout utility for wrapping async operations

/**
 * Wrap a promise with a timeout.
 * Rejects with an Error if the promise doesn't resolve within `ms` milliseconds.
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param label - Description for the timeout error message
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
