-- Migration 006: Metadata change timeline, review alerts, and multi-tenant team users
CREATE TABLE IF NOT EXISTS metadata_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  version TEXT,
  title TEXT,
  short_desc TEXT,
  subtitle TEXT,
  description TEXT,
  whats_new TEXT,
  score REAL,
  ratings INTEGER,
  detected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timeline_app ON metadata_timeline(package_name, platform, detected_at DESC);

CREATE TABLE IF NOT EXISTS negative_review_alerts (
  review_id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  rating INTEGER NOT NULL,
  author TEXT,
  title TEXT,
  body TEXT,
  alerted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rev_alerts_pkg ON negative_review_alerts(package_name, platform);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  team_name TEXT DEFAULT 'Default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
