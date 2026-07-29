import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getPendingJoinRequests(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/team-join-requests/pending',
      {
        schema: {
          tags: ['team-join-requests'],
          summary: 'Get pending team join requests for teams where the current user is an admin',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              requests: z.array(
                z.object({
                  id: z.string().uuid(),
                  createdAt: z.date(),
                  team: z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    slug: z.string(),
                  }),
                  user: z.object({
                    id: z.string().uuid(),
                    name: z.string().nullable(),
                    avatarUrl: z.string().nullable(),
                  }),
                }),
              ),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          throw new BadRequestError('User not found')
        }

        const requests = await prisma.teamJoinRequest.findMany({
          where: {
            team: {
              OR: [
                { ownerId: userId },
                {
                  players: {
                    some: {
                      userId,
                      role: 'ADMIN',
                    },
                  },
                },
              ],
            },
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return reply.status(200).send({ requests })
      },
    )
}
