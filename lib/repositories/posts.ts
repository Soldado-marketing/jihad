import 'server-only';

import { getDb } from '@/lib/db/client';
import type {
  LanguageContent,
  PostRecord,
  PostSourceType,
  PostSummary,
  WorkflowStatus,
} from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';

type PostRow = {
  id: string;
  source_type: PostSourceType;
  source_message_id: string | null;
  source_subject: string | null;
  source_from: string | null;
  source_received_at: string | null;
  topic_title: string;
  topic_notes: string;
  language_hints: string;
  hero_asset_id: string | null;
  status: WorkflowStatus;
  arabic_content_json: string | null;
  german_content_json: string | null;
  review_comment: string | null;
  reviewer_email: string | null;
  approval_token: string;
  review_requested_at: string | null;
  reviewed_at: string | null;
  ready_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapPost(row: PostRow): PostRecord {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceMessageId: row.source_message_id,
    sourceSubject: row.source_subject,
    sourceFrom: row.source_from,
    sourceReceivedAt: row.source_received_at,
    topicTitle: row.topic_title,
    topicNotes: row.topic_notes,
    languageHints: row.language_hints,
    heroAssetId: row.hero_asset_id,
    status: row.status,
    arabicContent: safeJsonParse<LanguageContent | null>(row.arabic_content_json, null),
    germanContent: safeJsonParse<LanguageContent | null>(row.german_content_json, null),
    reviewComment: row.review_comment,
    reviewerEmail: row.reviewer_email,
    approvalToken: row.approval_token,
    reviewRequestedAt: row.review_requested_at,
    reviewedAt: row.reviewed_at,
    readyAt: row.ready_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type CreatePostInput = {
  id: string;
  sourceType: PostSourceType;
  sourceMessageId?: string | null;
  sourceSubject?: string | null;
  sourceFrom?: string | null;
  sourceReceivedAt?: string | null;
  topicTitle: string;
  topicNotes?: string;
  languageHints?: string;
  reviewerEmail?: string | null;
  approvalToken: string;
};

export function createPost(input: CreatePostInput) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO posts (
        id,
        source_type,
        source_message_id,
        source_subject,
        source_from,
        source_received_at,
        topic_title,
        topic_notes,
        language_hints,
        status,
        reviewer_email,
        approval_token,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @source_type,
        @source_message_id,
        @source_subject,
        @source_from,
        @source_received_at,
        @topic_title,
        @topic_notes,
        @language_hints,
        'draft',
        @reviewer_email,
        @approval_token,
        @created_at,
        @updated_at
      )
    `,
  ).run({
    id: input.id,
    source_type: input.sourceType,
    source_message_id: input.sourceMessageId ?? null,
    source_subject: input.sourceSubject ?? null,
    source_from: input.sourceFrom ?? null,
    source_received_at: input.sourceReceivedAt ?? null,
    topic_title: input.topicTitle,
    topic_notes: input.topicNotes ?? '',
    language_hints: input.languageHints ?? '',
    reviewer_email: input.reviewerEmail ?? null,
    approval_token: input.approvalToken,
    created_at: now,
    updated_at: now,
  });

  return getPostById(input.id);
}

export function getPostById(id: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM posts WHERE id = ?`)
    .get(id) as PostRow | undefined;

  return row ? mapPost(row) : null;
}

export function getPostByApprovalToken(token: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM posts WHERE approval_token = ?`)
    .get(token) as PostRow | undefined;

  return row ? mapPost(row) : null;
}

export function findPostByMessageId(messageId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM posts WHERE source_message_id = ?`)
    .get(messageId) as PostRow | undefined;

  return row ? mapPost(row) : null;
}

