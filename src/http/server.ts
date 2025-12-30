import { env } from '~/lib/env'
import { app } from './app'

app.listen({ port: env.SERVER_PORT }).then(() => {
  console.log(`🚀 HTTP server running on port ${env.SERVER_PORT}!`)
})
