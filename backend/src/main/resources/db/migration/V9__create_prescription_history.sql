-- Re-introduce prescription_history: tracks field-level changes to prescription items.
CREATE TABLE IF NOT EXISTS prescription_history (
    id BIGSERIAL PRIMARY KEY,
    prescription_item_id BIGINT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    field_changed VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prescription_history_item ON prescription_history(prescription_item_id);
