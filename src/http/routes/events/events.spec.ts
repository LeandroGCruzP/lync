import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Create Event (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

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
})
