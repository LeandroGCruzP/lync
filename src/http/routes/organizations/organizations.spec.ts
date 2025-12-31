import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Organizations (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a new organization', async () => {
    const { token } = await createAndAuthenticateUser(app)
    const domain = faker.internet.domainName()
    const name = faker.company.name()

    const response = await request(app.server)
      .post('/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        domain,
        shouldAttachUsersByDomain: true,
      })

    expect(response.statusCode).toEqual(201)
  })

  it('should not be able to create an organization with an existing domain', async () => {
    const { token } = await createAndAuthenticateUser(app)
    const domain = faker.internet.domainName()
    const name1 = faker.company.name()
    const name2 = faker.company.name()

    await request(app.server)
      .post('/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: name1,
        domain,
      })

    const response = await request(app.server)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: name2,
          domain,
        })

    expect(response.statusCode).toEqual(400)
  })

  it('should not be able to update domain of an organization with an existing domain', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const domain = faker.internet.domainName()
    const name1 = faker.company.name()
    const name2 = faker.company.name()

    const org = await makeOrganization({
      ownerId: user.id,
    })

    await request(app.server)
      .post('/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: name1,
        domain,
      })

    const response = await request(app.server)
      .put(`/organizations/${org.slug}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: name2,
        domain,
      })

    expect(response.statusCode).toEqual(400)
  })

  it('should be able to get organizations where user is a member', async () => {
    const { user, token } = await createAndAuthenticateUser(app)

    const org = await makeOrganization({
        ownerId: user.id
    })

    const response = await request(app.server)
      .get('/organizations')
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(200)
    expect(response.body.organizations).toHaveLength(1)
    expect(response.body.organizations[0].name).toEqual(org.name)
  })


  it('should be able to update an organization', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const domain = faker.internet.domainName()
    const name = faker.company.name()

    const org = await makeOrganization({
      ownerId: user.id,
    })

    const response = await request(app.server)
      .put(`/organizations/${org.slug}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        domain,
        shouldAttachUsersByDomain: true,
      })

    expect(response.statusCode).toEqual(204)

    const updatedOrg = await prisma.organization.findUnique({
      where: { id: org.id },
    })

    expect(updatedOrg?.name).toEqual(name)
    expect(updatedOrg?.domain).toEqual(domain)
  })

  it('should not be able to update an organization if not owner', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()

    const org = await makeOrganization({
      ownerId: owner.id,
    })

    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
      },
    })

    const response = await request(app.server)
      .put(`/organizations/${org.slug}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Org',
      })

    expect(response.statusCode).toEqual(401)
  })

  it('should be able to shutdown an organization', async () => {
    const { user, token } = await createAndAuthenticateUser(app)

    const org = await makeOrganization({
      ownerId: user.id,
    })

    const response = await request(app.server)
      .delete(`/organizations/${org.slug}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(204)

    const orgInDb = await prisma.organization.findUnique({
      where: { id: org.id },
    })

    expect(orgInDb).toBeNull()
  })

  it('should not be able to shutdown an organization if not owner', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()

    const org = await makeOrganization({
      ownerId: owner.id,
    })

    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
      },
    })

    const response = await request(app.server)
      .delete(`/organizations/${org.slug}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(401)
  })

  it('should be able to transfer organization ownership', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const newOwner = await makeUser()

    const org = await makeOrganization({
      ownerId: user.id,
    })

    await prisma.member.create({
      data: {
        userId: newOwner.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    const response = await request(app.server)
      .patch(`/organizations/${org.slug}/owner`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferToUserId: newOwner.id,
      })

    expect(response.statusCode).toEqual(204)

    const updatedOrg = await prisma.organization.findUnique({
      where: { id: org.id },
    })

    expect(updatedOrg?.ownerId).toEqual(newOwner.id)

    const newOwnerMembership = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: newOwner.id,
        },
      },
    })

    expect(newOwnerMembership?.role).toEqual('ADMIN')
  })

  it('should not be able to transfer organization ownership if not owner', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const member = await makeUser() // Member to receive ownership

    const org = await makeOrganization({
      ownerId: owner.id,
    })

    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN', // User is admin but not owner
      },
    })

    await prisma.member.create({
        data: {
            userId: member.id,
            organizationId: org.id,
            role: 'MEMBER'
        }
    })

    const response = await request(app.server)
      .patch(`/organizations/${org.slug}/owner`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferToUserId: member.id,
      })

    expect(response.statusCode).toEqual(401)
  })
})
