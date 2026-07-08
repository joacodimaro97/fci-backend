-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CashAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CashAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CashAccount" ("createdAt", "currency", "description", "id", "name", "updatedAt", "userId") SELECT "createdAt", "currency", "description", "id", "name", "updatedAt", "userId" FROM "CashAccount";
DROP TABLE "CashAccount";
ALTER TABLE "new_CashAccount" RENAME TO "CashAccount";
CREATE INDEX "CashAccount_userId_idx" ON "CashAccount"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
