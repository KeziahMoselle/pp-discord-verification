const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const client = require('../libs/client')
const { getRoles, allRoles, ROLES } = require('../libs/roles')
const getEmoji = require('../libs/getEmoji')
const { Button } = require('discord.js')
const prisma = require('../libs/prisma')

async function onUserVerified({ discordId, osu, fruits, mania, taiko, skillsets, verifyOnly }) {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  const member = await guild.members.fetch(discordId)
  const adminChannel = await guild.channels.fetch(process.env.DICORD_ADMIN_CHANNEL_ID)
  const username = member?.nickname || member?.user?.username

  console.log(`"${username}" has been verified.`)

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


  // Try renaming the user.
  /*
    let renamed = ''
    if (member?.nickname !== osu.username || member.user.username !== osu.username) {
    try {
      await member.setNickname(osu.username)
      renamed = `**Renamed** to ${osu.username}.`
    } catch {
      renamed = `**Cannot rename** ${member} to \`${osu.username}\`.\n*Reason: Missing permissions (Member is owner or role is higher than me)*`
    }
  } */

  await prisma.members.upsert({
    where: { discord_id: discordId || 0 },
    update: {},
    create: {
      discord_id: String(discordId),
      osu_id: String(osu.id),
    }
  })

  if (verifyOnly) {
    let description = ''

    const playstyle =
      osu?.playstyle?.join(', ')
      ?? fruits?.playstyle?.join(', ')
      ?? mania?.playstyle?.join(', ')
      ?? taiko?.playstyle?.join(', ')

    description += `Discord tag: <@${discordId}>\n\n`

    description += `Playstyle: ${playstyle}\n\n`

    description += `${getEmoji('osu')} #${osu?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('fruits')} #${fruits?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('mania')} #${mania?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('taiko')} #${taiko?.statistics?.global_rank ?? '0'}\n\n`

    description += `**Added roles**: ${roles.map(role => `<@&${role.id}>`).join(', ')}`

    // description += `\n${renamed}`

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${osu.username} (⭐ ${osu.playmode})`,
        iconURL: `https://s.ppy.sh/a/${osu.id}?v=${new Date().getTime()}`,
        url: `https://osu.ppy.sh/users/${osu.id}`
      })
      .setTitle(`✅ ${member.nickname || member.user.username} has been ${removedRoles.length > 0 ? 're' : ''}verified!`)
      .setDescription(description)
      .setURL(`https://osu.ppy.sh/users/${osu.id}`)
      .setThumbnail(member.user.avatarURL())
      .setColor('Blue')

    await adminChannel.send({ embeds: [embed] })
  } else {
    let description = ''

    const playstyle =
      osu?.playstyle?.join(', ')
      ?? fruits?.playstyle?.join(', ')
      ?? mania?.playstyle?.join(', ')
      ?? taiko?.playstyle?.join(', ')

    description += `Discord tag: <@${discordId}>\n\n`

    description += `Playstyle: ${playstyle}\n`

    description += `Skillsets:\n\`\`\`${skillsets}\`\`\`\n\n`

    description += `${getEmoji('osu')} #${osu?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('fruits')} #${fruits?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('mania')} #${mania?.statistics?.global_rank ?? '0'}\n`
    description += `${getEmoji('taiko')} #${taiko?.statistics?.global_rank ?? '0'}\n\n`

    description += `**Added roles**: ${roles.map(role => `<@&${role.id}>`).join(', ')}`

    // description += `\n${renamed}`

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${osu.username} (⭐ ${osu.playmode})`,
        iconURL: `https://s.ppy.sh/a/${osu.id}?v=${new Date().getTime()}`,
        url: `https://osu.ppy.sh/users/${osu.id}`
      })
      .setTitle(`✅ ${member.nickname || member.user.username} has been ${removedRoles.length > 0 ? 're' : ''}verified!`)
      .setURL(`https://osu.ppy.sh/users/${osu.id}`)
      .setDescription(description)
      .setThumbnail(member.user.avatarURL())
      .setColor('#b70f75')

    const embeds = [embed]

    let row

    if (member.roles.cache.has(ROLES.onion)) {
      row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`toggle-onion-to-${discordId}`)
            .setLabel('Remove onion role')
            .setStyle(ButtonStyle.Danger),
        );

      const alreadyOnionEmbed = new EmbedBuilder()
        .setDescription("This member already has the Onion role.")
        .setColor('Grey')

      embeds.push(alreadyOnionEmbed)
    } else {
      row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`toggle-onion-to-${discordId}`)
          .setLabel('Add onion role')
          .setStyle(ButtonStyle.Primary),
      );
    }

    await adminChannel.send({ embeds, components: [row] })
  }


}

module.exports = onUserVerified
