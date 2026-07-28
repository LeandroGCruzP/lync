import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { createSlug } from '~/utils/create-slug'
import { BadRequestError } from '../_errors/bad-request-error'

export async function createTeam(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/teams',
      {
        schema: {
          tags: ['teams'],
          summary: 'Create a new team',
          security: [{ bearerAuth: [] }],
          body: z.object({
            name: z.string().min(2),
            description: z.string().optional(),
            avatarUrl: z.string().url().nullish(),
            organizationId: z.string().uuid().nullish(),
          }),
          response: {
            201: z.object({
              teamId: z.string().uuid(),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { name, description, avatarUrl, organizationId } = request.body

        const slug = createSlug(name)

        const teamWithSameSlug = await prisma.team.findUnique({
          where: { slug },
        })

        if (teamWithSameSlug) {
          throw new BadRequestError('A team with this name or slug already exists')
        }

        const team = await prisma.team.create({
          data: {
            name,
            slug,
            description,
            avatarUrl,
            organizationId,
            ownerId: userId,
            players: {
              create: {
                userId,
                role: 'ADMIN',
              },
            },
          },
        })

        return reply.status(201).send({ teamId: team.id })
      },
    )
}
