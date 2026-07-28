import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function rejectTeamInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/team-invites/:id/reject',
      {
        schema: {
          tags: ['team-invites'],
          summary: 'Reject a team invite',
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

        await prisma.teamInvite.delete({
          where: { id },
        })

        return reply.status(204).send()
      },
    )
}
