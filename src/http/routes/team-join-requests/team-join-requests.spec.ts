import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeTeam, makeUser } from '~/utils/test/factories'

describe('Team Join Requests (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Request to Join Team', () => {
    it('should be able to request to join an organization team if the user belongs to the organization', async () => {
      const owner = await makeUser()
      const org = await makeOrganization({ ownerId: owner.id })
      const team = await makeTeam({ ownerId: owner.id, organizationId: org.id })

      // Create a new user and add them to the organization
      const { user: requester, token } = await createAndAuthenticateUser(app)
      await prisma.member.create({
        data: {
          organizationId: org.id,
          userId: requester.id,
          role: 'MEMBER',
        },
      })

      const response = await request(app.server)
        .post(`/teams/${team.id}/join-requests`)
        .set('Authorization', `Bearer ${token}`)
        .send()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toHaveProperty('requestId')

      const joinRequest = await prisma.teamJoinRequest.findUnique({
        where: { id: response.body.requestId },
      })

      expect(joinRequest).toBeTruthy()
      expect(joinRequest?.teamId).toEqual(team.id)
      expect(joinRequest?.userId).toEqual(requester.id)
    })

    it('should not be able to request to join if not a member of the organization', async () => {
      const owner = await makeUser()
      const org = await makeOrganization({ ownerId: owner.id })
      const team = await makeTeam({ ownerId: owner.id, organizationId: org.id })

      const { token } = await createAndAuthenticateUser(app)

      const response = await request(app.server)
        .post(`/teams/${team.id}/join-requests`)
        .set('Authorization', `Bearer ${token}`)
        .send()

      expect(response.statusCode).toEqual(401)
    })
  })

  describe('Manage Join Requests', () => {
    it('should be able for a team admin to accept a join request', async () => {
      const { user: owner, token: ownerToken } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: owner.id })
      const team = await makeTeam({ ownerId: owner.id, organizationId: org.id })

      const requester = await makeUser()
      // Add requester to organization
      await prisma.member.create({
        data: {
          organizationId: org.id,
          userId: requester.id,
          role: 'MEMBER',
        },
      })

      // Create a join request
      const joinRequest = await prisma.teamJoinRequest.create({
        data: {
          teamId: team.id,
          userId: requester.id,
        },
      })

      const response = await request(app.server)
        .post(`/join-requests/${joinRequest.id}/accept`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send()

      expect(response.statusCode).toEqual(204)

      // Requester should now be a player in the team
      const player = await prisma.player.findUnique({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: requester.id,
          },
        },
      })

      expect(player).toBeTruthy()
      expect(player?.role).toEqual('PLAYER')

      // Request should be deleted
      const deletedRequest = await prisma.teamJoinRequest.findUnique({
        where: { id: joinRequest.id },
      })

      expect(deletedRequest).toBeNull()
    })

    it('should be able for a team admin to reject a join request', async () => {
      const { user: owner, token: ownerToken } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: owner.id })
      const team = await makeTeam({ ownerId: owner.id, organizationId: org.id })

      const requester = await makeUser()
      // Add requester to organization
      await prisma.member.create({
        data: {
          organizationId: org.id,
          userId: requester.id,
          role: 'MEMBER',
        },
      })

      // Create a join request
      const joinRequest = await prisma.teamJoinRequest.create({
        data: {
          teamId: team.id,
          userId: requester.id,
        },
      })

      const response = await request(app.server)
        .post(`/join-requests/${joinRequest.id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send()

      expect(response.statusCode).toEqual(204)

      // Requester should NOT be a player in the team
      const player = await prisma.player.findUnique({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: requester.id,
          },
        },
      })

      expect(player).toBeNull()

      // Request should be deleted
      const deletedRequest = await prisma.teamJoinRequest.findUnique({
        where: { id: joinRequest.id },
      })

      expect(deletedRequest).toBeNull()
    })
  })

  describe('Get Pending Join Requests', () => {
    it('should be able to get pending join requests for admin teams', async () => {
      const { user: owner, token: ownerToken } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: owner.id })
      const team = await makeTeam({ ownerId: owner.id, organizationId: org.id })

      const requester = await makeUser()

      // Create a join request
      const joinRequest = await prisma.teamJoinRequest.create({
        data: {
          teamId: team.id,
          userId: requester.id,
        },
      })

      const response = await request(app.server)
        .get('/team-join-requests/pending')
        .set('Authorization', `Bearer ${ownerToken}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toHaveProperty('requests')
      expect(response.body.requests).toHaveLength(1)
      expect(response.body.requests[0]).toMatchObject({
        id: joinRequest.id,
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
        },
        user: {
          id: requester.id,
          name: requester.name,
        },
      })
    })
  })
})
