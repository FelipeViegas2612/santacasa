-- Align schema to frontend baseline (feature/patients).
-- Strip anything no frontend page consumes; add what frontend needs to drop mocks.

-- USERS: phone column for /usuarios/perfil
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- USERS: seed a nurse account so the NURSE role isn't theoretical
INSERT INTO users (name, email, password, role)
VALUES ('Enfermeira Ana Paula', 'ana.paula@santarita.com',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'NURSE')
ON CONFLICT (email) DO NOTHING;

-- ROOMS: enforce status enum at the DB level
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
    CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE'));

-- PATIENTS: bed_number is unused by the frontend
ALTER TABLE patients DROP COLUMN IF EXISTS bed_number;

-- PRESCRIPTION ITEMS: normalize existing item_type values, then enforce enum
ALTER TABLE prescription_items DROP CONSTRAINT IF EXISTS prescription_items_item_type_check;

UPDATE prescription_items SET item_type = UPPER(TRIM(item_type)) WHERE item_type IS NOT NULL;
UPDATE prescription_items SET item_type = 'MEDICATION'
    WHERE item_type IN ('MED', 'MEDICAMENTO', 'MEDICAMENTOS', 'MEDS', 'REMEDIO', 'REMÉDIO');
UPDATE prescription_items SET item_type = 'DIET'
    WHERE item_type IN ('DIETA', 'ALIMENTACAO', 'ALIMENTAÇÃO', 'NUTRICAO', 'NUTRIÇÃO');
UPDATE prescription_items SET item_type = 'CARE'
    WHERE item_type IN ('CUIDADO', 'CUIDADOS', 'PROCEDIMENTO', 'PROCEDIMENTOS');
-- catch-all: anything still outside the enum becomes MEDICATION (safe default)
UPDATE prescription_items SET item_type = 'MEDICATION'
    WHERE item_type IS NULL OR item_type NOT IN ('MEDICATION', 'DIET', 'CARE');

ALTER TABLE prescription_items ADD CONSTRAINT prescription_items_item_type_check
    CHECK (item_type IN ('MEDICATION', 'DIET', 'CARE'));

-- PRESCRIPTION_HISTORY: feature has no frontend consumer
DROP TABLE IF EXISTS prescription_history;

-- MEDICATIONS: shrink to frontend shape {id,name,category,unit,stock,minStock,expiresAt}
ALTER TABLE medications DROP COLUMN IF EXISTS active_ingredient;
ALTER TABLE medications DROP COLUMN IF EXISTS concentration;
ALTER TABLE medications DROP COLUMN IF EXISTS form;
ALTER TABLE medications DROP COLUMN IF EXISTS route;
ALTER TABLE medications DROP COLUMN IF EXISTS manufacturer;
ALTER TABLE medications DROP COLUMN IF EXISTS lot;
ALTER TABLE medications DROP COLUMN IF EXISTS observation;

ALTER TABLE medications RENAME COLUMN expiry_date TO expires_at;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE medications ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;

-- ROUTINE ACTIVITIES: per-patient list of timed activities (RegisterRoutine.jsx)
CREATE TABLE IF NOT EXISTS routine_activities (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    frequency VARCHAR(50),
    times TEXT,
    details TEXT
);
CREATE INDEX IF NOT EXISTS idx_routine_activities_patient ON routine_activities(patient_id);
