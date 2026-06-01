import 'server-only';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { getEnv, getStorageDriver, isS3Configured } from '@/lib/env';
import type { StorageUploadResult } from '@/lib/types';

let s3Client: S3Client | null = null;

function getLocalStorageDir() {
  const env = getEnv();
  return path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR || './storage');
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const env = getEnv();

  s3Client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === 'true',
    credentials:
      env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  return s3Client;
}

async function readStreamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function uploadBufferToStorage(input: {
  storageKey: string;
  buffer: Buffer;
  contentType: string;
}) {
  const driver = getStorageDriver();

  if (driver === 's3') {
    if (!isS3Configured()) {
      throw new Error('S3 storage is selected but credentials are incomplete.');
    }

    const env = getEnv();

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: input.storageKey,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    return {
      storageKey: input.storageKey,
    } satisfies StorageUploadResult;
  }

  const targetPath = path.join(getLocalStorageDir(), input.storageKey);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, input.buffer);

  return {
    storageKey: input.storageKey,
  } satisfies StorageUploadResult;
}

export async function readBufferFromStorage(storageKey: string) {
  const driver = getStorageDriver();

  if (driver === 's3') {
    const env = getEnv();
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
      }),
    );

    const body = response.Body;

    if (!(body instanceof Readable)) {
      throw new Error('Could not read S3 object body.');
    }

    return readStreamToBuffer(body);
  }

  const targetPath = path.join(getLocalStorageDir(), storageKey);
  return fs.readFile(targetPath);
}
