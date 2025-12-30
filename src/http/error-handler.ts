import { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { ZodError } from 'zod'

import { BadRequestError } from './routes/_errors/bad-request-error'
import { UnauthorizedError } from './routes/_errors/unauthorized-error'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, _, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const formattedErrors: Record<string, string[]> = {}

    for (const issue of error.validation) {
      if (issue.instancePath && issue.message) {
        const fieldName = issue.instancePath.substring(1)

        if (fieldName) {
          if (!formattedErrors[fieldName]) {
            formattedErrors[fieldName] = []
          }
          formattedErrors[fieldName].push(issue.message)
        }
      }
    }

    return reply.status(400).send({
      message: 'Validation error.',
      errors: formattedErrors,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error.',
      errors: error.flatten().fieldErrors,
    })
  }

  if (error instanceof BadRequestError) {
    return reply.status(400).send({
      message: error.message,
    })
  }

  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({
      message: error.message,
    })
  }

  console.log(error)

  // send error to some observability platform

  return reply.status(500).send({
    message: 'Internal server error',
  })
}
