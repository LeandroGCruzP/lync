import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Members (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able for an member to get members of an organization', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const org = await makeOrganization({
      ownerId: user.id,
    })

    const response = await request(app.server)
      .get(`/organizations/${org.slug}/members`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(200)
    expect(response.body.members).toHaveLength(1)
    expect(response.body.members[0].userId).toEqual(user.id)
  })

  it('should be able for an admin to update a member role', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const org = await makeOrganization({
      ownerId: user.id,
    })

    const member = await makeUser()
    await prisma.member.create({
      data: {
        userId: member.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    const memberInOrg = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: member.id,
        },
      },
    })

    const response = await request(app.server)
      .patch(`/organizations/${org.slug}/members/${memberInOrg?.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'ADMIN',
      })

    expect(response.statusCode).toEqual(204)

    const updatedMember = await prisma.member.findUnique({
      where: {
        id: memberInOrg?.id,
      },
    })

    expect(updatedMember?.role).toEqual('ADMIN')
  })

  it('should not be able to update a member role if not admin', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const org = await makeOrganization({
      ownerId: owner.id,
    })

    // Add authenticated user as MEMBER
    const memberInOrg = await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    const response = await request(app.server)
      .patch(`/organizations/${org.slug}/members/${memberInOrg.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'ADMIN',
      })

    expect(response.statusCode).toEqual(401)
  })

  it('should not be able for an admin to update a member role of owner', async () => {
    const { user: admin, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()

    const org = await makeOrganization({
      ownerId: owner.id,
    })

    await prisma.member.create({
      data: {
        userId: admin.id,
        organizationId: org.id,
        role: 'ADMIN',
      },
    })

    const memberOwner = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: owner.id,
        },
      },
    })

    const response = await request(app.server)
      .patch(`/organizations/${org.slug}/members/${memberOwner?.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'MEMBER',
      })

    expect(response.statusCode).toEqual(401)
  })

  it('should be able for an admin to remove a member', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const org = await makeOrganization({
      ownerId: user.id,
    })

    const member = await makeUser()
    const memberEntry = await prisma.member.create({
      data: {
        userId: member.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    const response = await request(app.server)
      .delete(`/organizations/${org.slug}/members/${memberEntry.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(204)

    const memberInDb = await prisma.member.findUnique({
      where: { id: memberEntry.id },
    })

    expect(memberInDb).toBeNull()
  })

  it('should not be able to remove a member if not admin', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const org = await makeOrganization({
      ownerId: owner.id,
    })

    // Add authenticated user as MEMBER
    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    // Another member to try to remove
    const memberToRemove = await makeUser()
    const memberToRemoveEntry = await prisma.member.create({
      data: {
        userId: memberToRemove.id,
        organizationId: org.id,
        role: 'MEMBER',
      },
    })

    const response = await request(app.server)
      .delete(`/organizations/${org.slug}/members/${memberToRemoveEntry.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(401)
  })
})
