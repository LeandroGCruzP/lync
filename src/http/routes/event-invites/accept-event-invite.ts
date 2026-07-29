import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function acceptEventInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/event-invites/:id/accept',
      {
        schema: {
          tags: ['event-invites'],
          summary: 'Accept an event invite',
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

        const invite = await prisma.eventInvite.findUnique({
          where: { id },
          include: {
            event: true,
          },
        })

        if (!invite) {
          throw new BadRequestError('Invite not found')
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

        // Check if user is already a participant
        const existingParticipant = await prisma.participant.findUnique({
          where: {
            eventId_userId: {
              eventId: invite.eventId,
              userId: user.id,
            },
          },
        })

        if (existingParticipant) {
          // Delete invite and return success
          await prisma.eventInvite.delete({
            where: { id },
          })
          return reply.status(204).send()
        }

        // Check slots capacity
        if (invite.event.slots !== null) {
          const count = await prisma.participant.count({
            where: { eventId: invite.eventId },
          })

          if (count >= invite.event.slots) {
            throw new BadRequestError('No slots available for this event')
          }
        }

        const paymentStatus = invite.event.paymentModel === 'FREE' ? 'NOT_REQUIRED' : 'PENDING'

        await prisma.$transaction([
          prisma.participant.create({
            data: {
              eventId: invite.eventId,
              userId: user.id,
              participantType: 'PLAYER',
              role: invite.role,
              paymentStatus,
            },
          }),
          prisma.eventInvite.delete({
            where: { id },
          }),
        ])

        return reply.status(204).send()
      },
    )
}
