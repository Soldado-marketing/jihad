/**
 * Phase 3 - S3-compatible object storage gateway.
 *
 * Every read and write to the bucket goes through this service. It is the only
 * place that holds storage credentials, and it never returns a key, a URL, or a
 * credential to a caller that could forward it to a browser.
 *
 * The client is created lazily so the API still boots when storage is not
 * configured; storage-backed routes then fail closed with a clear error.
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { parseStoredContentRange } from './byte-range';
import { assertSafeObjectKey } from './object-key';
import type { StoredObjectSummary } from './storage-reconcile';
import {
  StorageConfig,
  isStorageConfigured,
  missingStorageVars,
  resolveMaxUploadBytes,
  resolveStorageConfig,
} from './storage.config';

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  /** Small, non-sensitive metadata stored alongside the object. */
  metadata?: Record<string, string>;
}

export interface ObjectStream {
  stream: Readable;
  contentType: string;
  /** Length of the bytes in `stream` (the slice, for a ranged read). */
  contentLength?: number;
  /** Present for a ranged read: the slice served and the object's full size. */
  contentRange?: { start: number; end: number; size: number };
}

/** Inclusive byte window to read instead of the whole object. */
export interface ObjectByteRange {
  start: number;
  end: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private client?: S3Client;
  private config?: StorageConfig;

  /** True when the environment carries a complete storage configuration. */
  isConfigured(): boolean {
    return isStorageConfigured();
  }

  /**
   * Returns the effective configuration.
   * Throws ServiceUnavailable (503) rather than 500 when storage is absent, so
   * the caller can tell "not set up" apart from "broken".
   */
  getConfig(): StorageConfig {
    if (!this.config) {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableException({
          code: 'STORAGE_NOT_CONFIGURED',
          reason: `Object storage is not configured. Missing: ${missingStorageVars().join(', ')}.`,
        });
      }
      this.config = resolveStorageConfig();
    }
    return this.config;
  }

  /**
   * Per-file upload ceiling, in bytes.
   *
   * Read straight from the environment rather than through getConfig(), because
   * the ceiling is a property of the deployment, not of the bucket. Routing it
   * through getConfig() made an unconfigured deployment answer 503 to a
   * malformed upload that should have been rejected as 400 before storage was
   * ever consulted.
   */
  getMaxUploadBytes(): number {
    return resolveMaxUploadBytes();
  }

  /** Operator-controlled key prefix; needed to build and verify namespaces. */
  getKeyPrefix(): string {
    return this.getConfig().keyPrefix;
  }

  private getClient(): S3Client {
    if (!this.client) {
      const config = this.getConfig();
      this.client = new S3Client({
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        region: config.region,
      });
    }
    return this.client;
  }

  /**
   * Uploads an object. The key must already have been generated and validated
   * by object-key.ts; it is re-checked here as a last line of defence.
   */
  async putObject(input: PutObjectInput): Promise<void> {
    assertSafeObjectKey(input.key);
    const config = this.getConfig();

    await this.getClient().send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: config.bucket,
        ContentType: input.contentType,
        Key: input.key,
        Metadata: input.metadata,
      }),
    );

    // Keys are never logged: they are the capability that protects the object.
    this.logger.log(`object_stored bytes=${input.body.length}`);
  }

  /**
   * Opens a read stream for an object. The stream is piped straight to the
   * response. With `range`, only that inclusive window is read (S3 `Range`);
   * the store's `Content-Range` is parsed and must describe exactly the window
   * asked for, so a store that ignored the range cannot make the API label a
   * full body as a slice.
   */
  async getObjectStream(key: string, range?: ObjectByteRange): Promise<ObjectStream> {
    assertSafeObjectKey(key);
    const config = this.getConfig();

    if (range && (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < 0 || range.end < range.start)) {
      throw new RangeError('Invalid object byte range');
    }

    const result = await this.getClient().send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
      }),
    );

    if (!result.Body) {
      throw new ServiceUnavailableException({
        code: 'STORAGE_EMPTY_BODY',
        reason: 'Object storage returned no content.',
      });
    }

    let contentRange: ObjectStream['contentRange'];
    if (range) {
      const parsed = parseStoredContentRange(result.ContentRange);
      if (!parsed || parsed.start !== range.start || parsed.end !== range.end) {
        (result.Body as Readable).destroy();
        throw new ServiceUnavailableException({
          code: 'STORAGE_RANGE_NOT_HONOURED',
          reason: 'Object storage did not return the requested byte range.',
        });
      }
      contentRange = parsed;
    }

    return {
      contentLength: result.ContentLength,
      contentRange,
      contentType: result.ContentType ?? 'application/octet-stream',
      stream: result.Body as Readable,
    };
  }

  /**
   * Read-only inventory under the configured prefix: object count and total
   * bytes (B06 storage capacity alert). Pages through the bucket up to
   * `maxPages` × 1000 keys; `truncated` says whether the cap was reached.
   */
  async countObjects(maxPages = 200): Promise<{ objects: number; bytes: number; truncated: boolean }> {
    let objects = 0;
    let bytes = 0;
    const truncated = await this.walkObjects(maxPages, (item) => {
      objects += 1;
      bytes += item.size;
    });
    return { objects, bytes, truncated };
  }

  /**
   * Read-only listing under the configured prefix (C07 reconciliation): key,
   * size and last-modified of every object, in the store's key order. The
   * result stays inside the API — it feeds a comparison with the database and
   * is never serialised into a response or a notice.
   */
  async listObjects(maxPages = 200): Promise<{ objects: StoredObjectSummary[]; truncated: boolean }> {
    const objects: StoredObjectSummary[] = [];
    const truncated = await this.walkObjects(maxPages, (item) => {
      objects.push(item);
    });
    return { objects, truncated };
  }

  /** Pages through ListObjectsV2 under the prefix; returns true when `maxPages` was reached before the end. */
  private async walkObjects(maxPages: number, onItem: (item: StoredObjectSummary) => void): Promise<boolean> {
    const config = this.getConfig();
    let token: string | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      const out = await this.getClient().send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          ...(config.keyPrefix ? { Prefix: config.keyPrefix } : {}),
          ...(token ? { ContinuationToken: token } : {}),
        }),
      );
      for (const item of out.Contents ?? []) {
        if (typeof item.Key !== 'string') continue;
        onItem({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified ?? null });
      }
      if (!out.IsTruncated || !out.NextContinuationToken) return false;
      token = out.NextContinuationToken;
    }
    return true;
  }

  /** True when the object exists. Used by health and integrity checks. */
  async objectExists(key: string): Promise<boolean> {
    assertSafeObjectKey(key);
    const config = this.getConfig();

    try {
      await this.getClient().send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Deletes an object. Failures are surfaced to the caller, never swallowed. */
  async deleteObject(key: string): Promise<void> {
    assertSafeObjectKey(key);
    const config = this.getConfig();

    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  }
}
