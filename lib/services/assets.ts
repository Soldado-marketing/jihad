import 'server-only';

import { getAssetById, createAsset, listAssetsForPost } from '@/lib/repositories/assets';
import { uploadBufferToStorage, readBufferFromStorage } from '@/lib/services/storage';
import type { AssetKind } from '@/lib/types';
import { createId, slugify } from '@/lib/utils';

export async function storeAsset(input: {
  postId?: string | null;
  kind: AssetKind;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, unknown>;
}) {
  const assetId = createId('asset');
  const storageKey = buildStorageKey({
    postId: input.postId ?? null,
    kind: input.kind,
    filename: input.filename,
    assetId,
  });

  await uploadBufferToStorage({
    storageKey,
    buffer: input.buffer,
    contentType: input.mimeType,
  });

  return createAsset({
    id: assetId,
    postId: input.postId ?? null,
    kind: input.kind,
    filename: input.filename,
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    metadata: input.metadata,
  });
}

export async function readAssetBuffer(assetId: string) {
  const asset = getAssetById(assetId);

  if (!asset) {
    throw new Error('Asset not found.');
  }

  return readBufferFromStorage(asset.storageKey);
}

export function getPostAssets(postId: string) {
  return listAssetsForPost(postId);
}

function buildStorageKey(input: {
  postId: string | null;
  kind: AssetKind;
  filename: string;
  assetId: string;
}) {
  const sanitizedFilename = slugify(input.filename.replace(/\.[^.]+$/, '')) || 'asset';
  const extension = input.filename.includes('.')
    ? input.filename.split('.').pop()
    : 'bin';

  if (!input.postId) {
    return `shared/${input.kind}/${input.assetId}-${sanitizedFilename}.${extension}`;
  }

  return `posts/${input.postId}/${input.kind}/${input.assetId}-${sanitizedFilename}.${extension}`;
}
