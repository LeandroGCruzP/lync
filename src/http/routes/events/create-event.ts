import { EventAccessType, PaymentModel } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { auth } from "~/http/middlewares/auth";
import { prisma } from "~/lib/prisma";
import { createSlug } from "~/utils/create-slug";
import { BadRequestError } from "../_errors/bad-request-error";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export async function createEvent(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/events',
      {
        schema: {
          tags: ['events'],
          summary: 'Create a new event',
          security: [{ bearerAuth: [] }],
          body: z.object({
            description: z.string().optional(),
            endDate: z.iso.datetime({ offset: true }).optional(),
            name: z.string().min(3, { message: 'Name must be at least 3 characters long' }),
            organizationId: z.uuid().optional(),
            paymentModel: z.enum(PaymentModel).default(PaymentModel.FREE),
            accessType: z.enum(EventAccessType).default(EventAccessType.PUBLIC_OPEN),
            playersPerTeam: z.number().optional(),
            price: z.number().optional(),
            slots: z.number().optional(),
            sportId: z.uuid().optional(),
            startDate: z.iso.datetime({ offset: true }),
          }),
          response: { 201: z.object({ eventId: z.uuid() }) },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { name, description, startDate, endDate, sportId, organizationId, price, paymentModel, accessType, slots, playersPerTeam } = request.body

        if (accessType === 'MEMBERS_ONLY' && !organizationId) {
          throw new BadRequestError('Members-only events must be associated with an organization.')
        }

        if (organizationId) {
          const member = await prisma.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId,
                userId,
              },
            },
          })

          if (!member || member.role !== 'ADMIN') {
            throw new UnauthorizedError('You are not allowed to create events for this organization.')
          }
        }

        const eventByName = await prisma.event.findFirst({
          where: { name },
        })

        if (eventByName) {
          throw new BadRequestError(
            'Another event with this name already exists',
          )
        }

        const event = await prisma.event.create({
          data: {
            name,
            description,
            startDate,
            endDate,
            slug: createSlug(name),
            ownerId: userId,
            organizationId,
            sportId,
            slots,
            playersPerTeam,
            price,
            paymentModel,
            accessType,
          }
        })

        reply.status(201).send({ eventId: event.id })
      }
    )
}
