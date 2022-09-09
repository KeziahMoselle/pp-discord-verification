require('dotenv').config()
const path = require('path')
const client = require('./libs/client')
const fastify = require('fastify')()
const fastifyStatic = require('@fastify/static')
const osu = require('./routes/osu')
const apiMemberRoles = require('./routes/api/member/roles')
const onUserVerified = require('./events/userVerified')
const {
  EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js')
const { PrismaClient } = require('@prisma/client')
const { v4: uuid } = require('@lukeed/uuid')
const store = require('./store')
const { ROLES } = require('./libs/roles')

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
})

/**
 * API
 */
fastify.get('/osu', osu)
fastify.get('/success', (request, reply) => {
  return reply.sendFile('success.html')
})

fastify.get('/api/member/roles', apiMemberRoles)

/**
 * DISCORD
 */


/**
 * Send the application form or
 * do nothing if it exists in the last 100 messages.
 */
client.on('ready', async () => {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID)
  const adminChannel = await guild.channels.fetch(process.env.DISCORD_APPLICATION_CHANNEL)

  const messages = await adminChannel.messages.fetch({
    limit: 100,
  })

  for (const [id, message] of messages) {
    if (message.author.id === client.user?.id && message.components.length > 0) {
      return console.log('Found an already existing apply embed.')
    }
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('verify')
          .setLabel('Apply')
          .setStyle(ButtonStyle.Success)
    )

  const embed = new EmbedBuilder()
    .setTitle('Verifying application')
    .setDescription('Description')
    .setColor('#b70f75')

  adminChannel.send({
    embeds: [embed],
    components: [row]
  })
})

const verifyModal = new ModalBuilder()
  .setCustomId('verify-modal')
  .setTitle('Verifying application')

const skillsetsInput = new TextInputBuilder()
  .setCustomId('verify-skillsets')
  .setLabel('Skillsets you\'d be most interested in')
  .setPlaceholder('speed / jump aim / tech / idk')
  .setStyle(TextInputStyle.Paragraph)
  .setRequired(true)

const skillsetsRow = new ActionRowBuilder()
  .addComponents(skillsetsInput);

verifyModal.addComponents(skillsetsRow)

client.on('userVerified', onUserVerified)

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'verify') {
      await interaction.showModal(verifyModal).catch(() => {})
    }

    if (interaction.customId.includes('toggle-onion-to-')) {
      const discordId = interaction.customId.split('-')[3]

      try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        const member = await guild.members.fetch(discordId)
        const onion = await guild.roles.fetch(ROLES.onion)

        // Remove role if already present
        if (member.roles.cache.has(ROLES.onion)) {
          await member.roles.remove(onion)

          console.log(`${interaction.member?.nickname || interaction.member?.user.username} removed "${onion?.name}" role from "${member.nickname || member?.user.username}"`)

          const embed = EmbedBuilder.from(interaction.message.embeds[0])
          const whoApprovedEmbed = new EmbedBuilder()
            .setAuthor({
              name: interaction.member?.nickname || interaction.member?.user.username,
              iconURL: interaction.member?.user.avatarURL()
            })
            .setDescription(`Removed the ${onion?.name} role from this member.\n<t:${(new Date().getTime() / 1000).toFixed(0)}:R>`)
            .setColor('Red')

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`toggle-onion-to-${discordId}`)
                .setLabel('Add onion role')
                .setStyle(ButtonStyle.Primary),
            );

          await interaction.update({
            embeds: [embed, whoApprovedEmbed],
            components: [row],
          })
        } else {
          await member.roles.add(onion)

          console.log(`${interaction.member?.nickname || interaction.member?.user.username} added "${onion?.name}" role to "${member.nickname || member?.user.username}"`)

          const embed = EmbedBuilder.from(interaction.message.embeds[0])
          const whoApprovedEmbed = new EmbedBuilder()
            .setAuthor({
              name: interaction.member.nickname || interaction.member?.user.username,
              iconURL: interaction.member?.user.avatarURL()
            })
            .setDescription(`Added the ${onion?.name} role to this member.\n<t:${(new Date().getTime() / 1000).toFixed(0)}:R>`)
            .setColor('Blue')

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`toggle-onion-to-${discordId}`)
                .setLabel('Remove onion role')
                .setStyle(ButtonStyle.Danger),
            );

          try {
            await member.send(`Performance Points: You now have the "${onion?.name}" role.`)
          } catch (error) {
            console.warn(`Could not send a DM to Discord ID: "${member.user.id}"`)
          }

          await interaction.update({
            embeds: [embed, whoApprovedEmbed],
            components: [row],
          })
        }

      } catch (error) {
        console.error(error)
      }
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'verify-modal') {
      const skillsets = interaction.fields.getTextInputValue('verify-skillsets')

      const state = uuid()

      store.set(state, {
        discordId: interaction.user.id,
        skillsets,
        created_at: new Date()
      })

      console.log(`[store] added state from user ${interaction.user.username}${interaction.user.discriminator}`)

      const url = new URL('https://osu.ppy.sh/oauth/authorize')

      url.searchParams.append('client_id', process.env.OSU_CLIENT_ID)
      url.searchParams.append('scope', 'identify')
      url.searchParams.append('response_type', 'code')
      url.searchParams.append('redirect_uri', process.env.OSU_CALLBACK_URL)
      url.searchParams.append('state', state)

      const embed = new EmbedBuilder()
        .setTitle('Click here to verify your osu! account!')
        .setDescription(`To finalize the application you need to login with your osu! account.\nYou will be redirected to a success page when the application has been successfully sent.`)
        .setFooter({
          text: 'Your application can take several days to be accepted.'
        })
        .setURL(url.toString())
        .setColor('#b70f75')

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Login with osu!')
            .setURL(url.toString())
            .setStyle(ButtonStyle.Link)
        )

      interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      })
    }
  }
})

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  await guild?.roles.fetch()

  console.log('Connected to Discord.')
})

/**
 * Start app
 */
const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3000, '0.0.0.0')
    client.login(process.env.DISCORD_BOT_TOKEN)
    console.log(`API started on port ${process.env.PORT}.`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()

process.on('uncaughtExceptionMonitor', (error) => {
  if (error.message === 'Unknown interaction') {
    return
  }

  throw error
})

process.on('unhandledRejection', (error) => {
  console.error(error)
})
