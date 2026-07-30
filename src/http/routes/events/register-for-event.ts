import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function registerForEvent(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/events/:slug/register',
      {
        schema: {
          tags: ['events'],
          summary: 'Register a player or a team in an event',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          body: z.object({
            teamId: z.string().uuid().optional(),
          }),
          response: {
            201: z.object({
              participantId: z.string().uuid(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { teamId } = request.body

        const event = await prisma.event.findUnique({
          where: { slug },
        })

        if (!event) {
          throw new BadRequestError('Event not found')
        }

        // Access checks
        if (event.accessType === 'PUBLIC_READ_ONLY') {
          throw new BadRequestError('Registrations are not allowed for this event.')
        }

        if (event.accessType === 'INVITE_ONLY') {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
          })
          if (!user) {
            throw new BadRequestError('User not found')
          }

          const invite = await prisma.eventInvite.findUnique({
            where: {
              email_eventId: {
                email: user.email,
                eventId: event.id,
              }
            }
          })

          if (!invite && event.ownerId !== userId) {
            throw new UnauthorizedError('You must be invited to register for this event.')
          }
        } else if (event.accessType === 'MEMBERS_ONLY' && event.organizationId) {
          const member = await prisma.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId: event.organizationId,
                userId,
              }
            }
          })

          if (!member && event.ownerId !== userId) {
            throw new UnauthorizedError('Only members of the hosting organization can register for this event.')
          }
        }

        const isTeamEvent = event.playersPerTeam !== null && event.playersPerTeam > 1

        const paymentStatus = event.paymentModel === 'FREE' ? 'NOT_REQUIRED' : 'PENDING'

        if (isTeamEvent) {
          if (!teamId) {
            throw new BadRequestError('teamId is required for team-based events')
          }

          // Check if user has permissions on the team
          const { team, player } = await request.getTeamMembership(teamId)
          
          if (player.role !== 'ADMIN' && team.ownerId !== userId) {
            throw new UnauthorizedError('Only team administrators can register the team in an event')
          }

          // Check if team is already registered
          const existingParticipant = await prisma.participant.findUnique({
            where: {
              eventId_teamId: {
                eventId: event.id,
                teamId,
              },
            },
          })

          if (existingParticipant) {
            throw new BadRequestError('This team is already registered for this event')
          }

          // Check capacity (slots)
          if (event.slots !== null) {
            const count = await prisma.participant.count({
              where: { eventId: event.id },
            })

            if (count >= event.slots) {
              throw new BadRequestError('No slots available for this event')
            }
          }

          const participant = await prisma.participant.create({
            data: {
              eventId: event.id,
              teamId,
              participantType: 'TEAM',
              paymentStatus,
            },
          })

          return reply.status(201).send({ participantId: participant.id })
        } else {
          // Individual Event
          const existingParticipant = await prisma.participant.findUnique({
            where: {
              eventId_userId: {
                eventId: event.id,
                userId,
              },
            },
          })

          if (existingParticipant) {
            throw new BadRequestError('You are already registered for this event')
          }

          // Check capacity (slots)
          if (event.slots !== null) {
            const count = await prisma.participant.count({
              where: { eventId: event.id },
            })

            if (count >= event.slots) {
              throw new BadRequestError('No slots available for this event')
            }
          }

          const participant = await prisma.participant.create({
            data: {
              eventId: event.id,
              userId,
              participantType: 'PLAYER',
              paymentStatus,
            },
          })

          return reply.status(201).send({ participantId: participant.id })
        }
      },
    )
}
