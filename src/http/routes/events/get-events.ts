import { EventAccessType, PaymentModel, SportName } from "@prisma/client";
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
          querystring: z.object({
            organizationSlug: z.string().optional(),
            teamSlug: z.string().optional(),
            filter: z.enum(['standalone']).optional(),
          }),
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
                accessType: z.enum(EventAccessType),
                ownerId: z.string().uuid(),
                organization: z.object({
                  id: z.string(),
                  name: z.string(),
                  slug: z.string(),
                  avatarUrl: z.string().nullable(),
                }).nullable(),
                sport: z.object({
                  id: z.string(),
                  name: z.enum(SportName),
                }).nullable(),
              }))
            })
          }
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { organizationSlug, teamSlug, filter } = request.query

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        })
        const userEmail = user?.email || ''

        const baseRelationCondition = {
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
        }

        const accessCheckCondition = {
          OR: [
            { accessType: { notIn: [EventAccessType.INVITE_ONLY, EventAccessType.MEMBERS_ONLY] } },
            { ownerId: userId },
            {
              participants: {
                some: {
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
              },
            },
            {
              eventInvites: {
                some: {
                  email: userEmail,
                },
              },
            },
            {
              organization: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        }

        let whereCondition: any = {}

        if (teamSlug) {
          whereCondition = {
            participants: {
              some: {
                team: {
                  slug: teamSlug,
                  players: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            },
          }
        } else {
          whereCondition = {
            AND: [
              {
                organization: organizationSlug ? { slug: organizationSlug } : (filter === 'standalone' ? null : undefined),
              },
              baseRelationCondition,
              accessCheckCondition
            ]
          }
        }

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
            accessType: true,
            ownerId: true,
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
          where: whereCondition,
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
