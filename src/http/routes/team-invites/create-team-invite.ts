import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '~/http/middlewares/auth'
import { prisma } from '~/lib/prisma'
import { teamSchema } from '~/models/team'
import { getTeamPermissions } from '~/utils/get-team-permissions'
import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function createTeamInvite(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/teams/:id/invites',
      {
        schema: {
          tags: ['team-invites'],
          summary: 'Invite a player to the team',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string().uuid(),
          }),
          body: z.object({
            email: z.string().email(),
            role: z.enum(['ADMIN', 'PLAYER']),
          }),
          response: {
            201: z.object({
              inviteId: z.string().uuid(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const userId = await request.getCurrentUserId()
        const { team, player } = await request.getTeamMembership(id)

        const authTeam = teamSchema.parse(team)
        const { cannot } = getTeamPermissions(userId, player.role)

        if (cannot('invite_member', authTeam)) {
          throw new UnauthorizedError('You are not allowed to invite members to this team')
        }

        const { email, role } = request.body

        // Check if invite already exists
        const inviteWithSameEmail = await prisma.teamInvite.findUnique({
          where: {
            email_teamId: {
              email,
              teamId: team.id,
            },
          },
        })

        if (inviteWithSameEmail) {
          throw new BadRequestError('Another invite with the same email already exists for this team')
        }

        // Check if player already exists
        const playerWithSameEmail = await prisma.player.findFirst({
          where: {
            teamId: team.id,
            user: {
              email,
            },
          },
        })

        if (playerWithSameEmail) {
          throw new BadRequestError('This user is already a member of this team')
        }

        const invite = await prisma.teamInvite.create({
          data: {
            email,
            role,
            teamId: team.id,
            authorId: userId,
          },
        })

        return reply.status(201).send({ inviteId: invite.id })
      },
    )
}
