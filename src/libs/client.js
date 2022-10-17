const { Client, GatewayIntentBits, Partials } = require('discord.js')
const discordModals = require('discord-modals')

const client = new Client({
  intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

discordModals(client)

module.exports = client
