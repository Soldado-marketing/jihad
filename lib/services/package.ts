import 'server-only';

import archiver from 'archiver';
import { PassThrough } from 'node:stream';

import { manualPublishingChecklist } from '@/lib/brand';
import { getLatestAssetForPost } from '@/lib/repositories/assets';
import { getPostById } from '@/lib/repositories/posts';
import { readAssetBuffer, storeAsset } from '@/lib/services/assets';
import { logEvent } from '@/lib/services/logging';
import { joinHashtags, slugify } from '@/lib/utils';

export async function createManualPublishingPackage(postId: string) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  if (!post.arabicContent || !post.germanContent) {
    throw new Error('Post content is incomplete.');
  }

  const arabicContent = post.arabicContent;
  const germanContent = post.germanContent;

  const arabicDesign = getLatestAssetForPost(postId, 'generated_ar');
  const germanDesign = getLatestAssetForPost(postId, 'generated_de');

  if (!arabicDesign || !germanDesign) {
    throw new Error('Generate designs before creating the manual package.');
  }

  const [arabicImage, germanImage] = await Promise.all([
    readAssetBuffer(arabicDesign.id),
    readAssetBuffer(germanDesign.id),
  ]);

  const zipBuffer = await createZipBuffer(async (archive) => {
    archive.append(arabicImage, { name: 'arabic-post.png' });
    archive.append(germanImage, { name: 'german-post.png' });
    archive.append(
      buildCaptionFile(arabicContent.caption, arabicContent.hashtags),
      {
        name: 'arabic-caption.txt',
      },
    );
    archive.append(
      buildCaptionFile(germanContent.caption, germanContent.hashtags),
      {
        name: 'german-caption.txt',
      },
    );
    archive.append(
      [
        'Arabic hashtags',
        joinHashtags(arabicContent.hashtags),
        '',
        'German hashtags',
        joinHashtags(germanContent.hashtags),
        '',
      ].join('\n'),
      { name: 'hashtags.txt' },
    );
    archive.append(manualPublishingChecklist.join('\n'), {
      name: 'publishing-checklist.txt',
    });
  });

  const packageAsset = await storeAsset({
    postId,
    kind: 'package',
    filename: `${slugify(post.topicTitle) || 'weekly-post'}-manual-package.zip`,
    buffer: zipBuffer,
    mimeType: 'application/zip',
    metadata: {
      contains: [
        'arabic-post.png',
        'german-post.png',
        'arabic-caption.txt',
        'german-caption.txt',
        'hashtags.txt',
        'publishing-checklist.txt',
      ],
    },
  });

  await logEvent({
    postId,
    scope: 'package',
    message: 'Created manual publishing package.',
    details: {
      packageAssetId: packageAsset?.id,
    },
  });

  return packageAsset;
}

async function createZipBuffer(
  populate: (archive: archiver.Archiver) => Promise<void> | void,
) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const completion = new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    stream.on('error', reject);
  });

  archive.pipe(stream);
  await populate(archive);
  await archive.finalize();

  return completion;
}

function buildCaptionFile(caption: string, hashtags: string[]) {
  return [caption.trim(), '', joinHashtags(hashtags)].join('\n');
}
