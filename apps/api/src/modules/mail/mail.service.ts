import { Injectable, Logger } from '@nestjs/common';

/**
 * The only sender MAOS may use. This is an owner decision, not configuration:
 * the address is fixed in code so no environment variable can make production
 * send as someone else. soldado-marketing.de is verified in Resend (DKIM and
 * the send.* Return-Path), so mail from this address aligns with DMARC.
 */
export const MAIL_FROM = 'no-reply@soldado-marketing.de';

/**
 * Resend's HTTPS endpoint. Railway's Hobby plan blocks outbound SMTP on every
 * port, so mail leaves over 443 instead of through an SMTP relay.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Upper bound on one send, so a hung request cannot hold an invoice action open. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Longest provider error text carried into a log line or an exception. */
const MAX_ERROR_DETAIL = 200;

interface OutgoingAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface OutgoingMessage {
  to: string[];
  subject: string;
  text: string;
  attachments?: OutgoingAttachment[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | null;
  private readonly appUrl: string;

  constructor() {
    const key = process.env.RESEND_API_KEY?.trim();
    this.apiKey = key ? key : null;
    // Every link in an email is built from this. APP_URL is honoured when set,
    // but production only ever defines WEB_URL, so without the second fallback
    // a configured mailer would send real recipients links to localhost. The
    // chain mirrors the one main.ts already uses for CORS.
    this.appUrl = (process.env.APP_URL ?? process.env.WEB_URL ?? 'http://localhost:3000')
      .replace(/\/$/, '');

    if (this.apiKey) {
      this.logger.log('Mail service ready - Resend');
    } else {
      this.logger.warn('Mail service not configured - set RESEND_API_KEY to enable email.');
    }
  }

  /** True only when a Resend API key is present. Without one nothing is sent. */
  get isConfigured(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Hands one message to Resend and resolves with Resend's message id.
   *
   * Throws on a missing key, a network failure, a timeout, or any non-2xx
   * answer. Error text carries the HTTP status and Resend's own name/message
   * fields only - never the request headers, so the key cannot leak into a log.
   */
  private async deliver(message: OutgoingMessage): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Mail service is not configured');
    }

    const body = {
      from: MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString('base64'),
        content_type: attachment.contentType,
      })),
    };

    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.name : 'UnknownError';
      throw new Error(`Resend request failed: ${reason}`);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const payload = (await response.json()) as { name?: unknown; message?: unknown };
        detail = [payload.name, payload.message]
          .filter((value): value is string => typeof value === 'string')
          .join(': ')
          .slice(0, MAX_ERROR_DETAIL);
      } catch {
        // A non-JSON error body adds nothing the status code does not already say.
      }
      throw new Error(`Resend rejected the message (HTTP ${response.status})${detail ? ` ${detail}` : ''}`);
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: unknown };
    return typeof payload.id === 'string' ? payload.id : '';
  }

  /**
   * Fire-and-forget: queues the email and returns immediately.
   * Errors are caught and logged; they never propagate to the caller.
   * Recipient addresses are not logged: they are personal data.
   */
  private send(to: string, subject: string, text: string): void {
    if (!this.apiKey) {
      this.logger.warn('notification_email_skipped reason=not_configured');
      return;
    }
    void this.deliver({ subject, text, to: [to] })
      .then((id) => this.logger.log(`notification_email_sent id=${id}`))
      .catch((err: unknown) => {
        this.logger.error(`notification_email_failed ${err instanceof Error ? err.message : 'unknown error'}`);
      });
  }

  /** Notify the tenant OWNER that a new registration request is pending review. */
  notifyOwnerNewRequest(params: {
    ownerEmail: string;
    requesterName: string;
    requesterEmail: string;
    requestedRole: string;
    tenantSlug: string;
  }): void {
    const reviewUrl = `${this.appUrl}/dashboard/admin/users/requests`;
    const text = [
      'A new account request has been submitted and is waiting for your approval.',
      '',
      `Name:           ${params.requesterName}`,
      `Email:          ${params.requesterEmail}`,
      `Requested role: ${params.requestedRole}`,
      `Organization:   ${params.tenantSlug}`,
      '',
      'Review the request here:',
      reviewUrl,
    ].join('\n');

    this.send(params.ownerEmail, 'New access request pending approval', text);
  }

  /** Notify the requester that their account was approved. */
  sendApprovalEmail(params: { to: string; name: string }): void {
    const loginUrl = `${this.appUrl}/auth/login`;
    const text = [
      `Hello ${params.name},`,
      '',
      'Your account request has been approved. You can now sign in using your registered email and password.',
      '',
      'Sign in here:',
      loginUrl,
      '',
      'If you did not request an account, please ignore this email.',
    ].join('\n');

    this.send(params.to, 'Your account has been approved', text);
  }

  /** Notify the requester that their account request was not approved. */
  sendRejectionEmail(params: { to: string; name: string }): void {
    const text = [
      `Hello ${params.name},`,
      '',
      'Thank you for your interest. After review, your account request could not be approved at this time.',
      '',
      'If you believe this is an error, please contact your organization administrator.',
    ].join('\n');

    this.send(params.to, 'Your account request was not approved', text);
  }

  /**
   * Phase 4 - awaitable send with an optional attachment.
   *
   * Unlike the fire-and-forget send() used for notifications, an invoice send
   * is a business action the caller must be able to report on truthfully, so
   * this resolves with whether the message was actually accepted by Resend.
   * Returns false when mail is not configured; throws only on a real delivery
   * failure, which the caller surfaces rather than swallowing.
   */
  async sendDocument(params: {
    to: string[];
    subject: string;
    text: string;
    attachment?: { filename: string; content: Buffer; contentType: string };
  }): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('sendDocument skipped - RESEND_API_KEY is not configured.');
      return false;
    }

    const recipients = params.to.filter((address) => typeof address === 'string' && address.includes('@'));
    if (recipients.length === 0) {
      this.logger.warn('sendDocument skipped - no valid recipient.');
      return false;
    }

    const id = await this.deliver({
      subject: params.subject,
      text: params.text,
      to: recipients,
      attachments: params.attachment
        ? [
            {
              filename: params.attachment.filename,
              content: params.attachment.content,
              contentType: params.attachment.contentType,
            },
          ]
        : undefined,
    });

    // Recipient addresses are not logged: they are personal data.
    this.logger.log(`document_email_sent recipients=${recipients.length} id=${id}`);
    return true;
  }
}
