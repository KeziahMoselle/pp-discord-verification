require('dotenv').config()
const client = require('./libs/client')
const fastify = require('fastify')()
const discord = require('./routes/discord')
const osu = require('./routes/osu')
const onUserVerified = require('./events/userVerified')

// API
fastify.get('/', discord)
fastify.get('/osu', osu)

// DISCORD
client.once('ready', () => console.log('Connected to Discord.'))
client.on('userVerified', onUserVerified)
client.login(process.env.DISCORD_BOT_TOKEN)

const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3000)
    console.log(`Server started on port ${process.env.PORT}.`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}


start()
