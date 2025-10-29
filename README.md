Create project
```cmd
pnpm init
```

Install typescript
```cmd
pnpm add tsx @types/node typescript -D
```

Install fastify and dependencies
```cmd
pnpm add fastify @fastify/cors fastify-type-provider-zod zod
```

Create src/http/server.ts
```ts
import fastifyCors from '@fastify/cors'
import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors)

app.listen({ port: 3333 }).then(() => {
  console.log('🚀 HTTP server running!')
})
```

Create tsconfig.json
Create docker-compose.yml
```yml
services:
  pg:
    image: postgres:17.1-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=docker
      - POSTGRES_PASSWORD=docker
      - POSTGRES_DB=lync_db
```

Initialize docker
```cmd
docker-compose up -d
```

Install prisma
```cmd
pnpm add -D prisma
```

Initialize prisma (this will create prisma folder prisma/schema.prisma)
```cmd
pnpm prisma init
```

Create .env
```env
DATABASE_URL="postgresql://docker:docker@localhost:5432/lync_db?schema=public"
```

Create database structure schema in prisma/schema.prisma
Run migration
```cmd
pnpm prisma migrate dev
Enter a name for the new migration: create database structure
```
This will create a new migration file in prisma/migrations folder and also create the database structure in the database.

Install prisma client (it's possible that when installing prisma it will install @prisma/client automatically)
```cmd
pnpm add @prisma/client
```

Generate prisma client
```cmd
pnpm prisma generate
```

Create src/lib/prisma.ts
```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['query']
})
```

Show prisma studio
```cmd
pnpm prisma studio
```
