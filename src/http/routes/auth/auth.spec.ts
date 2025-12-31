import { faker } from '@faker-js/faker'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '~/http/app'
import { prisma } from '~/lib/prisma'
import { createAndAuthenticateUser } from '~/utils/test/create-and-authenticate-user'
import { makeOrganization } from '~/utils/test/factories'

describe('Auth (e2e)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able for any user to create a new account', async () => {
    const response = await request(app.server)
      .post('/users')
      .send({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      })

    expect(response.statusCode).toEqual(201)
  })

  it('should not be able to create an account with same email', async () => {
    const email = faker.internet.email()

    await request(app.server)
        .post('/users')
        .send({
          name: faker.person.fullName(),
          email,
          password: faker.internet.password(),
        })

    const response = await request(app.server)
      .post('/users')
      .send({
        name: faker.person.fullName(),
        email,
        password: faker.internet.password(),
      })

    expect(response.statusCode).toEqual(400)
  })

  it('should be able to get own profile', async () => {
    const { token, user } = await createAndAuthenticateUser(app)

    const response = await request(app.server)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(response.statusCode).toEqual(200)
    expect(response.body.user.id).toEqual(user.id)
  })
})
