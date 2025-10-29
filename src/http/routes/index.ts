import { FastifyInstance } from 'fastify'
import { authenticateWithPassword } from './auth/authenticate-with-password'
import { createAccount } from './auth/create-account'
import { getProfile } from './auth/get-profile'
import { requestPasswordRecover } from './auth/request-password-recover'
import { resetPassword } from './auth/reset-password'

export async function routes(app: FastifyInstance) {
  // Auth routes
  app.register(authenticateWithPassword)
  app.register(createAccount)
  app.register(getProfile)
  app.register(requestPasswordRecover)
  app.register(resetPassword)
}
