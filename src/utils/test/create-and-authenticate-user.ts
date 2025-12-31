import { FastifyInstance } from 'fastify'
import { prisma } from '~/lib/prisma'
import { makeUser } from './factories'

export async function createAndAuthenticateUser(
  app: FastifyInstance,
  override: Parameters<typeof makeUser>[0] = {},
) {
  const user = await makeUser(override)

  const token = app.jwt.sign({
    sub: user.id,
  })

  return { user, token }
}
