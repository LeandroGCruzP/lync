import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { auth } from "~/http/middlewares/auth";
import { prisma } from "~/lib/prisma";

export async function getSports(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/sports',
      {
        schema: {
          tags: ['sports'],
          summary: 'Get all available sports',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              sports: z.array(z.object({
                id: z.string().uuid(),
                name: z.string(),
              }))
            })
          }
        },
      },
      async (request, reply) => {
        const sports = await prisma.sport.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc',
          }
        })

        return reply.status(200).send({ sports })
      }
    )
}
