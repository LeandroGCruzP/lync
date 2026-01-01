import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { auth } from "~/http/middlewares/auth";
import { prisma } from "~/lib/prisma";
import { createSlug } from "~/utils/create-slug";
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
            name: z.string(),
            description: z.string().optional(),
            startDate: z.coerce.date(),
            endDate: z.coerce.date().optional(),
            sportId: z.uuid().optional(),
            organizationId: z.uuid().optional(),
          }),
          response: { 201: z.object({ eventId: z.uuid() }) },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { name, description, startDate, endDate, sportId, organizationId } = request.body

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
          }
        })

        reply.status(201).send({ eventId: event.id })
      }
    )
}
