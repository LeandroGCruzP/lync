import { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { prisma } from '~/lib/prisma'
import { BadRequestError } from '../routes/_errors/bad-request-error'
import { UnauthorizedError } from '../routes/_errors/unauthorized-error'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request) => {
    request.getCurrentUserId = async () => {
      try {
        const { sub } = await request.jwtVerify<{ sub: string }>()
        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token')
      }
    }

    request.getUserMembership = async (slug: string) => {
      const userId = await request.getCurrentUserId()
      const member = await prisma.member.findFirst({
        where: {
          userId,
          organization: {
            slug,
          },
        },
        include: {
          organization: true,
        },
      })

      if (!member) {
        throw new UnauthorizedError('You are not a member of this organization')
      }

      const { organization, ...membership } = member

      return { organization, membership }
    }

    request.getTeamMembership = async (slugOrId: string) => {
      const userId = await request.getCurrentUserId()
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { id: slugOrId },
            { slug: slugOrId },
          ],
        },
        include: {
          players: {
            where: {
              userId,
            },
          },
        },
      })

      if (!team) {
        throw new BadRequestError('Team not found')
      }

      const player = team.players[0]

      if (!player) {
        throw new UnauthorizedError('You are not a member of this team')
      }

      const { players, ...teamData } = team

      return { team: teamData, player }
    }
  })
})
