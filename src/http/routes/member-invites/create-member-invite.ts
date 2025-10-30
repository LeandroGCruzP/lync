import { MemberRole } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { getUserPermissions } from '~/utils/get-user-permissions'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function createMemberInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/organizations/:slug/member-invites',
      {
        schema: {
          tags: ['member-invites'],
          summary: 'Create a new member invite for an organization',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
          }),
          body: z.object({
            email: z.email(),
            role: z.enum(MemberRole),
          }),
          response: { 201: z.object({ inviteId: z.uuid() }) },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } =
          await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('create', 'Invite')) {
          throw new UnauthorizedError(
            `You're not allowed to create new invites`,
          )
        }

        const { email, role } = request.body

        const [, domain] = email.split('@')

        if (
          organization.shouldAttachUsersByDomain &&
          organization.domain === domain
        ) {
          throw new BadRequestError(
            `Users with ${domain} domain will join your organization automatically on login`,
          )
        }

        const inviteWithSameEmail = await prisma.memberInvite.findUnique({
          where: {
            email_organizationId: {
              email,
              organizationId: organization.id,
            },
          },
        })

        if (inviteWithSameEmail) {
          throw new BadRequestError(
            `Another invite with same e-mail already exists`,
          )
        }

        const memberWithSameEmail = await prisma.member.findFirst({
          where: {
            organizationId: organization.id,
            user: {
              email,
            },
          },
        })

        if (memberWithSameEmail) {
          throw new BadRequestError(
            `Another member with this e-mail belongs to your organization`,
          )
        }

        const invite = await prisma.memberInvite.create({
          data: {
            email,
            role,
            organizationId: organization.id,
            authorId: userId,
          },
        })

        // TODO: Send to e-mail with link to accept the invite

        return reply.status(201).send({ inviteId: invite.id })
      },
    )
}
