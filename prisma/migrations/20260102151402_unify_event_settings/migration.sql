/*
  Warnings:

  - You are about to drop the `event_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."event_settings" DROP CONSTRAINT "event_settings_event_id_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "payment_model" "PaymentModel" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "playersPerTeam" INTEGER,
ADD COLUMN     "price" DECIMAL(65,30),
ADD COLUMN     "slots" INTEGER;

-- DropTable
DROP TABLE "public"."event_settings";
