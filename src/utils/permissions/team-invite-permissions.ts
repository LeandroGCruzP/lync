import { z } from 'zod'
import { teamInviteSchema } from '~/models/team-invite'

export const teamInvitePermission = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('create'),
    z.literal('delete'),
  ]),
  z.union([z.literal('TeamInvite'), teamInviteSchema]),
])

export type TeamInviteSubject = z.infer<typeof teamInvitePermission>
