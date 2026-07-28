import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getTeam(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/teams/:slug',
      {
        schema: {
          tags: ['teams'],
          summary: 'Get details of a team by slug',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          response: {
            200: z.object({
              team: z.object({
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
                players: z.array(
                  z.object({
                    id: z.string().uuid(),
                    role: z.enum(['ADMIN', 'PLAYER']),
                    joinedAt: z.date(),
                    userId: z.string().uuid(),
                    user: z.object({
                      id: z.string().uuid(),
                      name: z.string(),
                      email: z.string().email(),
                      avatarUrl: z.string().nullable(),
                    }),
                  })
                ),
                invites: z.array(
                  z.object({
                    id: z.string().uuid(),
                    email: z.string().email(),
                    role: z.enum(['ADMIN', 'PLAYER']),
                    createdAt: z.date(),
                    authorId: z.string().uuid().nullable(),
                  })
                ).optional(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { slug } = request.params

        const team = await prisma.team.findUnique({
          where: { slug },
          include: {
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: {
                joinedAt: 'asc',
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        })

        if (!team) {
          throw new BadRequestError('Team not found')
        }

        const isPlayer = team.players.some((p) => p.userId === userId)
        if (!isPlayer && team.ownerId !== userId) {
          throw new BadRequestError('You do not have access to this team')
        }

        const userMembership = team.players.find((p) => p.userId === userId)
        const isAdmin = userMembership?.role === 'ADMIN' || team.ownerId === userId

        let invites: any[] = []
        if (isAdmin) {
          invites = await prisma.teamInvite.findMany({
            where: { teamId: team.id },
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              authorId: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
        }

        return reply.status(200).send({
          team: {
            ...team,
            invites: isAdmin ? invites : undefined,
          },
        })
      },
    )
}
