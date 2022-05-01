const EMOJIS = {
  osu: '<:osu:970434247791890482>',
  fruits: '<:fruits:970434247775109211>',
  taiko: '<:taiko:970434247787704330>',
  mania: '<:mania:970434247917715506>',
}

function getEmoji (name) {
  const key = name.toLowerCase()

  if (EMOJIS[key]) {
    return EMOJIS[key]
  }

  console.error(`${rankLetter} emoji does not exist.`)
  return ''
}

module.exports = getEmoji
