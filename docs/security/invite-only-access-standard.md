# MAOS Invite-Only Access Standard

## Purpose

Define invite-only access expectations for MAOS MVP. This document does not implement authentication.

## No Public Registration

MAOS must not provide public self-registration. Users may enter the platform only through an approved invitation flow or an owner/admin-created account process.

## Invitation-Only Access

| Area | Requirement |
|---|---|
| Invite creation | Authorized roles only |
| Invite recipient | Email-based invite or approved fallback during testing |
| Invite scope | Tenant and role/client scope must be defined |
| Invite acceptance | Must validate invite status and expiry |
| Public signup | Forbidden |

## Invitation Lifecycle Expectations

| State | Meaning |
|---|---|
| Draft | Invite prepared but not sent |
| Sent | Invite sent to recipient |
| Accepted | Recipient joined through invite |
| Expired | Invite no longer usable |
| Revoked | Invite manually invalidated |

## Email Provider or Fallback Dependency

Sprint 1 invitation testing requires either an email provider path or an approved invite testing fallback. Without one, Sprint 1 invitation flow cannot be validated.

## Login Attempt Expectations

Login attempts must be audit-ready and should support future session, device, login history, and suspicious activity checks.

## Audit Expectations

Audit-ready events include invite created, invite sent, invite accepted, invite expired, invite revoked, login success, login failure, and unauthorized registration attempt.

## QA Test Expectations

| Test | Requirement |
|---|---|
| Public registration denied | Required |
| Valid invite accepted | Required |
| Expired invite denied | Required |
| Revoked invite denied | Required |
| Wrong tenant/client scope denied | Required |
| Login attempt recorded | Required once audit baseline exists |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| No public registration rule is documented | Met |
| Invitation-only access is documented | Met |
| Invitation lifecycle expectations are documented | Met |
| Email provider/fallback dependency is documented | Met |
| Login attempt expectations are documented | Met |
| Audit expectations are documented | Met |
| QA test expectations are documented | Met |
