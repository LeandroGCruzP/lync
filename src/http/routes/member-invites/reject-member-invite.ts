import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function rejectMemberInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/member-invites/:inviteId/reject',
      {
        schema: {
          tags: ['member-invites'],
          summary: 'Reject a member invite',
          params: z.object({
            inviteId: z.uuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { inviteId } = request.params

        const invite = await prisma.memberInvite.findUnique({
          where: {
            id: inviteId,
          },
        })

        if (!invite) {
          throw new BadRequestError('Invite not found or expired')
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        })

        if (!user) {
          throw new BadRequestError('User not found')
        }

        if (user.email !== invite.email) {
          throw new BadRequestError('This invite belongs to another user')
        }

        await prisma.memberInvite.delete({
          where: {
            id: inviteId,
          },
        })

        reply.status(204).send()
      },
    )
}
