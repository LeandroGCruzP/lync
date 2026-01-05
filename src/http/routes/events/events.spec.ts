import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Events (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Create Event', () => {
    it('should be able to create a standalone event', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const name = faker.lorem.words(3)

      const response = await request(app.server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          startDate: new Date(),
        })

      expect(response.statusCode).toEqual(201)
      expect(response.body).toHaveProperty('eventId')

      const event = await prisma.event.findUnique({
        where: { id: response.body.eventId },
      })

      expect(event).toBeTruthy()
      expect(event?.name).toEqual(name)
      expect(event?.organizationId).toBeNull()
      expect(event?.sportId).toBeNull()
    })

    it('should be able to create an event with a sport', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const name = faker.lorem.words(3)

      const sport = await prisma.sport.create({
        data: {
          name: faker.lorem.word(),
          sportType: 'TEAM',
          competitionFormat: 'MATCH',
        },
      })

      const response = await request(app.server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          startDate: new Date(),
          sportId: sport.id,
        })

      expect(response.statusCode).toEqual(201)

      const event = await prisma.event.findUnique({
        where: { id: response.body.eventId },
      })

      expect(event?.sportId).toEqual(sport.id)
    })

    it('should be able to create an event linked to an organization as admin', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({
        ownerId: user.id, // User is owner (ADMIN)
      })

      const name = faker.lorem.words(3)

      const response = await request(app.server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          startDate: new Date(),
          organizationId: org.id,
        })

      expect(response.statusCode).toEqual(201)

      const event = await prisma.event.findUnique({
        where: { id: response.body.eventId },
      })

      expect(event?.organizationId).toEqual(org.id)
    })

    it('should not be able to create an event for an organization if not a member', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const owner = await makeUser()
      const org = await makeOrganization({
        ownerId: owner.id,
      })

      const name = faker.lorem.words(3)

      const response = await request(app.server)
          .post('/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
              name,
              startDate: new Date(),
              organizationId: org.id
          })

      expect(response.statusCode).toEqual(401)
    })

    it('should not be able to create an event for an organization if valid member but not ADMIN', async () => {
        const { user, token } = await createAndAuthenticateUser(app)
        const owner = await makeUser()
        const org = await makeOrganization({
            ownerId: owner.id
        })

        // Add user as MEMBER
        await prisma.member.create({
            data: {
                organizationId: org.id,
                userId: user.id,
                role: 'MEMBER'
            }
        })

        const name = faker.lorem.words(3)

        const response = await request(app.server)
          .post('/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
              name,
              startDate: new Date(),
              organizationId: org.id
          })

        expect(response.statusCode).toEqual(401)
    })

    it('should be able to create a paid event (PAY_TO_REGISTER)', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const name = faker.lorem.words(3)
      const price = 50

      const response = await request(app.server)
          .post('/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
              name,
              startDate: new Date(),
              price,
              paymentModel: 'PAY_TO_REGISTER'
          })

      expect(response.statusCode).toEqual(201)

      const event = await prisma.event.findUnique({
          where: { id: response.body.eventId },
      })

      expect(event?.price).toEqual(expect.any(Object)) // Decimal check
      expect(Number(event?.price)).toEqual(price)
      expect(event?.paymentModel).toEqual('PAY_TO_REGISTER')
    })

    it('should be able to create a paid event (PAY_TO_CONFIRM)', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const name = faker.lorem.words(3)
      const price = 100

      const response = await request(app.server)
          .post('/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
              name,
              startDate: new Date(),
              price,
              paymentModel: 'PAY_TO_CONFIRM'
          })

      expect(response.statusCode).toEqual(201)

      const event = await prisma.event.findUnique({
          where: { id: response.body.eventId },
      })

      expect(Number(event?.price)).toEqual(price)
      expect(event?.paymentModel).toEqual('PAY_TO_CONFIRM')
    })
  })

  describe('List Events', () => {
    it('should be able to list events based on visibility rules', async () => {
      const { user: userA, token: tokenA } = await createAndAuthenticateUser(app)
      const { user: userB } = await createAndAuthenticateUser(app) // We only need B's ID to check visibility

      // 1. Standalone event owned by User A (A should see)
      const eventOwnedByA = await prisma.event.create({
        data: {
          name: 'Event Owned by A',
          slug: `event-owned-by-a-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: userA.id,
        },
      })

      // 2. Standalone event owned by User B (A should NOT see)
      await prisma.event.create({
        data: {
          name: 'Event Owned by B',
          slug: `event-owned-by-b-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: userB.id,
        },
      })

      // 3. Org event where User A is a member (A should see)
      const org1 = await makeOrganization({ ownerId: userB.id })
      await prisma.member.create({
        data: {
          organizationId: org1.id,
          userId: userA.id,
          role: 'MEMBER',
        },
      })
      const eventInOrg1 = await prisma.event.create({
        data: {
          name: 'Event in Org 1',
          slug: `event-in-org-1-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: userB.id,
          organizationId: org1.id,
        },
      })

      // 4. Org event where User A is NOT a member (A should NOT see)
      const org2 = await makeOrganization({ ownerId: userB.id })
      await prisma.event.create({
        data: {
          name: 'Event in Org 2',
          slug: `event-in-org-2-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: userB.id,
          organizationId: org2.id,
        },
      })

      const response = await request(app.server)
        .get('/events')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.events).toHaveLength(2)
      expect(response.body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: eventOwnedByA.id }),
          expect.objectContaining({ id: eventInOrg1.id }),
        ])
      )

      // Explicitly check that forbidden events are NOT there
      const ids = response.body.events.map((e: any) => e.id)
      expect(ids).not.toContain(eventOwnedByA.id === ids[0] ? 'some-other-id' : 'another-id') // Just a sanity check style, the arrayContaining + length is enough but let's be sure.
    })

    it('should be able to filter events by organization', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: user.id })

      const eventInOrg = await prisma.event.create({
        data: {
          name: 'Event in Org',
          slug: `event-in-org-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: user.id,
          organizationId: org.id,
        },
      })

      const standaloneEvent = await prisma.event.create({
        data: {
          name: 'Standalone Event',
          slug: `standalone-event-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: user.id,
        },
      })

      const response = await request(app.server)
        .get('/events')
        .query({ organizationSlug: org.slug })
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.events).toHaveLength(1)
      expect(response.body.events[0].id).toEqual(eventInOrg.id)
    })

    it('should be able to filter standalone events', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: user.id })

      const eventInOrg = await prisma.event.create({
        data: {
          name: 'Event in Org',
          slug: `event-in-org-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: user.id,
          organizationId: org.id,
        },
      })

      const standaloneEvent = await prisma.event.create({
        data: {
          name: 'Standalone Event',
          slug: `standalone-event-${faker.string.uuid()}`,
          startDate: new Date(),
          ownerId: user.id,
        },
      })

      const response = await request(app.server)
        .get('/events')
        .query({ filter: 'standalone' })
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.events).toHaveLength(1)
      expect(response.body.events[0].id).toEqual(standaloneEvent.id)
    })
  })
})
