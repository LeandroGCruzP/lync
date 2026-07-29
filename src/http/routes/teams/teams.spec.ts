import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Teams (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Create Team', () => {
    it('should be able to create a standalone team', async () => {
      const { token } = await createAndAuthenticateUser(app)
      const name = faker.lorem.words(3)

      const response = await request(app.server)
        .post('/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          description: faker.lorem.sentence(),
        })

      expect(response.statusCode).toEqual(201)
      expect(response.body).toHaveProperty('teamId')

      const team = await prisma.team.findUnique({
        where: { id: response.body.teamId },
      })

      expect(team).toBeTruthy()
      expect(team?.name).toEqual(name)
      expect(team?.organizationId).toBeNull()
    })

    it('should be able to create a team linked to an organization as admin', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({
        ownerId: user.id, // User is owner (ADMIN)
      })

      const name = faker.lorem.words(3)

      const response = await request(app.server)
        .post('/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          description: faker.lorem.sentence(),
          organizationId: org.id,
        })

      expect(response.statusCode).toEqual(201)

      const team = await prisma.team.findUnique({
        where: { id: response.body.teamId },
      })

      expect(team?.organizationId).toEqual(org.id)
    })

    it('should not be able to create a team for an organization if not an admin', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const owner = await makeUser()
      const org = await makeOrganization({
        ownerId: owner.id,
      })

      // Add user as MEMBER, not ADMIN
      await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'MEMBER',
        },
      })

      const name = faker.lorem.words(3)

      const response = await request(app.server)
        .post('/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          description: faker.lorem.sentence(),
          organizationId: org.id,
        })

      expect(response.statusCode).toEqual(401)
    })
  })

  describe('Get Teams', () => {
    it('should be able to filter teams by organization', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: user.id })

      const orgTeamSlug = faker.lorem.slug()
      const standaloneTeamSlug = faker.lorem.slug()

      // Create a team linked to organization
      await prisma.team.create({
        data: {
          name: faker.lorem.words(3),
          slug: orgTeamSlug,
          ownerId: user.id,
          organizationId: org.id,
        },
      })

      // Create a standalone team
      await prisma.team.create({
        data: {
          name: faker.lorem.words(3),
          slug: standaloneTeamSlug,
          ownerId: user.id,
        },
      })

      const response = await request(app.server)
        .get('/teams')
        .query({ organizationSlug: org.slug })
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.teams).toHaveLength(1)
      expect(response.body.teams[0].slug).toEqual(orgTeamSlug)
      expect(response.body.teams[0].organization?.id).toEqual(org.id)
    })

    it('should be able to get only standalone teams', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: user.id })

      const orgTeamSlug = faker.lorem.slug()
      const standaloneTeamSlug = faker.lorem.slug()

      // Create a team linked to organization
      await prisma.team.create({
        data: {
          name: faker.lorem.words(3),
          slug: orgTeamSlug,
          ownerId: user.id,
          organizationId: org.id,
        },
      })

      // Create a standalone team
      await prisma.team.create({
        data: {
          name: faker.lorem.words(3),
          slug: standaloneTeamSlug,
          ownerId: user.id,
        },
      })

      const response = await request(app.server)
        .get('/teams')
        .query({ filter: 'standalone' })
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.teams).toHaveLength(1)
      expect(response.body.teams[0].slug).toEqual(standaloneTeamSlug)
      expect(response.body.teams[0].organization).toBeNull()
    })

    it('should not return teams of organizations the user is a member of if they are not a player or owner of that team', async () => {
      const { user, token } = await createAndAuthenticateUser(app)
      const org = await makeOrganization({ ownerId: user.id })

      const anotherUser = await makeUser()

      // Team in the organization owned by another user (current user is member of org, but not in the team)
      await prisma.team.create({
        data: {
          name: faker.lorem.words(3),
          slug: faker.lorem.slug(),
          ownerId: anotherUser.id,
          organizationId: org.id,
        },
      })

      const response = await request(app.server)
        .get('/teams')
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(response.body.teams).toHaveLength(0) // should not return the team they are not in
    })
  })
})
