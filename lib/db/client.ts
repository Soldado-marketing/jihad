import 'server-only';

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { getEnv } from '@/lib/env';

let database: Database.Database | null = null;

function getDatabaseFile() {
  const env = getEnv();
  return path.resolve(
    process.cwd(),
    env.DATABASE_FILE || './data/sh-investments.sqlite',
  );
}

function initialize(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_message_id TEXT UNIQUE,
      source_subject TEXT,
      source_from TEXT,
      source_received_at TEXT,
      topic_title TEXT NOT NULL,
      topic_notes TEXT NOT NULL DEFAULT '',
      language_hints TEXT NOT NULL DEFAULT '',
      hero_asset_id TEXT,
      status TEXT NOT NULL,
      arabic_content_json TEXT,
      german_content_json TEXT,
      review_comment TEXT,
      reviewer_email TEXT,
      approval_token TEXT NOT NULL UNIQUE,
      review_requested_at TEXT,
      reviewed_at TEXT,
      ready_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      kind TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      scope TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status_updated_at
      ON posts(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assets_post_id_kind
      ON assets(post_id, kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_post_id_created_at
      ON logs(post_id, created_at DESC);
  `);

  const postColumns = db
    .prepare(`PRAGMA table_info(posts)`)
    .all() as Array<{ name: string }>;
}

export function getDb() {
  if (database) {
    return database;
  }

  const databaseFile = getDatabaseFile();
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  database = new Database(databaseFile);
  initialize(database);

  return database;
}
