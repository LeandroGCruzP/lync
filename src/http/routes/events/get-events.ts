import { PaymentModel } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { auth } from "~/http/middlewares/auth";
import { prisma } from "~/lib/prisma";

export async function getEvents(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/events',
      {
        schema: {
          tags: ['events'],
          summary: 'Get events related to the user',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              events: z.array(z.object({
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
                organization: z.object({
                  id: z.string(),
                  name: z.string(),
                  slug: z.string(),
                  avatarUrl: z.string().nullable(),
                }).nullable(),
                sport: z.object({
                  id: z.string(),
                  name: z.string(),
                }).nullable(),
              }))
            })
          }
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const events = await prisma.event.findMany({
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
              }
            },
            sport: {
              select: {
                id: true,
                name: true
              }
            },
          },
          where: {
            OR: [
              { ownerId: userId },
              {
                organization: {
                  members: {
                    some: {
                      userId,
                    }
                  }
                }
              }
            ]
          },
          orderBy: {
            startDate: 'asc',
          }
        })

        const formattedEvents = events.map(event => ({
          ...event,
          price: event.price ? event.price.toNumber() : null,
        }))

        return reply.status(200).send({ events: formattedEvents })
      }
    )
}
