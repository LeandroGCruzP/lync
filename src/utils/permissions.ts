import type { AbilityBuilder } from '@casl/ability'
import { User } from '~/models/user'
import type { AppAbility } from './define-user-permissions'

type PermissionsByRole = (
  user: User,
  builder: AbilityBuilder<AppAbility>,
) => void

export const permissions: Record<User['role'], PermissionsByRole> = {
  ADMIN(user, { can, cannot }) {
    can('manage', 'all')

    cannot(['transfer_ownership', 'update'], 'Organization')
    can(['transfer_ownership', 'update'], 'Organization', {
      ownerId: { $eq: user.id },
    })
  },
  MEMBER(user, { can }) {
    can('get', 'User')
  },
}
