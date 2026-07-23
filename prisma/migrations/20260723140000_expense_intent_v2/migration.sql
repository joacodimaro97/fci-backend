-- Rebuild ExpenseIntent: NECESIDAD, GUSTO, IMPULSO, CONVENIENCIA
-- Map legacy CUIDADO/REVISAR → CONVENIENCIA

CREATE TYPE "ExpenseIntent_new" AS ENUM ('NECESIDAD', 'GUSTO', 'IMPULSO', 'CONVENIENCIA');

ALTER TABLE "Transaction"
  ALTER COLUMN "intent" TYPE "ExpenseIntent_new"
  USING (
    CASE
      WHEN "intent"::text = 'NECESIDAD' THEN 'NECESIDAD'::"ExpenseIntent_new"
      WHEN "intent"::text = 'GUSTO' THEN 'GUSTO'::"ExpenseIntent_new"
      WHEN "intent"::text = 'IMPULSO' THEN 'IMPULSO'::"ExpenseIntent_new"
      WHEN "intent"::text IN ('CUIDADO', 'REVISAR', 'CONVENIENCIA') THEN 'CONVENIENCIA'::"ExpenseIntent_new"
      ELSE NULL
    END
  );

DROP TYPE "ExpenseIntent";

ALTER TYPE "ExpenseIntent_new" RENAME TO "ExpenseIntent";
