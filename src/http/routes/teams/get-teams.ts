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
                  _count: z.object({
                    players: z.number(),
                  }),
                  players: z.array(
                    z.object({
                      role: z.enum(['ADMIN', 'PLAYER']),
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

        const teams = await prisma.team.findMany({
          where: {
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
          },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return reply.status(200).send({ teams })
      },
    )
}
