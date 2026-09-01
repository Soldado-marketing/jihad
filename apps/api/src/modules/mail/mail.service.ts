import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly appUrl: string;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM ?? 'noreply@localhost';
    this.appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Mail service ready — SMTP ${host}:${port}`);
    } else {
      this.logger.warn(
        'Mail service not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email notifications.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Fire-and-forget: queues the email and returns immediately.
   * Errors are caught and logged; they never propagate to the caller.
   */
  private send(to: string, subject: string, text: string): void {
    if (!this.transporter) return;
    void this.transporter
      .sendMail({ from: this.from, to, subject, text })
      .catch((err: unknown) => {
        this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
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
   * this resolves with whether the message was actually handed to SMTP.
   * Returns false when mail is not configured; throws only on a real SMTP
   * failure, which the caller surfaces rather than swallowing.
   */
  async sendDocument(params: {
    to: string[];
    subject: string;
    text: string;
    attachment?: { filename: string; content: Buffer; contentType: string };
  }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('sendDocument skipped - SMTP is not configured.');
      return false;
    }

    const recipients = params.to.filter((address) => typeof address === 'string' && address.includes('@'));
    if (recipients.length === 0) {
      this.logger.warn('sendDocument skipped - no valid recipient.');
      return false;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: recipients.join(', '),
      subject: params.subject,
      text: params.text,
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
    this.logger.log(`document_email_sent recipients=${recipients.length}`);
    return true;
  }
}
