CREATE TABLE patients (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    admission_date DATE NOT NULL,
    rg VARCHAR(30),
    cpf VARCHAR(20),
    diagnosis TEXT,
    room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE prescriptions (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reviewed_at DATE NOT NULL,
    valid_until DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE prescription_items (
    id BIGSERIAL PRIMARY KEY,
    prescription_id BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(100),
    quantity VARCHAR(100),
    morning_times VARCHAR(255),
    afternoon_times VARCHAR(255),
    night_times VARCHAR(255),
    observation TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE administration_logs (
    id BIGSERIAL PRIMARY KEY,
    prescription_item_id BIGINT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    administered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    scheduled_time VARCHAR(10) NOT NULL,
    administered_by VARCHAR(255),
    notes TEXT
);

CREATE TABLE prescription_history (
    id BIGSERIAL PRIMARY KEY,
    prescription_item_id BIGINT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    changed_by VARCHAR(255)
);
