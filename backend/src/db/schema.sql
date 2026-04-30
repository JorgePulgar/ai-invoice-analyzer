-- Invoice Insights — SQLite schema
-- Foreign keys must be enabled by the client: PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS facturas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  numero            TEXT    NOT NULL,
  fecha             TEXT    NOT NULL,                     -- ISO 'YYYY-MM-DD'
  emisor            TEXT    NOT NULL,
  receptor          TEXT    NOT NULL,
  concepto          TEXT,
  base_imponible    REAL    NOT NULL,
  iva_porcentaje    REAL    NOT NULL DEFAULT 21,
  iva_cantidad      REAL    NOT NULL DEFAULT 0,
  irpf_porcentaje   REAL    NOT NULL DEFAULT 0,           -- always positive; sign is applied in calculation logic
  irpf_cantidad     REAL    NOT NULL DEFAULT 0,
  total             REAL    NOT NULL,
  moneda            TEXT    NOT NULL DEFAULT 'EUR',
  tipo              TEXT    NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_facturas_user        ON facturas(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_user_fecha  ON facturas(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_user_emisor ON facturas(user_id, emisor);
CREATE INDEX IF NOT EXISTS idx_facturas_user_tipo   ON facturas(user_id, tipo);
