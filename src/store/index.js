const ONE_DAY = 86400000

const store = new Map()


/**
 * Clear 24 hours old states
 */
setInterval(() => {
  const invalidStates = [];

  store.forEach((state, key) => {
    const hasExpired = new Date() - state.created_at >= ONE_DAY
    if (hasExpired) {
      invalidStates.push(key)
    }
  })

  for (const invalidState of invalidStates) {
    const state = store.get(invalidState)
    console.log(`[store] deleted invalid state: discordId: "${state.discordId}"`)
    store.delete(invalidState)
  }
}, 5000);

module.exports = store
