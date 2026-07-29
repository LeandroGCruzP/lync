import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function acceptJoinRequest(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/join-requests/:requestId/accept',
      {
        schema: {
          tags: ['team-join-requests'],
          summary: 'Accept a request to join a team',
          security: [{ bearerAuth: [] }],
          params: z.object({
            requestId: z.string().uuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { requestId } = request.params
        const currentUserId = await request.getCurrentUserId()

        const joinRequest = await prisma.teamJoinRequest.findUnique({
          where: { id: requestId },
          include: {
            team: true,
          },
        })

        if (!joinRequest) {
          throw new BadRequestError('Join request not found or already processed')
        }

        // Verify if current user is owner of the team
        const isOwner = joinRequest.team.ownerId === currentUserId

        // Verify if current user is admin of the team
        const isTeamAdmin = await prisma.player.findUnique({
          where: {
            teamId_userId: {
              teamId: joinRequest.teamId,
              userId: currentUserId,
            },
          },
        })

        const hasAdminAccess = isOwner || (isTeamAdmin && isTeamAdmin.role === 'ADMIN')

        if (!hasAdminAccess) {
          throw new UnauthorizedError('You are not allowed to accept requests for this team')
        }

        // Check if requester is already a player
        const existingPlayer = await prisma.player.findUnique({
          where: {
            teamId_userId: {
              teamId: joinRequest.teamId,
              userId: joinRequest.userId,
            },
          },
        })

        if (existingPlayer) {
          await prisma.teamJoinRequest.delete({
            where: { id: requestId },
          })
          return reply.status(204).send()
        }

        // Add player and delete request in a transaction
        await prisma.$transaction([
          prisma.player.create({
            data: {
              teamId: joinRequest.teamId,
              userId: joinRequest.userId,
              role: 'PLAYER',
            },
          }),
          prisma.teamJoinRequest.delete({
            where: { id: requestId },
          }),
        ])

        return reply.status(204).send()
      },
    )
}
