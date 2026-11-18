-- Complaints (Kuwait checklist CX-04; Digital Commerce Decree-Law readiness: keep complaint records at least 6 months).
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
