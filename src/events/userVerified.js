const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const client = require('../libs/client')
const { getRoles, allRoles, ROLES } = require('../libs/roles')
const getEmoji = require('../libs/getEmoji')
const { Button } = require('discord.js')

async function onUserVerified({ discordId, osu, fruits, mania, taiko, skillsets }) {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  const member = await guild.members.fetch(discordId)
  const adminChannel = await guild.channels.fetch(process.env.DICORD_ADMIN_CHANNEL_ID)
  const username = member.nickname || member.user.username

  console.log(`"${username}" sent an Onion application.`)

  const roles = await getRoles(guild, {
    osu,
    fruits,
    mania,
    taiko,
  })

  const rolesToRemove = await allRoles(guild)

  const removedRoles = []

  for (const role of rolesToRemove) {
    if (member.roles.cache.has(role?.id)) {
      removedRoles.push(role)
    }
  }

  if (removedRoles.length > 0) {
    await member.roles.remove(removedRoles)
    console.log(`Removing roles from ${username}: ${removedRoles.map(role => role.name).join(', ')}`)
  }

  if (!member.roles.cache.has(ROLES.verified)) {
    const verifiedRole = await guild.roles.fetch(ROLES.verified)
    roles.push(verifiedRole)
  }

  await member.roles.add(roles)
  console.log(`Adding roles to ${username}: ${roles.map(role => role.name).join(', ')}`)

  let description = ''

  description += `Discord tag: <@${discordId}>\n\n`
  description += `${getEmoji('osu')} #${osu.statistics.global_rank ?? '0'}\n`
  description += `${getEmoji('fruits')} #${fruits.statistics.global_rank ?? '0'}\n`
  description += `${getEmoji('mania')} #${mania.statistics.global_rank ?? '0'}\n`
  description += `${getEmoji('taiko')} #${taiko.statistics.global_rank ?? '0'}\n\n`

  description += `Added ${roles.length} roles: ${roles.map(role => `<@&${role.id}>`).join(', ')}`

  if (removedRoles.length > 0) {
    description += `\nRemoved ${removedRoles.length} roles: ${removedRoles.map(role => `<@&${role.id}>`).join(', ')}`
  }

  let row

  if (member.roles.cache.has(ROLES.onion)) {
    row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`toggle-onion-to-${discordId}`)
          .setLabel('Remove onion role')
          .setStyle(ButtonStyle.Danger),
      );
  } else {
    row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`toggle-onion-to-${discordId}`)
        .setLabel('Add onion role')
        .setStyle(ButtonStyle.Primary),
    );
  }

  const embed = new EmbedBuilder()
    .setTitle(`${osu.username} has been ${removedRoles.length > 0 ? 're' : ''}verified! (⭐ ${osu.playmode})`)
    .setURL(`https://osu.ppy.sh/users/${osu.id}`)
    .setDescription(description)
    .addFields({
      name: 'Playstyle',
      value: osu.playstyle.join(', '),
      inline: true
    }, {
      name: 'Skillsets',
      value: skillsets,
      inline: false,
    })
    .setThumbnail(`https://s.ppy.sh/a/${osu.id}?v=${new Date().getTime()}`)
    .setColor('#b70f75')

  // Try renaming the user.
  try {
    await member.setNickname(osu.username)
  } catch {
    adminChannel.send(`Cannot rename ${member} to \`${osu.username}\`. Missing permissions (Member is owner or role is higher than me)`)
  }

  adminChannel.send({ embeds: [embed], components: [row] })
}

module.exports = onUserVerified
