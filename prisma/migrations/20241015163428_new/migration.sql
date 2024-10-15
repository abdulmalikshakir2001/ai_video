/*
  Warnings:

  - Added the required column `config` to the `VideoClips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VideoClips" ADD COLUMN     "config" JSONB NOT NULL;
