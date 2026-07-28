import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { teamSchema } from '~/models/team'
import { getTeamPermissions } from '~/utils/get-team-permissions'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function removePlayer(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/teams/:id/players/:playerId',
      {
        schema: {
          tags: ['teams'],
          summary: 'Remove a player from the team or leave the team',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
            playerId: z.string().uuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { id, playerId } = request.params
        const userId = await request.getCurrentUserId()
        
        const { team, player: requesterPlayer } = await request.getTeamMembership(id)

        // Find the player to be removed
        const playerToRemove = await prisma.player.findUnique({
          where: { id: playerId },
        })

        if (!playerToRemove || playerToRemove.teamId !== team.id) {
          throw new BadRequestError('Player not found in this team')
        }

        const isRemovingSelf = playerToRemove.userId === userId

        if (isRemovingSelf) {
          if (team.ownerId === userId) {
            throw new BadRequestError(
              'The team owner cannot leave the team. Please transfer ownership or delete the team.'
            )
          }
        } else {
          // Requester wants to remove someone else
          const authTeam = teamSchema.parse(team)
          const { cannot } = getTeamPermissions(userId, requesterPlayer.role)

          if (cannot('remove_member', authTeam)) {
            throw new UnauthorizedError('You are not allowed to remove members from this team')
          }
        }

        await prisma.player.delete({
          where: { id: playerId },
        })

        return reply.status(204).send()
      },
    )
}
