# SH Investments Social Workflow

Internal Next.js system for **SH Investments only**.

It receives weekly post topics by email, generates bilingual social media assets, sends them for review, and prepares a **manual publishing package only**.

The system does **not** auto-publish to Instagram, Facebook, or TikTok.

## What it does

1. Monitors an inbox for new topic emails when IMAP is configured.
2. Extracts the weekly topic, notes, sender metadata, and attachments.
3. Generates:
   - Arabic post copy (RTL)
   - German post copy (LTR)
   - Arabic PNG design `1080x1350`
   - German PNG design `1080x1350`
   - Captions and hashtags for both languages
4. Sends a review email with:
   - both PNGs
   - Arabic caption and hashtags
   - German caption and hashtags
   - `APPROVE` and `REQUEST CHANGES` actions
5. Waits for reviewer input.
6. After approval, creates a downloadable package for manual publishing.

## Manual publishing only

After approval, the workflow marks the post as **READY** and creates a ZIP package containing:

- `arabic-post.png`
- `german-post.png`
- `arabic-caption.txt`
- `german-caption.txt`
- `hashtags.txt`
- `publishing-checklist.txt`

This package is intended for manual publishing to:

- Instagram
- Facebook
- TikTok

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- SQLite via `better-sqlite3`
- SMTP via `nodemailer`
- IMAP via `imapflow`
- S3-compatible cloud storage via AWS SDK
- PNG generation via `sharp`
- Optional AI copy generation via OpenAI

## Project modules

- `email intake module`
  Reads inbound messages through IMAP and creates workflow topics.
- `content generation module`
  Generates Arabic and German copy using either `mock` mode or OpenAI.
- `design generation module`
  Renders reusable SH Investments branded PNG posts.
- `review email module`
  Sends reviewer emails over SMTP and exposes public review links.
- `dashboard module`
  Provides topic management, editing, previews, reference uploads, and status tracking.
- `export package module`
  Creates the final ZIP package for manual publishing.

## Design system notes

The generator is locked to SH Investments brand rules:

- Colors:
  - `#2a2952`
  - `#070f26`
  - `#f9ca8d`
  - `#dcaf73`
  - `#fcfcfc`
- German font:
  - `Belleza`
- Arabic font:
  - prefers `loew-next-arabic-medium` if you provide the licensed font file path
  - otherwise falls back to `Noto Sans Arabic` for local/dev rendering

Old posts are uploaded in the dashboard and kept as references for layout, spacing, hierarchy, and brand feel. They are not copied 1:1.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Fill the required values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Required external credentials

### Required for normal production use

- Dashboard credentials
  - `DASHBOARD_USERNAME`
  - `DASHBOARD_PASSWORD`
- Reviewer email
  - `REVIEWER_EMAIL`
- SMTP credentials for sending review emails
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`

### Required for automatic inbox monitoring

- IMAP credentials
  - `IMAP_HOST`
  - `IMAP_PORT`
  - `IMAP_USER`
  - `IMAP_PASSWORD`

Note: **SMTP alone cannot monitor inbound email**. If you want automatic email intake from `Info@SH-Investments.de`, IMAP access is required.

### Required for cloud storage

- S3-compatible storage values
  - `STORAGE_DRIVER=s3`
  - `STORAGE_BUCKET`
  - `STORAGE_REGION`
  - `STORAGE_ACCESS_KEY_ID`
  - `STORAGE_SECRET_ACCESS_KEY`
  - optional `STORAGE_ENDPOINT`

### Required for AI copy generation

- `CONTENT_PROVIDER=openai`
- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

### Optional but recommended

- `APP_BASE_URL`
  Needed for correct review links in email.
- `SCHEDULER_SECRET`
  Protects the inbox sync endpoint for cron or external schedulers.
- `SH_ARABIC_FONT_FILE`
  Path to the licensed `loew-next-arabic-medium` font file.

## Local testing

The fastest local test path is:

1. Set:
   - `CONTENT_PROVIDER=mock`
   - `STORAGE_DRIVER=local`
2. Leave IMAP empty if you do not want inbox testing yet.
3. Configure SMTP if you want to test review email end-to-end.
4. Run the app:

```bash
npm run dev
```

5. Sign in with the configured dashboard credentials.
6. Create a manual topic from the `Topics` page.
7. Upload reference images in the topic detail page.
8. Click:
   - `Regenerate content + designs`
   - `Send reviewer email`
9. Open the reviewer link and either:
   - approve
   - request changes
10. Download the final package from the topic page.

## Testing commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Inbox sync endpoint

Use this route from a scheduler or secure webhook:

```text
POST /api/system/email-intake
Header: x-scheduler-secret: <SCHEDULER_SECRET>
```

## Workflow status meanings

- `Draft`
  Topic exists but has not been sent for review yet.
- `In Review`
  Reviewer email was sent and the system is waiting for a decision.
- `Changes Requested`
  Reviewer requested edits and included feedback.
- `Ready`
  Reviewer approved the post and the package is ready for manual publishing.

## File storage behavior

- Uploaded references
  Stored as workflow reference assets.
- Email attachments
  Stored and optionally used as design hero images.
- Generated PNGs
  Stored per post in the configured storage backend.
- Final ZIP package
  Generated and stored after approval or on-demand from the dashboard.

## Notes for production

- Keep SMTP, IMAP, storage, and AI secrets in environment variables only.
- For production review links, set `APP_BASE_URL` to the deployed HTTPS URL.
- For cloud deployments, use S3-compatible storage instead of local storage.
- For scheduled inbox intake, call the protected email intake route from cron or an automation tool.
