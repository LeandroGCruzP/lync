import { FastifyInstance } from 'fastify'
import { authenticateWithPassword } from './auth/authenticate-with-password'
import { createAccount } from './auth/create-account'
import { getProfile } from './auth/get-profile'
import { requestPasswordRecover } from './auth/request-password-recover'
import { resetPassword } from './auth/reset-password'
import { acceptEventInvite } from './event-invites/accept-event-invite'
import { getPendingEventInvites } from './event-invites/get-pending-event-invites'
import { rejectEventInvite } from './event-invites/reject-event-invite'
import { createEvent } from './events/create-event'
import { getEvent } from './events/get-event'
import { getEvents } from './events/get-events'
import { registerForEvent } from './events/register-for-event'
import { updateEvent } from './events/update-event'
import { acceptMemberInvite } from './member-invites/accept-member-invite'
import { createMemberInvite } from './member-invites/create-member-invite'
import { getMemberInvite } from './member-invites/get-member-invite'
import { getMemberInvites } from './member-invites/get-member-invites'
import { getPendingMemberInvites } from './member-invites/get-pending-member-invites'
import { rejectMemberInvite } from './member-invites/reject-member-invite'
import { revokeMemberInvite } from './member-invites/revoke-member-invite'
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
import { getSports } from './sports/get-sports'
import { acceptTeamInvite } from './team-invites/accept-team-invite'
import { createTeamInvite } from './team-invites/create-team-invite'
import { getPendingTeamInvites } from './team-invites/get-pending-team-invites'
import { rejectTeamInvite } from './team-invites/reject-team-invite'
import { revokeTeamInvite } from './team-invites/revoke-team-invite'
import { acceptJoinRequest } from './team-join-requests/accept-join-request'
import { createJoinRequest } from './team-join-requests/create-join-request'
import { getPendingJoinRequests } from './team-join-requests/get-pending-join-requests'
import { rejectJoinRequest } from './team-join-requests/reject-join-request'
import { createTeam } from './teams/create-team'
import { deleteTeam } from './teams/delete-team'
import { getTeam } from './teams/get-team'
import { getTeams } from './teams/get-teams'
import { removePlayer } from './teams/remove-player'
import { updateTeam } from './teams/update-team'

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

  // Member invite routes
  app.register(acceptMemberInvite)
  app.register(createMemberInvite)
  app.register(getMemberInvite)
  app.register(getMemberInvites)
  app.register(getPendingMemberInvites)
  app.register(rejectMemberInvite)
  app.register(revokeMemberInvite)

  // Event routes
  app.register(createEvent)
  app.register(getEvent)
  app.register(getEvents)
  app.register(registerForEvent)
  app.register(updateEvent)

  // Event invite routes
  app.register(getPendingEventInvites)
  app.register(acceptEventInvite)
  app.register(rejectEventInvite)

  // Sport routes
  app.register(getSports)

  // Team routes
  app.register(createTeam)
  app.register(getTeams)
  app.register(getTeam)
  app.register(updateTeam)
  app.register(deleteTeam)
  app.register(removePlayer)

  // Team invite routes
  app.register(createTeamInvite)
  app.register(getPendingTeamInvites)
  app.register(acceptTeamInvite)
  app.register(rejectTeamInvite)
  app.register(revokeTeamInvite)

  // Team join request routes
  app.register(createJoinRequest)
  app.register(acceptJoinRequest)
  app.register(rejectJoinRequest)
  app.register(getPendingJoinRequests)
}
