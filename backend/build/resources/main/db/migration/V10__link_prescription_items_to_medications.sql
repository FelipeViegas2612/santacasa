-- Link prescription_items.MEDICATION rows to a row in medications.
-- Items that don't match an existing medication name become auto-created
-- catalog entries (category NULL, stock 0) so prescriptions stay valid
-- and the catalog mirrors what's actually in use.

-- 1. FK column
ALTER TABLE prescription_items
    ADD COLUMN IF NOT EXISTS medication_id BIGINT REFERENCES medications(id) ON DELETE SET NULL;

-- 2. Link existing items to meds via prefix-match (case/whitespace tolerant).
--    Same heuristic the frontend used before catalog enforcement.
UPDATE prescription_items pi
SET medication_id = m.id
FROM medications m
WHERE pi.item_type = 'MEDICATION'
  AND pi.medication_id IS NULL
  AND LOWER(TRIM(pi.name)) LIKE LOWER(m.name) || '%';

-- 3. Auto-create catalog entries for items still unmatched
--    (deduplicating by trimmed name; existing names are case-sensitive in
--     medications.name, so we use exact compare here).
INSERT INTO medications (name, stock, min_stock)
SELECT DISTINCT TRIM(pi.name), 0, 0
FROM prescription_items pi
WHERE pi.item_type = 'MEDICATION'
  AND pi.medication_id IS NULL
  AND TRIM(pi.name) NOT IN (SELECT name FROM medications);

-- 4. Link the previously unmatched items to the meds we just created
UPDATE prescription_items pi
SET medication_id = m.id
FROM medications m
WHERE pi.item_type = 'MEDICATION'
  AND pi.medication_id IS NULL
  AND LOWER(TRIM(pi.name)) = LOWER(m.name);

CREATE INDEX IF NOT EXISTS idx_prescription_items_medication ON prescription_items(medication_id);
