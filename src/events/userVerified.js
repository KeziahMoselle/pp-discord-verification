const { MessageEmbed } = require('discord.js')
const client = require('../libs/client')
const { getRoles } = require('../libs/roles')
const getEmoji = require('../libs/getEmoji')

async function onUserVerified({ discordId, osu, fruits, mania, taiko }) {

  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  const member = await guild.members.fetch(discordId)

  const roles = await getRoles(guild, {
    osu,
    fruits,
    mania,
    taiko,
  })

  for (const role of roles) {
    await member.roles.add(roles)
  }

  const adminChannel = await guild.channels.fetch(process.env.DICORD_ADMIN_CHANNEL_ID)

  let description = ''

  description += `Discord tag: <@${discordId}>\n\n`
  description += `${getEmoji('osu')} #${osu.statistics.global_rank ?? '0'} (#${Math.round(osu.statistics.pp)})\n`
  description += `${getEmoji('fruits')} #${fruits.statistics.global_rank ?? '0'} (#${Math.round(fruits.statistics.pp)})\n`
  description += `${getEmoji('mania')} #${mania.statistics.global_rank ?? '0'} (#${Math.round(mania.statistics.pp)})\n`
  description += `${getEmoji('taiko')} #${taiko.statistics.global_rank ?? '0'} (#${Math.round(taiko.statistics.pp)})\n\n`

  description += `Added ${roles.length} roles: ${roles.map(role => `<@&${role.id}>`).join(', ')}`

  const embed = new MessageEmbed()
    .setTitle(`${osu.username} has been verified! (⭐ ${osu.playmode})`)
    .setURL(`https://osu.ppy.sh/users/${osu.id}`)
    .setDescription(description)
    .addField('Playstyle', osu.playstyle.join(', '), true)
    .setThumbnail(`https://s.ppy.sh/a/${osu.id}?v=${new Date().getTime()}`)

  adminChannel.send({ embeds: [embed] })
}

module.exports = onUserVerified
