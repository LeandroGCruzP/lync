import { TeamRole } from '@prisma/client'
import { AbilityBuilder } from '@casl/ability'
import { createAppAbility, type AppAbility } from '~/utils/define-user-permissions'

export function getTeamPermissions(userId: string, role: TeamRole) {
  const builder = new AbilityBuilder<AppAbility>(createAppAbility)

  if (role === 'ADMIN') {
    builder.can('manage', 'all')
    builder.cannot(['delete', 'update'], 'Team')
    builder.can(['delete', 'update'], 'Team', {
      ownerId: { $eq: userId },
    })
  } else {
    // PLAYER
    builder.can('get', 'Team')
  }

  const ability = builder.build({
    detectSubjectType(subject) {
      return subject.__typename
    },
  })

  ability.can = ability.can.bind(ability)
  ability.cannot = ability.cannot.bind(ability)

  return ability
}
