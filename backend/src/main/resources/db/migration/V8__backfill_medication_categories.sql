-- Backfill category for existing medications. New meds get category from the form.
UPDATE medications SET category = 'Antipsicótico' WHERE LOWER(name) IN ('risperidona', 'quetiapina', 'olanzapina', 'haloperidol');
UPDATE medications SET category = 'Antiparkinsoniano' WHERE LOWER(name) = 'biperideno';
UPDATE medications SET category = 'Estabilizador de humor' WHERE LOWER(name) = 'carbonato de lítio';
UPDATE medications SET category = 'Antidepressivo' WHERE LOWER(name) IN ('sertralina', 'escitalopram', 'fluoxetina');
UPDATE medications SET category = 'Ansiolítico' WHERE LOWER(name) IN ('clonazepam', 'alprazolam');
UPDATE medications SET category = 'Anti-histamínico' WHERE LOWER(name) = 'prometazina';
UPDATE medications SET category = 'Analgésico' WHERE LOWER(name) = 'dipirona sódica';
UPDATE medications SET category = 'Antiulceroso' WHERE LOWER(name) = 'omeprazol';

-- Sensible minimum stocks so the "Estoque baixo" card has meaning
UPDATE medications SET min_stock = 20 WHERE min_stock = 0;
