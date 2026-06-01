import 'server-only';

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { getEnv, isImapConfigured } from '@/lib/env';
import { createPost, findPostByMessageId } from '@/lib/repositories/posts';
import { storeAsset } from '@/lib/services/assets';
import { generateContentAndDesign, sendCurrentPostForReview } from '@/lib/services/workflow';
import { logEvent } from '@/lib/services/logging';
import type { InboxSyncResult } from '@/lib/types';
import {
  createId,
  inferMimeType,
  truncate,
} from '@/lib/utils';

export async function syncInboxTopics(): Promise<InboxSyncResult> {
  if (!isImapConfigured()) {
    throw new Error(
      'IMAP is not configured. SMTP handles sending only; inbox monitoring requires IMAP credentials.',
    );
  }

  const env = getEnv();
  const client = new ImapFlow({
    host: env.IMAP_HOST!,
    port: Number(env.IMAP_PORT || 993),
    secure: env.IMAP_SECURE !== 'false',
    auth: {
      user: env.IMAP_USER!,
      pass: env.IMAP_PASSWORD!,
    },
    logger: false,
  });

  let importedCount = 0;
  let skippedCount = 0;
  let generatedCount = 0;
  const postIds: string[] = [];

  await client.connect();
  const lock = await client.getMailboxLock(env.IMAP_MAILBOX || 'INBOX');

  try {
    const messageUids = (await client.search({ seen: false }, { uid: true })) || [];
    const lookbackLimit = Number(env.IMAP_LOOKBACK_LIMIT || 20);
    const relevantUids = messageUids.slice(-lookbackLimit);

    for await (const message of client.fetch(
      relevantUids,
      {
        uid: true,
        envelope: true,
        source: true,
        internalDate: true,
      },
      { uid: true },
    )) {
      const sourceBuffer = message.source;

      if (!sourceBuffer) {
        skippedCount += 1;
        continue;
      }

      const parsed = await simpleParser(sourceBuffer);
      const messageId =
        parsed.messageId || message.envelope?.messageId || `uid-${message.uid}`;

      if (findPostByMessageId(messageId)) {
        skippedCount += 1;
        continue;
      }

      const { topicTitle, topicNotes, languageHints } = extractTopicDetails({
        subject: parsed.subject || message.envelope?.subject || '',
        bodyText: parsed.text || parsed.html || '',
      });

      const post = createPost({
        id: createId('post'),
        sourceType: 'email',
        sourceMessageId: messageId,
        sourceSubject: parsed.subject || message.envelope?.subject || null,
        sourceFrom: parsed.from?.text || null,
        sourceReceivedAt:
          toIsoString(parsed.date) ||
          toIsoString(message.internalDate) ||
          new Date().toISOString(),
        topicTitle,
        topicNotes,
        languageHints,
        reviewerEmail: env.REVIEWER_EMAIL || null,
        approvalToken: createId('review'),
      });

      importedCount += 1;
      postIds.push(post!.id);

      if (parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          await storeAsset({
            postId: post!.id,
            kind: 'attachment',
            filename: attachment.filename || `attachment-${Date.now()}`,
            buffer:
              attachment.content instanceof Buffer
                ? attachment.content
                : Buffer.from(attachment.content),
            mimeType:
              attachment.contentType || inferMimeType(attachment.filename || 'file.bin'),
            metadata: {
              size: attachment.size || 0,
            },
          });
        }
      }

      await logEvent({
        postId: post!.id,
        scope: 'email_intake',
        message: 'Imported topic from inbox.',
        details: {
          subject: parsed.subject || null,
          from: parsed.from?.text || null,
          attachments: parsed.attachments.length,
        },
      });

      try {
        await generateContentAndDesign(post!.id);
        await sendCurrentPostForReview(post!.id);
        generatedCount += 1;
      } catch (error) {
        await logEvent({
          postId: post!.id,
          scope: 'email_intake',
          level: 'error',
          message: 'Imported the email but automatic generation did not finish.',
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return {
    importedCount,
    skippedCount,
    generatedCount,
    postIds,
  };
}

function extractTopicDetails(input: { subject: string; bodyText: string }) {
  const normalizedSubject = input.subject.trim();
  const normalizedBody = input.bodyText.replace(/\r/g, '').trim();

  const lines = normalizedBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const topicLine =
    lines.find((line) =>
      /^(topic|title|thema|titel|عنوان|الموضوع)\s*:/i.test(line),
    ) || '';

  const explicitTopic = topicLine.split(':').slice(1).join(':').trim();
  const topicTitle = explicitTopic || normalizedSubject || lines[0] || 'Weekly social post';
  const topicNotes = truncate(
    lines
      .filter((line) => line !== topicLine)
      .slice(0, 8)
      .join('\n'),
    1200,
  );

  const languageHints = [
    /arabic|العربية/i.test(normalizedBody) ? 'Arabic requested' : null,
    /german|deutsch|الألمانية/i.test(normalizedBody) ? 'German requested' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    topicTitle,
    topicNotes,
    languageHints,
  };
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}
