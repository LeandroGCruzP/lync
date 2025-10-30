import { MemberRole } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getMemberInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/member-invites/:inviteId',
    {
      schema: {
        tags: ['member-invites'],
        summary: 'Get a member invite',
        params: z.object({
          inviteId: z.uuid(),
        }),
        response: {
          200: z.object({
            invite: z.object({
              id: z.uuid(),
              email: z.email(),
              role: z.enum(MemberRole),
              createdAt: z.date(),
              author: z
                .object({
                  id: z.uuid(),
                  name: z.string().nullable(),
                  avatarUrl: z.url().nullable(),
                })
                .nullable(),
              organization: z.object({
                name: z.string(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { inviteId } = request.params

      const invite = await prisma.memberInvite.findUnique({
        where: {
          id: inviteId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      })

      if (!invite) {
        throw new BadRequestError('Invite not found')
      }

      reply.status(200).send({ invite })
    },
  )
}
