import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization, makeUser } from '~/utils/test/factories'

describe('Member Invites (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able for an admin to create a new invite', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const org = await makeOrganization({
        ownerId: user.id
    })

    const response = await request(app.server)
      .post(`/organizations/${org.slug}/member-invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: faker.internet.email(),
        role: 'MEMBER',
      })

    expect(response.statusCode).toEqual(201)
  })

  it('should not be able for a member to create a new invite', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const org = await makeOrganization({
        ownerId: owner.id
    })

    await prisma.member.create({
        data: {
            organizationId: org.id,
            userId: user.id,
            role: 'MEMBER'
        }
    })

    const response = await request(app.server)
      .post(`/organizations/${org.slug}/member-invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: faker.internet.email(),
        role: 'MEMBER',
      })

    expect(response.statusCode).toEqual(401)
  })

  it('should not be able to invite someone who is already a member', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const org = await makeOrganization({
        ownerId: user.id
    })

    const memberUser = await makeUser()

    await prisma.member.create({
        data: {
            organizationId: org.id,
            userId: memberUser.id,
            role: 'MEMBER'
        }
    })

    const response = await request(app.server)
      .post(`/organizations/${org.slug}/member-invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: memberUser.email,
        role: 'MEMBER',
      })

    expect(response.statusCode).toEqual(400)
  })

  it('should not be able to invite someone with a domain that auto-joins', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const domain = faker.internet.domainName()
    const org = await makeOrganization({
        ownerId: user.id,
        domain,
        shouldAttachUsersByDomain: true
    })

    const response = await request(app.server)
      .post(`/organizations/${org.slug}/member-invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: `somewho@${domain}`,
        role: 'MEMBER',
      })

    expect(response.statusCode).toEqual(400)
  })

  it('should be able to accept an invite', async () => {
    const { user, token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const org = await makeOrganization({
        ownerId: owner.id,
    })

    const invite = await prisma.memberInvite.create({
        data: {
            authorId: owner.id,
            organizationId: org.id,
            email: user.email,
            role: 'MEMBER'
        }
    })

    const response = await request(app.server)
      .post(`/member-invites/${invite.id}/accept`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(204)

    const membership = await prisma.member.findUnique({
        where: {
            organizationId_userId: {
                organizationId: org.id,
                userId: user.id
            }
        }
    })

    expect(membership).toBeTruthy()
  })

  it('should not be able to accept an invite sent to another email', async () => {
    const { token } = await createAndAuthenticateUser(app)
    const owner = await makeUser()
    const org = await makeOrganization({
        ownerId: owner.id,
    })

    const invite = await prisma.memberInvite.create({
        data: {
            authorId: owner.id,
            organizationId: org.id,
            email: faker.internet.email(), // Different email
            role: 'MEMBER'
        }
    })

    const response = await request(app.server)
      .post(`/member-invites/${invite.id}/accept`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(400)
  })

  it('should be able for an admin to revoke an invite', async () => {
     const { user, token } = await createAndAuthenticateUser(app)
     const org = await makeOrganization({
         ownerId: user.id
     })

     const invite = await prisma.memberInvite.create({
         data: {
             authorId: user.id,
             organizationId: org.id,
             email: faker.internet.email(),
             role: 'MEMBER'
         }
     })

     const response = await request(app.server)
       .delete(`/organizations/${org.slug}/member-invites/${invite.id}`)
       .set('Authorization', `Bearer ${token}`)

     expect(response.statusCode).toEqual(204)

     const inviteInDb = await prisma.memberInvite.findUnique({
        where: { id: invite.id }
     })

     expect(inviteInDb).toBeNull()
  })

  it('should not be able for a member to revoke an invite', async () => {
     const { user, token } = await createAndAuthenticateUser(app)
     const owner = await makeUser()
     const org = await makeOrganization({
         ownerId: owner.id
     })

     await prisma.member.create({
         data: {
             organizationId: org.id,
             userId: user.id,
             role: 'MEMBER'
         }
     })

     const invite = await prisma.memberInvite.create({
         data: {
             authorId: owner.id,
             organizationId: org.id,
             email: faker.internet.email(),
             role: 'MEMBER'
         }
     })

     const response = await request(app.server)
       .delete(`/organizations/${org.slug}/member-invites/${invite.id}`)
       .set('Authorization', `Bearer ${token}`)

     expect(response.statusCode).toEqual(401)
  })
})
