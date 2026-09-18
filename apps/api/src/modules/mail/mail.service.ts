import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { promises as dns } from 'node:dns';

/**
 * How long a resolved SMTP address is reused before it is looked up again.
 * Short enough that a provider changing address recovers on its own without a
 * redeploy; long enough that a burst of mail costs one lookup.
 */
const ADDRESS_TTL_MS = 5 * 60 * 1000;

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtp: SmtpSettings | null = null;
  private readonly appUrl: string;
  private readonly from: string;

  /** Cached transport, rebuilt when its pinned address goes stale. */
  private transporter: Transporter | null = null;
  private transportExpiresAt = 0;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM ?? 'noreply@localhost';
    // Every link in an email is built from this. APP_URL is honoured when set,
    // but production only ever defines WEB_URL, so without the second fallback
    // a configured mailer would send real recipients links to localhost. The
    // chain mirrors the one main.ts already uses for CORS.
    this.appUrl = (process.env.APP_URL ?? process.env.WEB_URL ?? 'http://localhost:3000')
      .replace(/\/$/, '');

    if (host && user && pass) {
      this.smtp = { host, pass, port, user };
      this.logger.log(`Mail service ready — SMTP ${host}:${port}`);
    } else {
      this.logger.warn(
        'Mail service not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email notifications.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.smtp !== null;
  }

  /**
   * Resolves the SMTP host to an IPv4 address.
   *
   * Nodemailer 9 resolves A and AAAA itself, concatenates them, and then picks
   * one AT RANDOM (lib/shared/index.js, formatDNSValue). On a host with both
   * records that is a coin flip per connection, and the Railway container has an
   * IPv6 interface but no route off it, so roughly half of all sends died with
   * ENETUNREACH before TLS. Handing nodemailer an address makes its resolver
   * short-circuit, which is the only way to steer the choice: the transport
   * takes no family option, and --dns-result-order does not apply because
   * nodemailer calls dns.resolve4/resolve6 rather than dns.lookup.
   */
  private async resolveIpv4(host: string): Promise<string> {
    const addresses = await dns.resolve4(host);
    if (addresses.length === 0) {
      throw new Error('SMTP host has no IPv4 address');
    }
    return addresses[0];
  }

  /**
   * Returns a transport pinned to a current IPv4 address, building one when the
   * cached address has expired.
   *
   * servername carries the original hostname so TLS still validates the
   * certificate against the name, not the address — pinning the connection must
   * not weaken the certificate check.
   */
  private async getTransport(): Promise<Transporter | null> {
    if (!this.smtp) return null;
    if (this.transporter && Date.now() < this.transportExpiresAt) return this.transporter;

    const address = await this.resolveIpv4(this.smtp.host);

    // servername is set in both places on purpose: SMTPConnection seeds SNI from
    // options.servername (it cannot infer it once host is an IP literal), and the
    // tls block is what reaches tls.connect for an implicit-TLS port. The type
    // does not declare the top-level field, hence the intersection.
    const options: SMTPTransport.Options & { servername: string } = {
      auth: { pass: this.smtp.pass, user: this.smtp.user },
      host: address,
      port: this.smtp.port,
      secure: this.smtp.port === 465,
      servername: this.smtp.host,
      tls: { servername: this.smtp.host },
    };

    this.transporter = nodemailer.createTransport(options);
    this.transportExpiresAt = Date.now() + ADDRESS_TTL_MS;

    // The address is not logged: it is infrastructure detail tied to a credential.
    this.logger.log('smtp_transport_pinned_ipv4');
    return this.transporter;
  }

  /**
   * Fire-and-forget: queues the email and returns immediately.
   * Errors are caught and logged; they never propagate to the caller.
   */
  private send(to: string, subject: string, text: string): void {
    if (!this.smtp) return;
    void this.getTransport()
      .then((transport) => transport?.sendMail({ from: this.from, to, subject, text }))
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
    if (!this.smtp) {
      this.logger.warn('sendDocument skipped - SMTP is not configured.');
      return false;
    }

    const recipients = params.to.filter((address) => typeof address === 'string' && address.includes('@'));
    if (recipients.length === 0) {
      this.logger.warn('sendDocument skipped - no valid recipient.');
      return false;
    }

    const transport = await this.getTransport();
    if (!transport) return false;

    await transport.sendMail({
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
