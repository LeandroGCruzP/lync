import { EventAccessType, PaymentModel } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { auth } from "~/http/middlewares/auth";
import { prisma } from "~/lib/prisma";
import { createSlug } from "~/utils/create-slug";
import { BadRequestError } from "../_errors/bad-request-error";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export async function updateEvent(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .put(
      '/events/:id',
      {
        schema: {
          tags: ['events'],
          summary: 'Update event configuration',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
          }),
          body: z.object({
            description: z.string().optional().nullable(),
            endDate: z.iso.datetime({ offset: true }).optional().nullable(),
            name: z.string().min(3).optional(),
            paymentModel: z.enum(PaymentModel).optional(),
            accessType: z.enum(EventAccessType).optional(),
            playersPerTeam: z.number().optional().nullable(),
            price: z.number().optional().nullable(),
            slots: z.number().optional().nullable(),
            sportId: z.string().uuid().optional().nullable(),
            startDate: z.iso.datetime({ offset: true }).optional(),
          }),
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { id } = request.params

        const event = await prisma.event.findUnique({
          where: { id },
        })

        if (!event) {
          throw new BadRequestError('Event not found')
        }

        // Verify permissions: owner or org admin
        const isOwner = event.ownerId === userId
        let isOrgAdmin = false

        if (event.organizationId) {
          const member = await prisma.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId: event.organizationId,
                userId,
              },
            },
          })
          isOrgAdmin = member?.role === 'ADMIN'
        }

        if (!isOwner && !isOrgAdmin) {
          throw new UnauthorizedError('You are not allowed to update this event')
        }

        const {
          name,
          description,
          startDate,
          endDate,
          sportId,
          price,
          paymentModel,
          accessType,
          slots,
          playersPerTeam,
        } = request.body

        // Verify name uniqueness if changing
        if (name && name !== event.name) {
          const eventByName = await prisma.event.findFirst({
            where: { name },
          })

          if (eventByName) {
            throw new BadRequestError('Another event with this name already exists')
          }
        }

        const updateData: any = {}
        if (name !== undefined) {
          updateData.name = name
          updateData.slug = createSlug(name)
        }
        if (description !== undefined) updateData.description = description
        if (startDate !== undefined) updateData.startDate = startDate
        if (endDate !== undefined) updateData.endDate = endDate
        if (sportId !== undefined) updateData.sportId = sportId
        if (price !== undefined) updateData.price = price
        if (paymentModel !== undefined) updateData.paymentModel = paymentModel
        if (accessType !== undefined) updateData.accessType = accessType
        if (slots !== undefined) updateData.slots = slots
        if (playersPerTeam !== undefined) updateData.playersPerTeam = playersPerTeam

        await prisma.event.update({
          where: { id },
          data: updateData,
        })

        return reply.status(204).send()
      }
    )
}
