-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Highlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "annotation" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#fef08a',
    "coordinates" TEXT NOT NULL,
    "notebookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Highlight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Highlight_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Highlight" ("color", "coordinates", "createdAt", "documentId", "id", "notebookId", "pageNumber", "projectId", "text") SELECT "color", "coordinates", "createdAt", "documentId", "id", "notebookId", "pageNumber", "projectId", "text" FROM "Highlight";
DROP TABLE "Highlight";
ALTER TABLE "new_Highlight" RENAME TO "Highlight";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
