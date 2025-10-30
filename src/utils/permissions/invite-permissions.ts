import { z } from 'zod'

export const invitePermission = z.tuple([
  z.union([
    z.literal('manage'), // 'manage' is required to casl
    z.literal('get'),
    z.literal('create'),
    z.literal('delete'),
  ]),
  z.literal('Invite'),
])

export type InviteSubject = z.infer<typeof invitePermission>
