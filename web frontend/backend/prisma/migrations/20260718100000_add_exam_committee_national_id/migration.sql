-- AlterTable
ALTER TABLE "exam_committees" ADD COLUMN "national_id" TEXT;

-- CreateIndex
CREATE INDEX "exam_committees_national_id_idx" ON "exam_committees"("national_id");
