import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { teamSchema } from '~/models/team'
import { getTeamPermissions } from '~/utils/get-team-permissions'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function deleteTeam(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/teams/:id',
      {
        schema: {
          tags: ['teams'],
          summary: 'Delete a team',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
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

        if (cannot('delete', authTeam)) {
          throw new UnauthorizedError('You are not allowed to delete this team')
        }

        await prisma.team.delete({
          where: { id },
        })

        return reply.status(204).send()
      },
    )
}
