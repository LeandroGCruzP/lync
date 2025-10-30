import { FastifyInstance } from 'fastify'
import { authenticateWithPassword } from './auth/authenticate-with-password'
import { createAccount } from './auth/create-account'
import { getProfile } from './auth/get-profile'
import { requestPasswordRecover } from './auth/request-password-recover'
import { resetPassword } from './auth/reset-password'
import { getMembers } from './members/get-members'
import { removeMember } from './members/remove-members'
import { updateMemberRole } from './members/update-member-role'
import { createOrganization } from './organizations/create-organization'
import { getMembership } from './organizations/get-membership'
import { getOrganization } from './organizations/get-organization'
import { getOrganizations } from './organizations/get-organizations'
import { shutdownOrganization } from './organizations/shutdown-organization'
import { transferOrganization } from './organizations/transfer-organization'
import { updateOrganization } from './organizations/update-organization'

export async function routes(app: FastifyInstance) {
  // Auth routes
  app.register(authenticateWithPassword)
  app.register(createAccount)
  app.register(getProfile)
  app.register(requestPasswordRecover)
  app.register(resetPassword)

  // Organization routes
  app.register(createOrganization)
  app.register(getMembership)
  app.register(getOrganization)
  app.register(getOrganizations)
  app.register(shutdownOrganization)
  app.register(transferOrganization)
  app.register(updateOrganization)

  // Member routes
  app.register(getMembers)
  app.register(removeMember)
  app.register(updateMemberRole)
}
