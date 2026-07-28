import { PaymentModel, SportName } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

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
        const userId = await request.getCurrentUserId()

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

        return reply.status(200).send({
          event: {
            ...event,
            price: event.price ? event.price.toNumber() : null,
          },
          isRegistered: !!participant,
        })
      },
    )
}
