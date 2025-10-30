import { z } from 'zod'

export const userPermission = z.tuple([
  z.union([
    z.literal('manage'), // 'manage' is required to casl
    z.literal('get'),
    z.literal('update'),
    z.literal('delete'),
  ]),
  z.literal('User'),
])

export type UserSubject = z.infer<typeof userPermission>
