-- DropForeignKey
ALTER TABLE "public"."events" DROP CONSTRAINT "events_sport_id_fkey";

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "sport_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
