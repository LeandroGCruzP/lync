import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { teamSchema } from '~/models/team'
import { getTeamPermissions } from '~/utils/get-team-permissions'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function updateTeam(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .put(
      '/teams/:id',
      {
        schema: {
          tags: ['teams'],
          summary: 'Update team details',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
          }),
          body: z.object({
            name: z.string().min(2),
            description: z.string().optional(),
            avatarUrl: z.string().url().nullish(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const userId = await request.getCurrentUserId()
        const { team, player } = await request.getTeamMembership(id)

        const authTeam = teamSchema.parse(team)
        const { cannot } = getTeamPermissions(userId, player.role)

        if (cannot('update', authTeam)) {
          throw new UnauthorizedError('You are not allowed to update this team')
        }

        const { name, description, avatarUrl } = request.body

        await prisma.team.update({
          where: { id },
          data: {
            name,
            description,
            avatarUrl,
          },
        })

        return reply.status(204).send()
      },
    )
}
