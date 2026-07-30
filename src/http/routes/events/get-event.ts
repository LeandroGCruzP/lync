import { EventAccessType, PaymentModel, SportName } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function getEvent(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/events/:slug',
      {
        schema: {
          tags: ['events'],
          summary: 'Get event by slug',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          response: {
            200: z.object({
              event: z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullable(),
                slug: z.string(),
                startDate: z.date(),
                endDate: z.date().nullable(),
                slots: z.number().nullable(),
                playersPerTeam: z.number().nullable(),
                price: z.number().multipleOf(0.01).nullable(),
                paymentModel: z.enum(PaymentModel),
                accessType: z.enum(EventAccessType),
                organization: z
                  .object({
                    id: z.string(),
                    name: z.string(),
                    slug: z.string(),
                    avatarUrl: z.string().nullable(),
                  })
                  .nullable(),
                sport: z
                  .object({
                    id: z.string(),
                    name: z.enum(SportName),
                  })
                  .nullable(),
                owner: z.object({
                  id: z.string(),
                  name: z.string(),
                  avatarUrl: z.string().nullable(),
                }),
              }),
              isRegistered: z.boolean(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserIdOptional()

        const event = await prisma.event.findUnique({
          where: { slug },
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
            startDate: true,
            endDate: true,
            slots: true,
            playersPerTeam: true,
            price: true,
            paymentModel: true,
            accessType: true,
            ownerId: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatarUrl: true,
              },
            },
            sport: {
              select: {
                id: true,
                name: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        })

        if (!event) {
          throw new BadRequestError('Event not found.')
        }

        // Access checks
        if (event.accessType === 'INVITE_ONLY') {
          if (!userId) {
            throw new UnauthorizedError('Authentication required to view this private event.')
          }

          if (event.ownerId !== userId) {
            // Check if registered participant
            const isParticipant = await prisma.participant.findFirst({
              where: {
                eventId: event.id,
                OR: [
                  { userId },
                  {
                    team: {
                      players: {
                        some: {
                          userId,
                        },
                      },
                    },
                  },
                ],
              },
            })

            if (!isParticipant) {
              // Check if has invite
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
              })

              const invite = user
                ? await prisma.eventInvite.findUnique({
                    where: {
                      email_eventId: {
                        email: user.email,
                        eventId: event.id,
                      },
                    },
                  })
                : null

              if (!invite) {
                throw new UnauthorizedError('You must be invited to view this event.')
              }
            }
          }
        } else if (event.accessType === 'MEMBERS_ONLY') {
          if (!userId) {
            throw new UnauthorizedError('Authentication required to view this event.')
          }

          if (event.ownerId !== userId && event.organizationId) {
            const member = await prisma.member.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: event.organizationId,
                  userId,
                },
              },
            })

            if (!member) {
              throw new UnauthorizedError('Only members of the hosting organization can view this event.')
            }
          }
        }

        let isRegistered = false
        if (userId) {
          const participant = await prisma.participant.findFirst({
            where: {
              eventId: event.id,
              OR: [
                { userId },
                {
                  team: {
                    players: {
                      some: {
                        userId,
                      },
                    },
                  },
                },
              ],
            },
          })
          isRegistered = !!participant
        }

        return reply.status(200).send({
          event: {
            ...event,
            price: event.price ? event.price.toNumber() : null,
          },
          isRegistered,
        })
      },
    )
}
