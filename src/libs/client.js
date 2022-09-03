const { Client } = require('discord.js')
const discordModals = require('discord-modals')

const client = new Client({
  intents: ['GuildMembers']
})

discordModals(client)

module.exports = client
