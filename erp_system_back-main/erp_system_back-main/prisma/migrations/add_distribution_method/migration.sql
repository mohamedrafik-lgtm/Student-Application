-- CreateEnum
CREATE TYPE "DistributionMethod" AS ENUM ('UNSPECIFIED', 'ALPHABETICAL', 'BY_DISTRIBUTION', 'SINGLE_ROOM', 'CUSTOM_COMMITTEES');

-- AlterTable
ALTER TABLE "paper_exam_models" ADD COLUMN "distributionMethod" "DistributionMethod" NOT NULL DEFAULT 'UNSPECIFIED';
