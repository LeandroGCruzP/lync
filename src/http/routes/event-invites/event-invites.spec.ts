import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeUser } from '~/utils/test/factories'

describe('Event Invites (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Get Pending Event Invites', () => {
    it('should be able to get pending event invites', async () => {
      const { user, token } = await createAndAuthenticateUser(app)

      const anotherUser = await makeUser()

      const event = await prisma.event.create({
        data: {
          name: faker.lorem.words(3),
          slug: faker.lorem.slug(),
          startDate: new Date(),
          ownerId: anotherUser.id,
        },
      })

      const invite = await prisma.eventInvite.create({
        data: {
          email: user.email,
          role: 'PARTICIPANT',
          eventId: event.id,
          authorId: anotherUser.id,
        },
      })

      const response = await request(app.server)
        .get('/event-invites/pending')
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body).toHaveProperty('invites')
      expect(response.body.invites).toHaveLength(1)
      expect(response.body.invites[0]).toMatchObject({
        id: invite.id,
        email: user.email,
        role: 'PARTICIPANT',
        event: {
          id: event.id,
          name: event.name,
          slug: event.slug,
        },
      })
    })
  })

  describe('Accept Event Invite', () => {
    it('should be able to accept an event invite', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const anotherUser = await makeUser()

      const event = await prisma.event.create({
        data: {
          name: faker.lorem.words(3),
          slug: faker.lorem.slug(),
          startDate: new Date(),
          ownerId: anotherUser.id,
        },
      })

      const invite = await prisma.eventInvite.create({
        data: {
          email: user.email,
          role: 'ADMIN',
          eventId: event.id,
          authorId: anotherUser.id,
        },
      })

      const response = await request(app.server)
        .post(`/event-invites/${invite.id}/accept`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(204)

      // Invite should be deleted
      const inviteAfter = await prisma.eventInvite.findUnique({
        where: { id: invite.id },
      })
      expect(inviteAfter).toBeNull()

      // User should be a participant
      const participant = await prisma.participant.findUnique({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: user.id,
          },
        },
      })
      expect(participant).toBeTruthy()
      expect(participant?.role).toEqual('ADMIN')
      expect(participant?.participantType).toEqual('PLAYER')
    })
  })

  describe('Reject Event Invite', () => {
    it('should be able to reject an event invite', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const anotherUser = await makeUser()

      const event = await prisma.event.create({
        data: {
          name: faker.lorem.words(3),
          slug: faker.lorem.slug(),
          startDate: new Date(),
          ownerId: anotherUser.id,
        },
      })

      const invite = await prisma.eventInvite.create({
        data: {
          email: user.email,
          role: 'PARTICIPANT',
          eventId: event.id,
          authorId: anotherUser.id,
        },
      })

      const response = await request(app.server)
        .post(`/event-invites/${invite.id}/reject`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(204)

      // Invite should be deleted
      const inviteAfter = await prisma.eventInvite.findUnique({
        where: { id: invite.id },
      })
      expect(inviteAfter).toBeNull()

      // User should NOT be a participant
      const participant = await prisma.participant.findUnique({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: user.id,
          },
        },
      })
      expect(participant).toBeNull()
    })
  })
})
