import { MemberRole } from "@prisma/client"
import { userSchema } from "~/models/user"
import { defineUserPermissions } from "~/utils/define-user-permissions"

export function getUserPermissions(userId: string, role: MemberRole) {
  const authUser = userSchema.parse({ id: userId, role })

  const ability = defineUserPermissions(authUser)

  return ability
}
