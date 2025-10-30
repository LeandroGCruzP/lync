import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  // Clear existing data in the correct order (respecting foreign keys)
  await prisma.participant.deleteMany()
  await prisma.eventInvite.deleteMany()
  await prisma.eventSettings.deleteMany()
  await prisma.event.deleteMany()
  await prisma.player.deleteMany()
  await prisma.teamInvite.deleteMany()
  await prisma.team.deleteMany()
  await prisma.member.deleteMany()
  await prisma.memberInvite.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.account.deleteMany()
  await prisma.token.deleteMany()
  await prisma.sport.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await hash('123456', 1)

  // Creating users
  const user1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john.doe@lync.com',
      avatarUrl: 'https://github.com/leandrogcruzp.png',
      passwordHash,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'jane.smith@lync.com',
      avatarUrl: faker.image.avatarGitHub(),
      passwordHash,
    },
  })

  const user3 = await prisma.user.create({
    data: {
      name: 'Mike Johnson',
      email: 'mike.johnson@lync.com',
      avatarUrl: faker.image.avatarGitHub(),
      passwordHash,
    },
  })

  const user4 = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      avatarUrl: faker.image.avatarGitHub(),
      passwordHash,
    },
  })

  const user5 = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      avatarUrl: faker.image.avatarGitHub(),
      passwordHash,
    },
  })

  // Creating sports
  const footballSport = await prisma.sport.create({
    data: {
      name: 'Football',
      sportType: 'TEAM',
      competitionFormat: 'MATCH',
    },
  })

  const basketballSport = await prisma.sport.create({
    data: {
      name: 'Basketball',
      sportType: 'TEAM',
      competitionFormat: 'SCORE_BASED',
    },
  })


  const runningSport = await prisma.sport.create({
    data: {
      name: 'Running',
      sportType: 'INDIVIDUAL',
      competitionFormat: 'TIME_TRIAL',
    },
  })

  // Creating organizations
  const org1 = await prisma.organization.create({
    data: {
      name: 'Lync Sports Club',
      slug: 'lync-sports-club',
      domain: 'lyncsports.com',
      shouldAttachUsersByDomain: true,
      avatarUrl: faker.image.avatarGitHub(),
      ownerId: user1.id,
      members: {
        createMany: {
          data: [
            { userId: user1.id, role: 'ADMIN' },
            { userId: user2.id, role: 'MEMBER' },
            { userId: user3.id, role: 'MEMBER' },
          ],
        },
      },
    },
  })

  const org2 = await prisma.organization.create({
    data: {
      name: 'Elite Athletics',
      slug: 'elite-athletics',
      domain: 'eliteathletics.com',
      shouldAttachUsersByDomain: false,
      avatarUrl: faker.image.avatarGitHub(),
      ownerId: user2.id,
      members: {
        createMany: {
          data: [
            { userId: user2.id, role: 'ADMIN' },
            { userId: user4.id, role: 'MEMBER' },
            { userId: user5.id, role: 'MEMBER' },
          ],
        },
      },
    },
  })

  // Creating teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Lync Wolves',
      slug: 'lync-wolves',
      description: 'Professional football team',
      avatarUrl: faker.image.avatarGitHub(),
      ownerId: user1.id,
      organizationId: org1.id,
      players: {
        createMany: {
          data: [
            { userId: user1.id, role: 'ADMIN' },
            { userId: user2.id, role: 'PLAYER' },
            { userId: user3.id, role: 'PLAYER' },
          ],
        },
      },
    },
  })

  const team2 = await prisma.team.create({
    data: {
      name: 'Elite Hoops',
      slug: 'elite-hoops',
      description: 'Basketball championship team',
      avatarUrl: faker.image.avatarGitHub(),
      ownerId: user2.id,
      organizationId: org2.id,
      players: {
        createMany: {
          data: [
            { userId: user2.id, role: 'ADMIN' },
            { userId: user4.id, role: 'PLAYER' },
            { userId: user5.id, role: 'PLAYER' },
          ],
        },
      },
    },
  })

  // Creating events
  const event1 = await prisma.event.create({
    data: {
      name: 'Summer Football Championship',
      slug: 'summer-football-championship',
      description: 'Annual summer football tournament',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-30'),
      ownerId: user1.id,
      organizationId: org1.id,
      sportId: footballSport.id,
      eventSettings: {
        create: {
          slots: 16,
          playersPerTeam: 11,
        },
      },
      participants: {
        createMany: {
          data: [
            {
              participantType: 'TEAM',
              role: 'ADMIN',
              teamId: team1.id,
            },
            {
              participantType: 'TEAM',
              role: 'PARTICIPANT',
              teamId: team2.id,
            },
          ],
        },
      },
    },
  })

  const event2 = await prisma.event.create({
    data: {
      name: 'Basketball League 2025',
      slug: 'basketball-league-2025',
      description: 'Professional basketball league',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-08-31'),
      ownerId: user2.id,
      organizationId: org2.id,
      sportId: basketballSport.id,
      eventSettings: {
        create: {
          slots: 12,
          playersPerTeam: 5,
        },
      },
      participants: {
        createMany: {
          data: [
            {
              participantType: 'TEAM',
              role: 'ADMIN',
              teamId: team2.id,
            },
          ],
        },
      },
    },
  })

  const event3 = await prisma.event.create({
    data: {
      name: 'City Marathon',
      slug: 'city-marathon',
      description: 'Annual city marathon for individual runners',
      startDate: new Date('2025-05-20'),
      ownerId: user3.id,
      sportId: runningSport.id,
      eventSettings: {
        create: {
          slots: 1000,
        },
      },
      participants: {
        createMany: {
          data: [
            {
              participantType: 'PLAYER',
              role: 'ADMIN',
              userId: user3.id,
            },
            {
              participantType: 'PLAYER',
              role: 'PARTICIPANT',
              userId: user1.id,
            },
            {
              participantType: 'PLAYER',
              role: 'PARTICIPANT',
              userId: user4.id,
            },
          ],
        },
      },
    },
  })

  // Creating member invites
  await prisma.memberInvite.create({
    data: {
      email: 'invite1@example.com',
      role: 'MEMBER',
      authorId: user1.id,
      authorName: user1.name,
      organizationId: org1.id,
    },
  })

  await prisma.memberInvite.create({
    data: {
      email: 'invite2@example.com',
      role: 'ADMIN',
      authorId: user2.id,
      authorName: user2.name,
      organizationId: org2.id,
    },
  })

  // Creating event invites
  await prisma.eventInvite.create({
    data: {
      email: 'eventinvite1@example.com',
      role: 'PARTICIPANT',
      authorId: user1.id,
      authorName: user1.name,
      eventId: event1.id,
    },
  })

  await prisma.eventInvite.create({
    data: {
      email: 'eventinvite2@example.com',
      role: 'ADMIN',
      authorId: user2.id,
      authorName: user2.name,
      eventId: event2.id,
    },
  })

  // Creating team invites
  await prisma.teamInvite.create({
    data: {
      email: 'teaminvite1@example.com',
      role: 'PLAYER',
      authorId: user1.id,
      authorName: user1.name,
      teamId: team1.id,
    },
  })

  await prisma.teamInvite.create({
    data: {
      email: 'teaminvite2@example.com',
      role: 'ADMIN',
      authorId: user2.id,
      authorName: user2.name,
      teamId: team2.id,
    },
  })
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
