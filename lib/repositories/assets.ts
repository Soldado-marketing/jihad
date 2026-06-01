import 'server-only';

import { getDb } from '@/lib/db/client';
import type { AssetKind, AssetRecord } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';

type AssetRow = {
  id: string;
  post_id: string | null;
  kind: AssetKind;
  filename: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  metadata_json: string;
  created_at: string;
};

function mapAsset(row: AssetRow): AssetRecord {
  return {
    id: row.id,
    postId: row.post_id,
    kind: row.kind,
    filename: row.filename,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

type CreateAssetInput = {
  id: string;
  postId?: string | null;
  kind: AssetKind;
  filename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
};

export function createAsset(input: CreateAssetInput) {
  const db = getDb();

  db.prepare(
    `
      INSERT INTO assets (
        id,
        post_id,
        kind,
        filename,
        storage_key,
        mime_type,
        size_bytes,
        metadata_json,
        created_at
      )
      VALUES (
        @id,
        @post_id,
        @kind,
        @filename,
        @storage_key,
        @mime_type,
        @size_bytes,
        @metadata_json,
        @created_at
      )
    `,
  ).run({
    id: input.id,
    post_id: input.postId ?? null,
    kind: input.kind,
    filename: input.filename,
    storage_key: input.storageKey,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    metadata_json: JSON.stringify(input.metadata ?? {}),
    created_at: new Date().toISOString(),
  });

  return getAssetById(input.id);
}

export function getAssetById(id: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM assets WHERE id = ?`)
    .get(id) as AssetRow | undefined;

  return row ? mapAsset(row) : null;
}

export function listAssetsForPost(postId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM assets WHERE post_id = ? ORDER BY datetime(created_at) DESC`,
    )
    .all(postId) as AssetRow[];

  return rows.map(mapAsset);
}

export function getLatestAssetForPost(postId: string, kind: AssetKind) {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT *
        FROM assets
        WHERE post_id = ? AND kind = ?
        ORDER BY datetime(created_at) DESC
        LIMIT 1
      `,
    )
    .get(postId, kind) as AssetRow | undefined;

  return row ? mapAsset(row) : null;
}
