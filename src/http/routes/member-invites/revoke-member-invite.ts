import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { getUserPermissions } from '~/utils/get-user-permissions'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function revokeMemberInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/organizations/:slug/member-invites/:inviteId',
      {
        schema: {
          tags: ['member-invites'],
          summary: 'Revoke a member invite',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            inviteId: z.uuid(),
          }),
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        const { slug, inviteId } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } =
          await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('delete', 'Invite')) {
          throw new UnauthorizedError(`You're not allowed to delete an invite`)
        }

        const invite = await prisma.memberInvite.findUnique({
          where: {
            id: inviteId,
          },
        })

        if (!invite) {
          throw new BadRequestError('Invite not found')
        }

        await prisma.memberInvite.delete({
          where: {
            id: inviteId,
            organizationId: organization.id,
          },
        })

        return reply.status(204).send()
      },
    )
}
