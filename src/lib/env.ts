import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_PORT: z.coerce.number().default(3333),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string(),
    EMAIL_FROM: z.email(),
    EMAIL_PASSWORD: z.string(),
    FRONTEND_URL: z.url(),
  },
  client: {},
  shared: {},
  runtimeEnv: {
    SERVER_PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    FRONTEND_URL: process.env.FRONTEND_URL,
  },
  emptyStringAsUndefined: true,
})