export function listPosts() {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT
          p.id,
          p.topic_title,
          p.source_type,
          p.source_from,
          p.source_subject,
          p.status,
          p.updated_at,
          p.review_comment,
          EXISTS(SELECT 1 FROM assets a WHERE a.post_id = p.id AND a.kind = 'generated_ar') AS has_arabic_design,
          EXISTS(SELECT 1 FROM assets a WHERE a.post_id = p.id AND a.kind = 'generated_de') AS has_german_design
        FROM posts p
        ORDER BY datetime(p.updated_at) DESC
      `,
    )
    .all() as Array<{
    id: string;
    topic_title: string;
    source_type: PostSourceType;
    source_from: string | null;
    source_subject: string | null;
    status: WorkflowStatus;
    updated_at: string;
    review_comment: string | null;
    has_arabic_design: 0 | 1;
    has_german_design: 0 | 1;
  }>;

  return rows.map(
    (row): PostSummary => ({
      id: row.id,
      topicTitle: row.topic_title,
      sourceType: row.source_type,
      sourceFrom: row.source_from,
      sourceSubject: row.source_subject,
      status: row.status,
      updatedAt: row.updated_at,
      reviewComment: row.review_comment,
      hasArabicDesign: Boolean(row.has_arabic_design),
      hasGermanDesign: Boolean(row.has_german_design),
    }),
  );
}

export function updatePostCore(
  id: string,
  input: {
    topicTitle?: string;
    topicNotes?: string;
    languageHints?: string;
    heroAssetId?: string | null;
    reviewerEmail?: string | null;
    reviewComment?: string | null;
    status?: WorkflowStatus;
    reviewRequestedAt?: string | null;
    reviewedAt?: string | null;
    readyAt?: string | null;
  },
) {
  const db = getDb();
  const current = getPostById(id);

  if (!current) {
    return null;
  }

  db.prepare(
    `
      UPDATE posts
      SET
        topic_title = @topic_title,
        topic_notes = @topic_notes,
        language_hints = @language_hints,
        hero_asset_id = @hero_asset_id,
        reviewer_email = @reviewer_email,
        review_comment = @review_comment,
        status = @status,
        review_requested_at = @review_requested_at,
        reviewed_at = @reviewed_at,
        ready_at = @ready_at,
        updated_at = @updated_at
      WHERE id = @id
    `,
  ).run({
    id,
    topic_title: input.topicTitle ?? current.topicTitle,
    topic_notes: input.topicNotes ?? current.topicNotes,
    language_hints: input.languageHints ?? current.languageHints,
    hero_asset_id:
      input.heroAssetId !== undefined ? input.heroAssetId : current.heroAssetId,
    reviewer_email:
      input.reviewerEmail !== undefined
        ? input.reviewerEmail
        : current.reviewerEmail,
    review_comment:
      input.reviewComment !== undefined
        ? input.reviewComment
        : current.reviewComment,
    status: input.status ?? current.status,
    review_requested_at:
      input.reviewRequestedAt !== undefined
        ? input.reviewRequestedAt
        : current.reviewRequestedAt,
    reviewed_at:
      input.reviewedAt !== undefined ? input.reviewedAt : current.reviewedAt,
    ready_at: input.readyAt !== undefined ? input.readyAt : current.readyAt,
    updated_at: new Date().toISOString(),
  });

  return getPostById(id);
}

export function updatePostContent(
  id: string,
  input: {
    arabicContent?: LanguageContent | null;
    germanContent?: LanguageContent | null;
  },
) {
  const db = getDb();
  const current = getPostById(id);

  if (!current) {
    return null;
  }

  db.prepare(
    `
      UPDATE posts
      SET
        arabic_content_json = @arabic_content_json,
        german_content_json = @german_content_json,
        updated_at = @updated_at
      WHERE id = @id
    `,
  ).run({
    id,
    arabic_content_json: JSON.stringify(
      input.arabicContent !== undefined ? input.arabicContent : current.arabicContent,
    ),
    german_content_json: JSON.stringify(
      input.germanContent !== undefined ? input.germanContent : current.germanContent,
    ),
    updated_at: new Date().toISOString(),
  });

  return getPostById(id);
}
