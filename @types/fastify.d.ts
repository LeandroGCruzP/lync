import 'fastify';

import { Member, Organization, Player, Team } from '@prisma/client';

declare module 'fastify' {
  export interface FastifyRequest {
    getCurrentUserId(): Promise<string>
    getCurrentUserIdOptional(): Promise<string | null>
    getUserMembership(
      slug: string,
    ): Promise<{ organization: Organization; membership: Member }>
    getTeamMembership(
      slugOrId: string,
    ): Promise<{ team: Team; player: Player }>
  }
}
