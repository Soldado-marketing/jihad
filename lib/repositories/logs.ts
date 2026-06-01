import 'server-only';

import { getDb } from '@/lib/db/client';
import type { LogLevel, LogRecord, LogScope } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';

type LogRow = {
  id: string;
  post_id: string | null;
  scope: LogScope;
  level: LogLevel;
  message: string;
  details_json: string;
  created_at: string;
};

function mapLog(row: LogRow): LogRecord {
  return {
    id: row.id,
    postId: row.post_id,
    scope: row.scope,
    level: row.level,
    message: row.message,
    details: safeJsonParse<Record<string, unknown>>(row.details_json, {}),
    createdAt: row.created_at,
  };
}

export function createLog(input: {
  id: string;
  postId?: string | null;
  scope: LogScope;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
}) {
  const db = getDb();

  db.prepare(
    `
      INSERT INTO logs (
        id,
        post_id,
        scope,
        level,
        message,
        details_json,
        created_at
      )
      VALUES (
        @id,
        @post_id,
        @scope,
        @level,
        @message,
        @details_json,
        @created_at
      )
    `,
  ).run({
    id: input.id,
    post_id: input.postId ?? null,
    scope: input.scope,
    level: input.level,
    message: input.message,
    details_json: JSON.stringify(input.details ?? {}),
    created_at: new Date().toISOString(),
  });
}

export function listLogs(limit = 120) {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM logs
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(limit) as LogRow[];

  return rows.map(mapLog);
}

export function listLogsForPost(postId: string, limit = 60) {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM logs
        WHERE post_id = ?
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(postId, limit) as LogRow[];

  return rows.map(mapLog);
}
