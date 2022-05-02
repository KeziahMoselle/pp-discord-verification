const { Guild, Role } = require('discord.js');
const { get } = require('http');
const client = require('./client')

const ROLES = {
  verified: '909555235834441758',
  osu: {
    1: '909540204719800390',
    2: '909550783987609651',
    3: '909550818317971588',
    4: '909550845895524404',
    5: '909550868876120165',
  },
  fruits: {
    1: '909551039190036582',
    2: '909551055455526932',
    3: '909551073142906921',
    4: '909551096672972840',
    5: '909551112997187645',
  },
  mania: {
    1: '909551203497701467',
    2: '909551238905987162',
    3: '909551270266826852',
    4: '909551300402884628',
    5: '909551320120320120',
  },
  taiko: {
    1: '909550895681916958',
    2: '909550922391253033',
    3: '909550969354879068',
    4: '909550994952716288',
    5: '909551014175195147',
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

  const verifiedRole = await guild.roles.fetch(ROLES.verified)

  return roles
    .filter(role => role)
    .push(verifiedRole)
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
  allRoles
}
