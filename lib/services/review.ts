import 'server-only';

import { getAppBaseUrl, getEnv } from '@/lib/env';
import { getLatestAssetForPost } from '@/lib/repositories/assets';
import {
  getPostByApprovalToken,
  getPostById,
  updatePostCore,
} from '@/lib/repositories/posts';
import { readAssetBuffer } from '@/lib/services/assets';
import { sendReviewEmail } from '@/lib/services/email';
import { logEvent } from '@/lib/services/logging';
import { createManualPublishingPackage } from '@/lib/services/package';

export function buildReviewUrl(token: string) {
  return `${getAppBaseUrl()}/review/${token}`;
}

export function buildApproveUrl(token: string) {
  return `${getAppBaseUrl()}/review/${token}/approve`;
}

export async function sendPostForReview(postId: string) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  if (!post.arabicContent || !post.germanContent) {
    throw new Error('Generate content before sending review.');
  }

  const reviewerEmail = post.reviewerEmail || getEnv().REVIEWER_EMAIL;

  if (!reviewerEmail) {
    throw new Error('Reviewer email is not configured.');
  }

  const arabicAsset = getLatestAssetForPost(postId, 'generated_ar');
  const germanAsset = getLatestAssetForPost(postId, 'generated_de');

  if (!arabicAsset || !germanAsset) {
    throw new Error('Generate designs before sending review.');
  }

  const [arabicImage, germanImage] = await Promise.all([
    readAssetBuffer(arabicAsset.id),
    readAssetBuffer(germanAsset.id),
  ]);

  await sendReviewEmail({
    post,
    arabicImage,
    germanImage,
    reviewerEmail,
    approveUrl: buildApproveUrl(post.approvalToken),
    reviewUrl: buildReviewUrl(post.approvalToken),
  });

  updatePostCore(postId, {
    reviewerEmail,
    status: 'in_review',
    reviewRequestedAt: new Date().toISOString(),
    reviewComment: null,
    readyAt: null,
  });

  await logEvent({
    postId,
    scope: 'review',
    message: 'Review email sent to reviewer.',
    details: {
      reviewerEmail,
    },
  });
}

export async function approvePost(token: string) {
  const post = getPostByIdByTokenOrThrow(token);

  updatePostCore(post.id, {
    status: 'ready',
    reviewedAt: new Date().toISOString(),
    readyAt: new Date().toISOString(),
    reviewComment: null,
  });

  await createManualPublishingPackage(post.id);

  await logEvent({
    postId: post.id,
    scope: 'review',
    message: 'Reviewer approved the post.',
  });

  return getPostByIdByTokenOrThrow(token);
}

export async function requestPostChanges(token: string, comment: string) {
  const post = getPostByIdByTokenOrThrow(token);

  updatePostCore(post.id, {
    status: 'changes_requested',
    reviewedAt: new Date().toISOString(),
    reviewComment: comment.trim() || 'Reviewer requested changes.',
    readyAt: null,
  });

  await logEvent({
    postId: post.id,
    scope: 'review',
    message: 'Reviewer requested changes.',
    details: {
      comment,
    },
  });

  return getPostByIdByTokenOrThrow(token);
}

function getPostByIdByTokenOrThrow(token: string) {
  const post = getPostByApprovalToken(token);

  if (!post) {
    throw new Error('Review token is invalid.');
  }

  return post;
}
