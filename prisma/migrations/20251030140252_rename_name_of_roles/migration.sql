/*
  Warnings:

  - You are about to drop the column `eventRole` on the `event_admin_invites` table. All the data in the column will be lost.
  - You are about to drop the column `memberRole` on the `member_invites` table. All the data in the column will be lost.
  - You are about to drop the column `memberRole` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `participantRole` on the `participants` table. All the data in the column will be lost.
  - You are about to drop the column `teamRole` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `teamRole` on the `team_invites` table. All the data in the column will be lost.
  - Added the required column `role` to the `event_admin_invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `member_invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `team_invites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event_admin_invites" DROP COLUMN "eventRole",
ADD COLUMN     "role" "ParticipantRole" NOT NULL;

-- AlterTable
ALTER TABLE "member_invites" DROP COLUMN "memberRole",
ADD COLUMN     "role" "MemberRole" NOT NULL;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "memberRole",
ADD COLUMN     "role" "MemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "participants" DROP COLUMN "participantRole",
ADD COLUMN     "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT';

-- AlterTable
ALTER TABLE "players" DROP COLUMN "teamRole",
ADD COLUMN     "role" "TeamRole" NOT NULL DEFAULT 'PLAYER';

-- AlterTable
ALTER TABLE "team_invites" DROP COLUMN "teamRole",
ADD COLUMN     "role" "TeamRole" NOT NULL;
