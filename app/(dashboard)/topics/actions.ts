'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getEnv } from '@/lib/env';
import { createPost, getPostById, updatePostContent, updatePostCore } from '@/lib/repositories/posts';
import { syncInboxTopics } from '@/lib/services/email-intake';
import { storeAsset } from '@/lib/services/assets';
import { logEvent } from '@/lib/services/logging';
import { createManualPublishingPackage } from '@/lib/services/package';
import { parseStructuredPostInput } from '@/lib/services/pasted-content';
import { sendCurrentPostForReview, generateContentAndDesign, regenerateDesignsOnly } from '@/lib/services/workflow';
import { createId, arrayBufferToBuffer, cleanMultilineInput, parseHashtags } from '@/lib/utils';

export async function createManualTopicAction(formData: FormData) {
  const topicTitle = String(formData.get('topicTitle') ?? '').trim();
  const topicNotes = cleanMultilineInput(String(formData.get('topicNotes') ?? ''));

  if (!topicTitle) {
    throw new Error('Topic title is required.');
  }

  const post = createPost({
    id: createId('post'),
    sourceType: 'manual',
    topicTitle,
    topicNotes,
    reviewerEmail: getEnv().REVIEWER_EMAIL || null,
    approvalToken: createId('review'),
  });

  await logEvent({
    postId: post!.id,
    scope: 'system',
    message: 'Created a manual topic draft from the dashboard.',
  });

  redirect(`/topics/${post!.id}`);
}

export async function syncInboxAction() {
  const result = await syncInboxTopics();

  await logEvent({
    scope: 'email_intake',
    message: 'Inbox sync finished.',
    details: result,
  });

  revalidatePath('/topics');
  redirect('/topics');
}

export async function updateTopicDetailsAction(postId: string, formData: FormData) {
  const topicTitle = String(formData.get('topicTitle') ?? '').trim();
  const topicNotes = cleanMultilineInput(String(formData.get('topicNotes') ?? ''));

  if (!topicTitle) {
    throw new Error('Topic title is required.');
  }

  updatePostCore(postId, {
    topicTitle,
    topicNotes,
  });

  await logEvent({
    postId,
    scope: 'system',
    message: 'Updated topic details.',
  });

  revalidatePath(`/topics/${postId}`);
}

export async function uploadReferenceAssetsAction(postId: string, formData: FormData) {
  const files = formData
    .getAll('references')
    .filter((value): value is File => value instanceof File && value.size > 0);

  for (const file of files) {
    const buffer = arrayBufferToBuffer(await file.arrayBuffer());

    await storeAsset({
      postId,
      kind: 'reference',
      filename: file.name,
      buffer,
      mimeType: file.type || 'application/octet-stream',
      metadata: {
        source: 'dashboard-upload',
      },
    });
  }

  await logEvent({
    postId,
    scope: 'storage',
    message: 'Uploaded new reference assets.',
    details: {
      count: files.length,
    },
  });

  revalidatePath(`/topics/${postId}`);
}

export async function uploadTopicVisualAssetsAction(postId: string, formData: FormData) {
  const files = formData
    .getAll('visuals')
    .filter((value): value is File => value instanceof File && value.size > 0);

  for (const file of files) {
    const buffer = arrayBufferToBuffer(await file.arrayBuffer());

    await storeAsset({
      postId,
      kind: 'attachment',
      filename: file.name,
      buffer,
      mimeType: file.type || 'application/octet-stream',
      metadata: {
        source: 'dashboard-topic-visual',
      },
    });
  }

  await logEvent({
    postId,
    scope: 'storage',
    message: 'Uploaded topic visual assets for direct use in design generation.',
    details: {
      count: files.length,
    },
  });

  revalidatePath(`/topics/${postId}`);
}

export async function selectHeroAssetAction(postId: string, formData: FormData) {
  const heroAssetId = String(formData.get('heroAssetId') ?? '').trim() || null;

  updatePostCore(postId, {
    heroAssetId,
  });

  revalidatePath(`/topics/${postId}`);
}

export async function saveGeneratedCopyAction(postId: string, formData: FormData) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  updatePostContent(postId, {
    arabicContent: {
      headline: String(formData.get('arHeadline') ?? '').trim(),
      paragraph: cleanMultilineInput(String(formData.get('arParagraph') ?? '')),
      supportingLines: [
        String(formData.get('arSupportingLine1') ?? '').trim(),
        String(formData.get('arSupportingLine2') ?? '').trim(),
      ].filter(Boolean),
      caption: cleanMultilineInput(String(formData.get('arCaption') ?? '')),
      hashtags: parseHashtags(String(formData.get('arHashtags') ?? '')),
    },
    germanContent: {
      headline: String(formData.get('deHeadline') ?? '').trim(),
      paragraph: cleanMultilineInput(String(formData.get('deParagraph') ?? '')),
      supportingLines: [
        String(formData.get('deSupportingLine1') ?? '').trim(),
        String(formData.get('deSupportingLine2') ?? '').trim(),
      ].filter(Boolean),
      caption: cleanMultilineInput(String(formData.get('deCaption') ?? '')),
      hashtags: parseHashtags(String(formData.get('deHashtags') ?? '')),
    },
  });

  await logEvent({
    postId,
    scope: 'content',
    message: 'Saved edited bilingual content from the dashboard.',
  });

  revalidatePath(`/topics/${postId}`);
}

export async function autofillGeneratedCopyAction(postId: string, formData: FormData) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  const arabicRaw = String(formData.get('arFullPost') ?? '').trim();
  const germanRaw = String(formData.get('deFullPost') ?? '').trim();

  if (!arabicRaw && !germanRaw) {
    redirect(`/topics/${postId}?error=paste_empty`);
  }

  updatePostContent(postId, {
    arabicContent: arabicRaw
      ? parseStructuredPostInput(arabicRaw)
      : post.arabicContent,
    germanContent: germanRaw
      ? parseStructuredPostInput(germanRaw)
      : post.germanContent,
  });

  await logEvent({
    postId,
    scope: 'content',
    message: 'Auto-filled bilingual fields from pasted long-form text.',
    details: {
      hasArabicPaste: Boolean(arabicRaw),
      hasGermanPaste: Boolean(germanRaw),
    },
  });

  revalidatePath(`/topics/${postId}`);
  redirect(`/topics/${postId}?success=autofill_ready`);
}

export async function regenerateAllAction(postId: string) {
  await generateContentAndDesign(postId);
  revalidatePath(`/topics/${postId}`);
}

export async function regenerateDesignsAction(postId: string) {
  await regenerateDesignsOnly(postId);
  revalidatePath(`/topics/${postId}`);
}

export async function sendForReviewAction(postId: string) {
  await sendCurrentPostForReview(postId);
  revalidatePath(`/topics/${postId}`);
}

export async function preparePackageAction(postId: string) {
  try {
    await createManualPublishingPackage(postId);
    revalidatePath(`/topics/${postId}`);
    redirect(`/topics/${postId}?success=package_ready`);
  } catch (error) {
    await logEvent({
      postId,
      scope: 'package',
      level: 'error',
      message: error instanceof Error ? error.message : 'Failed to prepare the publishing package.',
    });

    redirect(`/topics/${postId}?error=package_incomplete`);
  }
}
