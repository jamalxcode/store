-- D1 schema for the sala.company store. Apply with:
--   npx wrangler d1 execute store --remote --file worker/schema.sql
-- Orders are kept at least 5 years (privacy policy / Kuwait Digital Commerce Law).
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  items TEXT NOT NULL,              -- JSON [{handle,title,price_fils}]
  total_fils INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KWD',
  status TEXT NOT NULL,             -- pending | paid | failed
  tap_charge_id TEXT,
  tap_status TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  emailed_at TEXT,
  terms_accepted_at TEXT NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS orders_email ON orders(email, status);
CREATE INDEX IF NOT EXISTS orders_charge ON orders(tap_charge_id);

-- One pending email code per address (hashed).
CREATE TABLE IF NOT EXISTS codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Fixed-window rate limits (key = action:subject:window).
CREATE TABLE IF NOT EXISTS ratelimit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS downloads (
  order_id TEXT NOT NULL,
  file TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_at TEXT,
  PRIMARY KEY (order_id, file)
);

-- Audit trail: every payment state change and email sent.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  order_id TEXT,
  kind TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS events_order ON events(order_id);
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,              -- reference given to the customer, e.g. C-7K3M9QX2
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  order_id TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',  -- open | answered | closed
  closed_at TEXT,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS complaints_created ON complaints(created_at);
