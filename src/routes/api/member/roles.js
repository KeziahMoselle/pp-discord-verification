const client = require('../../../libs/client')
const prisma = require('../../../libs/prisma')

/**
 *
 * @param {import("fastify").FastifyRequest} request
 * @param {import("fastify").FastifyReply} reply
 */
async function memberRolesHandler(request, reply) {
  const { osu_id } = request.query

  try {
    console.log(`API: member.roles: getting roles for osu_id: "${osu_id}"`)
    const member = await prisma.members.findUnique({
      where: {
        osu_id
      }
    })

    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
    const discordMember = await guild.members.fetch(member.discord_id)
    const roles = discordMember.roles.cache.map(role => ({
      id: role.id,
      name: role.name
    })).filter(role => role.name !== '@everyone')

    return roles
  } catch (error) {
    console.error(error)
    return []
  }
}

module.exports = memberRolesHandler
