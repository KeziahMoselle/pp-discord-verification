const fetch = require('node-fetch')
const client = require('../libs/client')
const store = require('../store')

const MODES = ['osu', 'fruits', 'mania', 'taiko']

/**
 *
 * @param {import("fastify").FastifyRequest} request
 * @param {import("fastify").FastifyReply} reply
 */
async function osuHandler(request, reply) {
  const { code, state } = request.query

  if (!code || !state) {
    return { message: 'No querystring parameter "code" or "state" provided.' }
  }

  const hasState = store.has(state)

  if (!hasState) {
    return { message: 'State has expired. Please resend an application.' }
  }

  try {
    const body = {
      'client_id': process.env.OSU_CLIENT_ID,
      'client_secret': process.env.OSU_CLIENT_SECRET,
      'grant_type': 'authorization_code',
      code,
      'redirect_uri': process.env.OSU_CALLBACK_URL,
    }

    const response = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const { token_type, access_token } = await response.json()

    const userFetches = MODES.map(mode => fetch(`https://osu.ppy.sh/api/v2/me/${mode}`, {
      headers: {
        'Authorization': `${token_type} ${access_token}`,
      }
    }))

    const [
      osuResponse,
      fruitsResponse,
      maniaResponse,
      taikoResponse,
    ] = await Promise.all(userFetches)

    const [
      osu,
      fruits,
      mania,
      taiko,
    ] = await Promise.all([
      osuResponse.json(),
      fruitsResponse.json(),
      maniaResponse.json(),
      taikoResponse.json(),
    ])


    const userState = store.get(state)

    client.emit('userVerified', {
      ...userState,
      osu,
      fruits,
      mania,
      taiko,
    })

    return reply.redirect(301, '/success')
  } catch (error) {
    console.error(error)
    return {
      message: 'Sorry we are being rate limited, please try again later.',
    }
  } finally {
    store.delete(state)
  }
}

module.exports = osuHandler
