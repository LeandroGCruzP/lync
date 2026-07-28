import { z } from 'zod'
import { teamSchema } from '~/models/team'

export const teamPermission = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('update'),
    z.literal('delete'),
    z.literal('invite_member'),
    z.literal('remove_member'),
  ]),
  z.union([z.literal('Team'), teamSchema]),
])

export type TeamSubject = z.infer<typeof teamPermission>
