import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getPendingTeamInvites(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/team-invites/pending',
      {
        schema: {
          tags: ['team-invites'],
          summary: 'Get pending team invites for the current user',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              invites: z.array(
                z.object({
                  id: z.string().uuid(),
                  email: z.string().email(),
                  role: z.enum(['ADMIN', 'PLAYER']),
                  createdAt: z.date(),
                  team: z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    slug: z.string(),
                    avatarUrl: z.string().nullable(),
                  }),
                  author: z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    avatarUrl: z.string().nullable(),
                  }).nullable(),
                })
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

        const invites = await prisma.teamInvite.findMany({
          where: { email: user.email },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatarUrl: true,
              },
            },
            author: {
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

        return reply.status(200).send({ invites })
      },
    )
}
