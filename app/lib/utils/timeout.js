/**
 * Helper to wrap promises with a timeout.
 * Rejects with a descriptive Error if the operation takes longer than ms.
 *
 * @param {Promise} promise - The promise to execute
 * @param {number} ms - Timeout in milliseconds
 * @param {string} [errorMsg] - Optional error message
 * @returns {Promise}
 */
function withTimeout(promise, ms = 8000, errorMsg) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMsg || `Operation timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

module.exports = {
  withTimeout
};
