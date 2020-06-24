const ENV_VARS = ['CRYPTO_KEY', 'NEW_CRYPTO_KEY', 'MAGIC_IV', 'MAGIC_SALT', 'API_URL']

function checkEnvVars() {
  let isOk = true
  ENV_VARS.forEach(envName => {
    if (!process.env[envName] === false) {
      console.error('Failed to load ENV %s', envName)
      isOk = false
    }
  })

  return isOk
}

module.exports = checkEnvVars
