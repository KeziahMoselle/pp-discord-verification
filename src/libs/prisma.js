const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ["info"],
})

module.exports = prisma
