-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "sebBrowserKey" TEXT,
ADD COLUMN     "sebConfig" JSONB,
ADD COLUMN     "sebEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sebQuitPassword" TEXT;
