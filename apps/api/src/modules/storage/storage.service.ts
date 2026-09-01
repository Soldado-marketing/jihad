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
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { assertSafeObjectKey } from './object-key';
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
  contentLength?: number;
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

  /** Opens a read stream for an object. The stream is piped straight to the response. */
  async getObjectStream(key: string): Promise<ObjectStream> {
    assertSafeObjectKey(key);
    const config = this.getConfig();

    const result = await this.getClient().send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );

    if (!result.Body) {
      throw new ServiceUnavailableException({
        code: 'STORAGE_EMPTY_BODY',
        reason: 'Object storage returned no content.',
      });
    }

    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType ?? 'application/octet-stream',
      stream: result.Body as Readable,
    };
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
