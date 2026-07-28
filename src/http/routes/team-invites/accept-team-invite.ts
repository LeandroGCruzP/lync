import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function acceptTeamInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/team-invites/:id/accept',
      {
        schema: {
          tags: ['team-invites'],
          summary: 'Accept a team invite',
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
          throw new BadRequestError('Invite not found or already accepted/rejected')
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          throw new BadRequestError('User not found')
        }

        if (invite.email !== user.email) {
          throw new BadRequestError('This invite was sent to another email address')
        }

        // Check if user is already a member
        const existingPlayer = await prisma.player.findUnique({
          where: {
            teamId_userId: {
              teamId: invite.teamId,
              userId: user.id,
            },
          },
        })

        if (existingPlayer) {
          // If already player, just delete invite and succeed
          await prisma.teamInvite.delete({
            where: { id },
          })
          return reply.status(204).send()
        }

        // Add user as player in a transaction
        await prisma.$transaction([
          prisma.player.create({
            data: {
              userId: user.id,
              teamId: invite.teamId,
              role: invite.role,
            },
          }),
          prisma.teamInvite.delete({
            where: { id },
          }),
        ])

        return reply.status(204).send()
      },
    )
}
