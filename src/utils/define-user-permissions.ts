import {
  AbilityBuilder,
  type CreateAbility,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability'
import { z } from 'zod'
import type { User } from '~/models/user'
import { permissions } from './permissions'
import { invitePermission } from './permissions/invite-permissions'
import { organizationPermission } from './permissions/organization-permissions'
import { userPermission } from './permissions/user-permissions'

const AppAbilitiesSchema = z.union([
  userPermission,
  organizationPermission,
  invitePermission,
  z.tuple([z.literal('manage'), z.literal('all')]),
])

type AppAbilitiesSchema = z.infer<typeof AppAbilitiesSchema>

export type AppAbility = MongoAbility<AppAbilitiesSchema>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>

export function defineUserPermissions(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  if (typeof permissions[user.role] !== 'function') {
    throw new Error(`Permissions for role ${user.role} are not defined`)
  }

  permissions[user.role](user, builder)

  const ability = builder.build({
    detectSubjectType(subject) {
      return subject.__typename
    },
  })

  // bind methods to the ability instance to avoid losing context
  ability.can = ability.can.bind(ability)
  ability.cannot = ability.cannot.bind(ability)

  return ability
}
