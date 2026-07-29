import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function createJoinRequest(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/teams/:id/join-requests',
      {
        schema: {
          tags: ['team-join-requests'],
          summary: 'Request to join a team',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
          }),
          response: {
            201: z.object({
              requestId: z.string().uuid(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const userId = await request.getCurrentUserId()

        const team = await prisma.team.findUnique({
          where: { id },
        })

        if (!team) {
          throw new BadRequestError('Team not found')
        }

        // Check if user is owner
        if (team.ownerId === userId) {
          throw new BadRequestError('You are already the owner of this team')
        }

        // Check if user is already a member (player)
        const isPlayer = await prisma.player.findUnique({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId,
            },
          },
        })

        if (isPlayer) {
          throw new BadRequestError('You are already a member of this team')
        }

        // If the team belongs to an organization, verify organization membership
        if (team.organizationId) {
          const isOrgMember = await prisma.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId: team.organizationId,
                userId,
              },
            },
          })

          if (!isOrgMember) {
            throw new UnauthorizedError('You must be a member of the organization to join this team')
          }
        }

        // Check if a request already exists
        const existingRequest = await prisma.teamJoinRequest.findUnique({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId,
            },
          },
        })

        if (existingRequest) {
          throw new BadRequestError('You have already requested to join this team')
        }

        const joinRequest = await prisma.teamJoinRequest.create({
          data: {
            teamId: team.id,
            userId,
          },
        })

        return reply.status(201).send({ requestId: joinRequest.id })
      },
    )
}
