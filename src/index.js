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
const prisma = require('./libs/prisma')

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
          .setLabel('Verify')
          .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('verify-apply-onion')
          .setLabel('Verify and apply for Onion')
          .setStyle(ButtonStyle.Primary),
    )

  let description = ''
  description += 'Verify yourself to access the server!'
  description += '\n\nAccess to specific rework channels requires the "onion" role, which is a malapropism for "opinion". These roles are handed out sporadically depending on the quality of your contributions to general pp discussions.'

  const embed = new EmbedBuilder()
    .setTitle('Verification')
    .setDescription(description)
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
  await interaction?.deferReply();

  if (interaction.isButton()) {
    if (interaction.customId === 'verify') {
      const state = uuid()

      store.set(state, {
        discordId: interaction.user.id,
        created_at: new Date(),
        verifyOnly: true,
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
        .setURL(url.toString())
        .setColor('Blue')

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Login with osu!')
            .setURL(url.toString())
            .setStyle(ButtonStyle.Link),
        )

      interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      }).catch(() => {})
    }

    if (interaction.customId === 'verify-apply-onion') {
      interaction.showModal(verifyModal).catch(() => {})
    }

    if (interaction.customId.includes('toggle-onion-to-')) {
      const discordId = interaction.customId.split('-')[3]

      try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        const member = await guild.members.fetch(discordId)
        const onion = await guild.roles.fetch(ROLES.onion)
        const dbMember = await prisma.members.findUnique({
          where: {
            discord_id: discordId,
          }
        })

        // Remove role if already present
        if (member.roles.cache.has(ROLES.onion)) {
          await member.roles.remove(onion)

          console.log(`${interaction.member?.nickname || interaction.member?.user.username} removed "${onion?.name}" role from "${member.nickname || member?.user.username}"`)

          const embeds = []
          const embed = EmbedBuilder.from(interaction.message.embeds[0])
          embeds.push(embed)
          const whoApprovedEmbed = new EmbedBuilder()
            .setAuthor({
              name: interaction.member?.nickname || interaction.member?.user.username,
              iconURL: interaction.member?.user.avatarURL()
            })
            .setDescription(`Removed the ${onion?.name} role from this member.\n<t:${(new Date().getTime() / 1000).toFixed(0)}:R>`)
            .setColor('Red')

          embeds.push(whoApprovedEmbed)

          const row = new ActionRowBuilder()

          if (dbMember?.is_declined) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`remove-from-deny-list-${discordId}`)
                .setLabel('Remove from deny list')
                .setStyle(ButtonStyle.Secondary),
            )

            const deniedEmbed = new EmbedBuilder()
              .setDescription("This member has been denied from Onion applications.")
              .setColor('Orange')

            embeds.push(deniedEmbed)
          } else {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`toggle-onion-to-${discordId}`)
                .setLabel('Add onion role')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`decline-application-${discordId}`)
                .setLabel('Decline application')
                .setStyle(ButtonStyle.Secondary),
            )
          }

          await interaction.update({
            embeds,
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

          if (dbMember?.is_declined) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`remove-from-deny-list-${discordId}`)
                .setLabel('Remove from deny list')
                .setStyle(ButtonStyle.Secondary),
            )

            const deniedEmbed = new EmbedBuilder()
              .setDescription("This member has been denied from Onion applications.")
              .setColor('Orange')

            embeds.push(deniedEmbed)
          }

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

    if (interaction.customId.includes('decline-application')) {
      const discordId = interaction.customId.split('-')[2]

      try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        const member = await guild.members.fetch(discordId)

        await prisma.members.update({
          where: {
            discord_id: discordId,
          },
          data: {
            is_declined: true,
          }
        })

        console.log(`${interaction.member?.nickname || interaction.member?.user.username} denied application from "${member.nickname || member?.user.username}"`)

        const embed = EmbedBuilder.from(interaction.message.embeds[0])
        const whoDeclinedEmbed = new EmbedBuilder()
          .setAuthor({
            name: interaction.member?.nickname || interaction.member?.user.username,
            iconURL: interaction.member?.user.avatarURL()
          })
          .setDescription(`Declined application.\n<t:${(new Date().getTime() / 1000).toFixed(0)}:R>`)
          .setColor('Orange')

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`remove-from-deny-list-${discordId}`)
              .setLabel('Remove from deny list')
              .setStyle(ButtonStyle.Secondary),
          );

        await interaction.update({
          embeds: [embed, whoDeclinedEmbed],
          components: [row],
        })

      } catch (error) {
        console.error(error)
      }
    }

    if (interaction.customId.includes('remove-from-deny-list')) {
      const discordId = interaction.customId.split('-')[4]

      try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        const member = await guild.members.fetch(discordId)
        const onion = await guild.roles.fetch(ROLES.onion)

        await prisma.members.update({
          where: {
            discord_id: discordId,
          },
          data: {
            is_declined: false,
          }
        })

        console.log(`${interaction.member?.nickname || interaction.member?.user.username} removed "${member.nickname || member?.user.username}" from deny list.`)

        const embed = EmbedBuilder.from(interaction.message.embeds[0])
        const whoDeclinedEmbed = new EmbedBuilder()
          .setAuthor({
            name: interaction.member?.nickname || interaction.member?.user.username,
            iconURL: interaction.member?.user.avatarURL()
          })
          .setDescription(`Removed from deny list.\n<t:${(new Date().getTime() / 1000).toFixed(0)}:R>`)
          .setColor('Orange')

        const row = new ActionRowBuilder()

        if (member.roles.cache.has(ROLES.onion)) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`toggle-onion-to-${discordId}`)
              .setLabel('Remove onion role')
              .setStyle(ButtonStyle.Danger),
          )
        } else {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`toggle-onion-to-${discordId}`)
              .setLabel('Add onion role')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`decline-application-${discordId}`)
              .setLabel('Decline application')
              .setStyle(ButtonStyle.Secondary),
          )
        }

        await interaction.update({
          embeds: [embed, whoDeclinedEmbed],
          components: [row],
        })

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
            .setStyle(ButtonStyle.Link),
        )

      interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      })
    }
  }
})

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch()
    } catch (error) {
      console.error(error)
      return;
    }
  }

  if (reaction.emoji.name === '❌' && reaction.message.author?.id === client.user?.id) {
    const discordId = reaction.message.components[0].components.reduce((acc, component) => {
      if (component.customId?.includes('toggle-onion-to')) {
        acc = component.customId.split('-')[3]
        return acc
      }

      if (component.customId?.includes('remove-from-deny-list')) {
        acc = component.customId.split('-')[4]
        return acc
      }

      if (component.customId?.includes('decline-application')) {
        acc = component.customId.split('-')[2]
        return acc
      }
    }, null)

    if (discordId) {
      try {
        await prisma.members.update({
          where: {
            discord_id: discordId,
          },
          data: {
            is_declined: true,
          }
        })

        console.log(`${user.username} denied application from "${discordId}"`)
        reaction.message.react('🚫')
      } catch (error) {
        console.error(error)
      }
    }
  }
})

client.once('ready', async () => {
  console.log('Connected to Discord.')

  console.log('Fetching roles...')
  try {
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
    const result = await guild?.roles.fetch()

    ROLES.map = result;
  } catch (error) {
    throw new Error(error)
  }
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

process.on('uncaughtException', (error) => {
  console.error(error)
})

process.on('unhandledRejection', (error) => {
  console.error(error)
})
