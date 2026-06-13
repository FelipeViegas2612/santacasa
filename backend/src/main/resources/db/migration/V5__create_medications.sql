CREATE TABLE IF NOT EXISTS medications (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    concentration VARCHAR(100),
    form VARCHAR(100),
    route VARCHAR(100),
    manufacturer VARCHAR(255),
    lot VARCHAR(100),
    expiry_date DATE,
    stock INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    observation TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
