import 'server-only';

import { generateBilingualContent } from '@/lib/services/content';
import { generateDesignAssets } from '@/lib/services/design';
import { logEvent } from '@/lib/services/logging';
import { sendPostForReview } from '@/lib/services/review';
import { getPostById, updatePostContent, updatePostCore } from '@/lib/repositories/posts';

export async function generateContentAndDesign(postId: string) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  const generated = await generateBilingualContent({
    topic: post.topicTitle,
    notes: post.topicNotes,
    sourceFrom: post.sourceFrom,
    sourceSubject: post.sourceSubject,
    languageHints: post.languageHints,
  });

  updatePostContent(postId, {
    arabicContent: generated.arabic,
    germanContent: generated.german,
  });

  await logEvent({
    postId,
    scope: 'content',
    message: 'Generated bilingual post content.',
  });

  await generateDesignAssets(postId);

  updatePostCore(postId, {
    status: 'draft',
    reviewComment: null,
    readyAt: null,
  });
}

export async function sendCurrentPostForReview(postId: string) {
  await sendPostForReview(postId);
}

export async function regenerateDesignsOnly(postId: string) {
  const post = getPostById(postId);

  if (!post?.arabicContent || !post?.germanContent) {
    throw new Error('Generate content before regenerating designs.');
  }

  await generateDesignAssets(postId);
}

export async function regenerateAllAndSendReview(postId: string) {
  await generateContentAndDesign(postId);
  await sendPostForReview(postId);
}
