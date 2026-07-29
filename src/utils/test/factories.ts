import { faker } from '@faker-js/faker'
import { Organization, Team, User } from '@prisma/client'
import { prisma } from '~/lib/prisma'

export async function makeUser(override: Partial<User> = {}) {
  return prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      passwordHash: faker.internet.password(),
      ...override,
    },
  })
}

export async function makeOrganization(override: Partial<Organization> = {}) {
  return prisma.organization.create({
    data: {
      name: faker.company.name(),
      slug: faker.lorem.slug(),
      domain: faker.internet.domainName(),
      shouldAttachUsersByDomain: false,
      ownerId: override.ownerId || (await makeUser()).id,
      members: {
        create: {
          userId: override.ownerId || (await makeUser()).id,
          role: 'ADMIN',
        },
      },
      ...override,
    },
  })
}

export async function makeTeam(override: Partial<Team> = {}) {
  const ownerId = override.ownerId || (await makeUser()).id
  const team = await prisma.team.create({
    data: {
      name: faker.company.name(),
      slug: faker.lorem.slug(),
      description: faker.lorem.sentence(),
      ownerId,
      organizationId: override.organizationId ?? null,
      ...override,
    },
  })

  // Owner should automatically be an ADMIN player of the team
  await prisma.player.create({
    data: {
      teamId: team.id,
      userId: ownerId,
      role: 'ADMIN',
    },
  })

  return team
}
