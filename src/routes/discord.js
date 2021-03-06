const fetch = require('node-fetch')
const states = require('../libs/states')

/**
 *
 * @param {import("fastify").FastifyRequest} request
 * @param {import("fastify").FastifyReply} reply
 */
async function discordHandler(request, reply) {
  const code = request.query?.code

  if (!code) {
    console.log('Redirect to Discord OAuth page.')
    return reply.redirect(301, 'https://discord.com/api/oauth2/authorize?client_id=970385758995218524&redirect_uri=https%3A%2F%2Fverification.pippitrack.com%2F&response_type=code&scope=identify')
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_CALLBACK_URL,
        scope: 'identify',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const oauthData = await response.json();

    const userResult = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
      },
    });

    const user = await userResult.json()

    if (!user.id) {
      return user
    }

    // Create state
    const state = `${new Date().getTime()}-${user.id}`
    states.set(state, user.id)

    // Redirect to osu! OAuth
    const url = new URL('https://osu.ppy.sh/oauth/authorize')

    url.searchParams.append('client_id', process.env.OSU_CLIENT_ID)
    url.searchParams.append('scope', 'identify')
    url.searchParams.append('response_type', 'code')
    url.searchParams.append('redirect_uri', process.env.OSU_CALLBACK_URL)
    url.searchParams.append('state', state)

    return reply.redirect(301, url)
  } catch (error) {
    console.error(error);
    return {
      message: 'An error occurred while trying to get the user data.',
    }
  }
}

module.exports = discordHandler
