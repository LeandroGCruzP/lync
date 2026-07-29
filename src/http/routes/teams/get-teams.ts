import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'

export async function getTeams(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/teams',
      {
        schema: {
          tags: ['teams'],
          summary: 'List teams the user belongs to',
          security: [{ bearerAuth: [] }],
          querystring: z.object({
            organizationSlug: z.string().optional(),
            filter: z.enum(['standalone']).optional(),
          }),
          response: {
            200: z.object({
              teams: z.array(
                z.object({
                  id: z.string().uuid(),
                  name: z.string(),
                  description: z.string().nullable(),
                  slug: z.string(),
                  avatarUrl: z.string().nullable(),
                  ownerId: z.string().uuid(),
                  createdAt: z.date(),
                  owner: z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    email: z.string().email(),
                    avatarUrl: z.string().nullable(),
                  }),
                  organization: z
                    .object({
                      id: z.string().uuid(),
                      name: z.string(),
                      slug: z.string(),
                      avatarUrl: z.string().nullable(),
                    })
                    .nullable(),
                  _count: z.object({
                    players: z.number(),
                  }),
                  players: z.array(
                    z.object({
                      role: z.enum(['ADMIN', 'PLAYER']),
                    })
                  ),
                  joinRequests: z.array(
                    z.object({
                      id: z.string().uuid(),
                    })
                  ),
                })
              ),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { organizationSlug, filter } = request.query

        let whereCondition: any = {}

        if (organizationSlug) {
          whereCondition = {
            organization: { slug: organizationSlug },
            OR: [
              { ownerId: userId },
              {
                players: {
                  some: {
                    userId,
                  },
                },
              },
              {
                organization: {
                  members: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            ],
          }
        } else if (filter === 'standalone') {
          whereCondition = {
            organization: null,
            OR: [
              { ownerId: userId },
              {
                players: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          }
        } else {
          whereCondition = {
            OR: [
              { ownerId: userId },
              {
                players: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          }
        }

        const teams = await prisma.team.findMany({
          where: whereCondition,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                players: true,
              },
            },
            players: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
            joinRequests: {
              where: {
                userId,
              },
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return reply.status(200).send({ teams })
      },
    )
}
