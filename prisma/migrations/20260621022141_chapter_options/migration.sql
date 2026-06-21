-- CreateTable
CREATE TABLE "ChapterOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentChapterId" TEXT NOT NULL,
    "childChapterId" TEXT,
    "label" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterOption_parentChapterId_fkey" FOREIGN KEY ("parentChapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChapterOption_childChapterId_fkey" FOREIGN KEY ("childChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChapterOption_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterOption_childChapterId_key" ON "ChapterOption"("childChapterId");

-- Backfill: every existing non-root chapter gets one realized option (label = its
-- title) so the reader keeps rendering choices after the switch from childChapters
-- to ChapterOption. Root chapters (parentChapterId IS NULL) get none.
INSERT INTO "ChapterOption" ("id", "parentChapterId", "childChapterId", "label", "createdByUserId", "createdAt")
SELECT 'opt-' || "id", "parentChapterId", "id", "title", "authorId", "createdAt"
FROM "Chapter"
WHERE "parentChapterId" IS NOT NULL;
