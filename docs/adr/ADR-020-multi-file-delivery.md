# ADR-020: Deliveries with several files and message-only deliveries (D05)

Status: Proposed (owner decision O34; schema-gated)

## Status

Proposed on 2026-11-03 for the master plan row D05. Nothing is implemented; no migration exists.

## Context

A delivery is an `ApprovalRequest` on exactly one file version (`fileAssetId`, `fileVersionId`), created by `DeliveriesService.submit` (#128, #131). Clients review one file per delivery and reply per round. Agencies often hand over a set (three reels, a PDF and a cover image) that the client should approve as one package, and sometimes need to send a message to the client without a new upload ("the filming date moved; please confirm").

## Decision options

1. **Join table `ApprovalRequestFile`** (one row per file version in the delivery), keeping `ApprovalRequest.fileAssetId/fileVersionId` as the first file for every existing reader; `fileAssetId` nullable (already nullable) allows a message-only delivery.
2. Make the client UI group several single-file deliveries into one "package" by a shared key. No schema, but N approvals, N reminders and N decisions for one package; inconsistent partial states.
3. A new `Delivery` aggregate above `ApprovalRequest`. A second delivery system — forbidden by Blueprint §28.

## Decision (proposed)

Option 1.

```prisma
model ApprovalRequestFile {
  id                String   @id @default(cuid())
  tenantId          String
  approvalRequestId String
  fileAssetId       String
  fileVersionId     String
  position          Int      @default(0)
  tenant            Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  approvalRequest   ApprovalRequest @relation(fields: [approvalRequestId], references: [id], onDelete: Cascade)
  fileAsset         FileAsset       @relation(fields: [fileAssetId], references: [id], onDelete: Cascade)
  fileVersion       FileVersion     @relation(fields: [fileVersionId], references: [id], onDelete: Cascade)
  @@unique([approvalRequestId, fileVersionId])
  @@index([tenantId, approvalRequestId])
}
```

- `submit` accepts `files: [{ fileAssetId, fileVersionId }]` (1–20) or none with a required `message`; every file must belong to the same project/client scope (the composite checks of today, applied per file) and pass `clientReleaseCheck`.
- `ApprovalRequest.fileAssetId/fileVersionId` keep the first file so the dashboard, the client list, notifications and `assertClientMayRead` (which allows versions under review or approved) work unchanged; `isUnderClientReview`/`hasApprovedApproval` are extended to look at the join table.
- Approving covers all files of the delivery; "request changes" closes the round as today; a resubmission references the new versions.
- Reminders (D03) and review-by are per delivery, unchanged.
- Message-only delivery: `fileAssetId = null`, title from the message's first line, `kind: 'message'` in the client list; the client can approve or answer; no download.

## Migration

Additive table; backfill one `ApprovalRequestFile` row per existing delivery that has a `fileVersionId` (idempotent, inside the migration). Rollback: drop the table; the first file stays on `ApprovalRequest`, so nothing visible to the client is lost except additional files of multi-file deliveries made after the migration.

## Consequences

- Client list and detail show N files (preview per file, "Download all" later).
- `security-gate-client-deliveries` and `client-review-reminders` suites gain multi-file and message-only cases; isolation is checked per file.
- Version comparison (D04) stays per file.

## Open questions for the owner (O34)

1. Approve this ADR and a migration task for `ApprovalRequestFile`.
2. Maximum files per delivery (proposal: 20) and whether message-only deliveries should appear in "My Work" like file deliveries.
