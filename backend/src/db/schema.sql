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
  summary           TEXT,                                      -- AI-generated fiscal narrative; NULL until generated
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_facturas_user        ON facturas(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_user_fecha  ON facturas(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_user_emisor ON facturas(user_id, emisor);
CREATE INDEX IF NOT EXISTS idx_facturas_user_tipo   ON facturas(user_id, tipo);

-- Drafts awaiting human review/edit before being promoted to facturas.
-- No UNIQUE(user_id, numero) — the same numero can appear in multiple drafts.
CREATE TABLE IF NOT EXISTS facturas_draft (
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
  irpf_porcentaje   REAL    NOT NULL DEFAULT 0,
  irpf_cantidad     REAL    NOT NULL DEFAULT 0,
  total             REAL    NOT NULL,
  moneda            TEXT    NOT NULL DEFAULT 'EUR',
  tipo              TEXT    NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  status            TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON facturas_draft(user_id, status);

-- Per-user cache for the dashboard AI summary. One row per user, upserted on regeneration.
CREATE TABLE IF NOT EXISTS ai_summary_cache (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  narrative    TEXT    NOT NULL,
  generated_at TEXT    NOT NULL
);
