import { MemberRole } from '@prisma/client'
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  role: z.enum(MemberRole),
})

export type User = z.infer<typeof userSchema>
