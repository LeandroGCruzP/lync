import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { teamSchema } from '~/models/team'
import { getTeamPermissions } from '~/utils/get-team-permissions'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function revokeTeamInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/team-invites/:id',
      {
        schema: {
          tags: ['team-invites'],
          summary: 'Revoke a team invite',
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

        const invite = await prisma.teamInvite.findUnique({
          where: { id },
        })

        if (!invite) {
          throw new BadRequestError('Invite not found')
        }

        const { team, player } = await request.getTeamMembership(invite.teamId)

        const authTeam = teamSchema.parse(team)
        const { cannot } = getTeamPermissions(userId, player.role)

        if (cannot('invite_member', authTeam)) {
          throw new UnauthorizedError('You are not allowed to revoke invites for this team')
        }

        await prisma.teamInvite.delete({
          where: { id },
        })

        return reply.status(204).send()
      },
    )
}
