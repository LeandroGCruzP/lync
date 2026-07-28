import { z } from 'zod'

export const teamInviteSchema = z.object({
  __typename: z.literal('TeamInvite').default('TeamInvite'),
  id: z.string(),
  teamId: z.string(),
  authorId: z.string().nullable().optional(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PLAYER']),
})

export type TeamInvite = z.infer<typeof teamInviteSchema>
