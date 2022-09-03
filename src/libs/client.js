const { Client } = require('discord.js')
const discordModals = require('discord-modals')

const client = new Client({
  intents: []
})

discordModals(client)

module.exports = client
