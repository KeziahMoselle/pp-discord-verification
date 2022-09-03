const client = require('../../../libs/client')

/**
 *
 * @param {import("fastify").FastifyRequest} request
 * @param {import("fastify").FastifyReply} reply
 */
async function memberRolesHandler(request, reply) {
  const { code, state } = request.query

  try {


    return {

    }
  } catch (error) {
    console.error(error)
    return {
      message: 'An error occurred while trying to get the member data.',
    }
  }
}

module.exports = memberRolesHandler
