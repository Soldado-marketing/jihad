import 'server-only';

import nodemailer from 'nodemailer';

import { getEnv, isSmtpConfigured } from '@/lib/env';
import { retryAsync } from '@/lib/services/retry';
import type { ReviewEmailPayload } from '@/lib/types';
import { joinHashtags } from '@/lib/utils';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const env = getEnv();

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  });

  return transporter;
}

export async function sendReviewEmail(payload: ReviewEmailPayload) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured. Review email cannot be sent.');
  }

  const env = getEnv();
  const arabicCid = `arabic-${payload.post.id}@sh-investments`;
  const germanCid = `german-${payload.post.id}@sh-investments`;

  const subject = `SH Investments review: ${payload.post.topicTitle}`;

  const html = `
    <div style="background:#070f26;padding:32px;font-family:Arial,sans-serif;color:#fcfcfc;">
      <div style="max-width:760px;margin:0 auto;background:#2a2952;border-radius:28px;padding:32px;border:1px solid rgba(249,202,141,0.25);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f9ca8d;">SH Investments review package</p>
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;color:#fcfcfc;">${escapeHtml(
          payload.post.topicTitle,
        )}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(252,252,252,0.82);">
          Please review both language versions. Approve when the content and design are ready, or request changes with feedback.
        </p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;">
          <a href="${payload.approveUrl}" style="background:#f9ca8d;color:#070f26;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;">APPROVE</a>
          <a href="${payload.reviewUrl}" style="background:transparent;color:#fcfcfc;text-decoration:none;padding:14px 22px;border-radius:999px;border:1px solid rgba(252,252,252,0.28);font-weight:700;">REQUEST CHANGES</a>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:20px;margin:0 0 12px;color:#f9ca8d;">Arabic post</h2>
          <img src="cid:${arabicCid}" alt="Arabic SH Investments post" style="width:100%;max-width:360px;border-radius:18px;border:1px solid rgba(249,202,141,0.25);display:block;" />
          <p style="margin:16px 0 8px;font-size:14px;line-height:1.7;color:#fcfcfc;"><strong>Caption:</strong><br />${escapeHtml(
            payload.post.arabicContent?.caption || '',
          ).replace(/\n/g, '<br />')}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#fcfcfc;"><strong>Hashtags:</strong><br />${escapeHtml(
            joinHashtags(payload.post.arabicContent?.hashtags || []),
          )}</p>
        </div>

        <div style="margin-bottom:8px;">
          <h2 style="font-size:20px;margin:0 0 12px;color:#f9ca8d;">German post</h2>
          <img src="cid:${germanCid}" alt="German SH Investments post" style="width:100%;max-width:360px;border-radius:18px;border:1px solid rgba(249,202,141,0.25);display:block;" />
          <p style="margin:16px 0 8px;font-size:14px;line-height:1.7;color:#fcfcfc;"><strong>Caption:</strong><br />${escapeHtml(
            payload.post.germanContent?.caption || '',
          ).replace(/\n/g, '<br />')}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#fcfcfc;"><strong>Hashtags:</strong><br />${escapeHtml(
            joinHashtags(payload.post.germanContent?.hashtags || []),
          )}</p>
        </div>
      </div>
    </div>
  `;

  return retryAsync(async () => {
    return getTransporter().sendMail({
      from: `"${env.SMTP_FROM_NAME || 'SH Investments Workflow'}" <${env.SMTP_FROM_EMAIL}>`,
      to: payload.reviewerEmail,
      subject,
      html,
      attachments: [
        {
          filename: 'arabic-post.png',
          content: payload.arabicImage,
          cid: arabicCid,
        },
        {
          filename: 'german-post.png',
          content: payload.germanImage,
          cid: germanCid,
        },
      ],
    });
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
