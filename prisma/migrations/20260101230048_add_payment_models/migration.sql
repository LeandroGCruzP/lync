-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('FREE', 'PAY_TO_REGISTER', 'PAY_TO_CONFIRM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "event_settings" ADD COLUMN     "payment_model" "PaymentModel" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "price" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
