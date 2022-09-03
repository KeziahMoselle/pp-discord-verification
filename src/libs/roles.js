const { Guild, Role } = require('discord.js');
const { get } = require('http');
const client = require('./client')

const ROLES = {
  onion: '577267917662715904',
  verified: '909555235834441758',
  osu: {
    1: '909540204719800390', // 1 digit
    2: '909550783987609651', // 2 digits
    3: '909550818317971588', // 3 digits
    4: '909550845895524404', // 4 digits
    5: '909550868876120165', // 5+ digits
  },
  fruits: {
    1: '909551039190036582', // 1 digit
    2: '909551055455526932', // 2 digits
    3: '909551073142906921', // 3 digits
    4: '909551096672972840', // 4 digits
    5: '909551112997187645', // 5+ digits
  },
  mania: {
    1: '909551203497701467', // 1 digit
    2: '909551238905987162', // 2 digits
    3: '909551270266826852', // 3 digits
    4: '909551300402884628', // 4 digits
    5: '909551320120320120', // 5+ digits
  },
  taiko: {
    1: '909550895681916958', // 1 digit
    2: '909550922391253033', // 2 digits
    3: '909550969354879068', // 3 digits
    4: '909550994952716288', // 4 digits
    5: '909551014175195147', // 5+ digits
  }
}

/**
 * Get role based on rank and default playmode
 * @param {Guild} guild
 * @param {Object} user
 * @returns {Array<Role>}
 */
async function getRoles(guild, { osu, fruits, mania, taiko }) {
  const roles = await Promise.all([
    getRole(guild, osu, 'osu'),
    getRole(guild, fruits, 'fruits'),
    getRole(guild, mania, 'mania'),
    getRole(guild, taiko, 'taiko'),
  ])

  return roles.filter(role => role)
}

/**
 *
 * @param {Guild} guild
 * @param {Object} user
 * @param {'osu'|'fruits'|'mania'|'taiko'} mode
 * @returns
 */
async function getRole(guild, user, mode) {
  if (!user.statistics.global_rank) {
    return
  }

  let digits = user.statistics.global_rank.toString().length

  if (digits >= 5) {
    digits = 5
  }

  const role = await guild.roles.fetch(ROLES[mode][digits])
  return role
}

/**
 * Return a list of role ids
 *  @param {Guild} guild
 *  @returns {Array}
 */
async function allRoles(guild) {
  const rolesIds = Object.values(ROLES).reduce((acc, el) => {
    acc.push(Object.values(el))
    return acc
  }, []).flat()

  const roles = await Promise.all(rolesIds.map(id => guild.roles.fetch(id)))
  return roles
}

module.exports = {
  getRoles,
  allRoles,
  ROLES
}
