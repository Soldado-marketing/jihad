/**
 * Sprint 13 — Approved-user login flow regression suite
 *
 * Static source-analysis tests. No live server or DB required.
 * Run with: node --test test/sprint-13-auth-login-flow.test.mjs
 *
 * Guards the full approved-user journey:
 *   register → admin approves → user logs in → JWT issued
 *
 * Verifies:
 *  (1) auth.service.ts login status gate logic
 *  (2) admin-users.service.ts approval transaction
 *  (3) spec file correctness (MailService mock + membership.status)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');

// ── helpers ──────────────────────────────────────────────────────────────────

const authSvc    = () => read('src/modules/auth/auth.service.ts');
const adminSvc   = () => read('src/modules/admin-users/admin-users.service.ts');
const authSpec   = () => read('src/modules/auth/auth.service.spec.ts');
const adminSpec  = () => read('src/modules/admin-users/admin-users.service.spec.ts');

// ── auth.service.ts — status gate ────────────────────────────────────────────

describe('auth.service.ts — login status gate', () => {

  it("allowedStatuses array contains 'APPROVED'", () => {
    assert.match(
      authSvc(),
      /allowedStatuses.*\[.*'APPROVED'.*\]/,
      "login() must list 'APPROVED' in allowedStatuses",
    );
  });

  it("allowedStatuses array contains 'ACTIVE' (backward-compat)", () => {
    assert.match(
      authSvc(),
      /allowedStatuses.*\[.*'ACTIVE'.*\]/,
      "login() must list 'ACTIVE' in allowedStatuses for backward compatibility",
    );
  });

  it("blocks PENDING_APPROVAL — throws friendly ForbiddenException", () => {
    const src = authSvc();
    assert.match(src, /userStatus === 'PENDING_APPROVAL'/, "status gate checks PENDING_APPROVAL");
    assert.match(src, /Your account is waiting for approval\./, "error message mentions approval");
  });

  it("blocks REJECTED — throws friendly ForbiddenException", () => {
    const src = authSvc();
    assert.match(src, /userStatus === 'REJECTED'/, "status gate checks REJECTED");
    assert.match(src, /Your account request was rejected/, "error message mentions rejection");
  });

  it("blocks SUSPENDED — throws friendly ForbiddenException", () => {
    const src = authSvc();
    assert.match(src, /userStatus === 'SUSPENDED'/, "status gate checks SUSPENDED");
    assert.match(src, /has been suspended/, "error message mentions suspension");
  });

  it("filters memberships to status === 'ACTIVE' in code (defensive against Prisma enum quirks)", () => {
    assert.match(
      authSvc(),
      /memberships\.filter\(\(m\) => m\.status === 'ACTIVE'\)/,
      "login() must filter user.memberships by m.status === 'ACTIVE' in application code",
    );
  });

  it("includes memberships (with tenant) in the user findUnique query", () => {
    const src = authSvc();
    assert.match(src, /include:\s*\{[\s\S]*?memberships\s*:/,     "user query must include memberships");
    assert.match(src, /include:\s*\{[\s\S]*?tenant\s*:\s*true/,   "memberships must include tenant");
  });

  it("throws a clear error when activeMemberships is empty after approval", () => {
    assert.match(
      authSvc(),
      /no active workspace membership/,
      "login() must throw a descriptive error when no ACTIVE membership exists",
    );
  });

  it("PENDING_APPROVAL block writes an audit event with LoginBlockReason.PENDING_APPROVAL", () => {
    const src = authSvc();
    // Source uses LoginBlockReason enum (e.g. LoginBlockReason.PENDING_APPROVAL)
    // rather than a raw string constant — check enum usage
    assert.match(src, /LoginBlockReason/,     "auth.service must import LoginBlockReason for typed audit emit");
    assert.match(src, /LoginBlockReason\.PENDING_APPROVAL/, "PENDING_APPROVAL block must emit LoginBlockReason.PENDING_APPROVAL");
  });

  it("REJECTED block writes an audit event with LoginBlockReason.REJECTED", () => {
    assert.match(
      authSvc(),
      /LoginBlockReason\.REJECTED/,
      "REJECTED block must emit LoginBlockReason.REJECTED in the audit event",
    );
  });

  it("SUSPENDED block writes an audit event with LoginBlockReason.SUSPENDED", () => {
    assert.match(
      authSvc(),
      /LoginBlockReason\.SUSPENDED/,
      "SUSPENDED block must emit LoginBlockReason.SUSPENDED in the audit event",
    );
  });
});

// ── admin-users.service.ts — approval transaction ─────────────────────────────

describe('admin-users.service.ts — approveRequest()', () => {

  it("updates user.status to 'APPROVED' inside the transaction", () => {
    assert.match(
      adminSvc(),
      /user\.update\([\s\S]*?data:\s*\{[\s\S]*?status:\s*'APPROVED'/,
      "approveRequest() must set user.status = 'APPROVED' inside the $transaction",
    );
  });

  it("creates TenantMembership with status: 'ACTIVE' inside the transaction", () => {
    assert.match(
      adminSvc(),
      /tenantMembership\.create\([\s\S]*?status:\s*'ACTIVE'/,
      "approveRequest() must create TenantMembership with status: 'ACTIVE'",
    );
  });

  it("wraps user update + membership create in a $transaction (atomic)", () => {
    assert.match(
      adminSvc(),
      /\$transaction\(/,
      "approveRequest() must use this.prisma.$transaction for atomicity",
    );
  });

  it("calls mailService.sendApprovalEmail after the transaction commits", () => {
    assert.match(
      adminSvc(),
      /mailService\.sendApprovalEmail\(/,
      "approveRequest() must call mailService.sendApprovalEmail to notify the user",
    );
  });

  it("updates registrationRequest.status to 'APPROVED' inside the transaction", () => {
    assert.match(
      adminSvc(),
      /registrationRequest\.update\([\s\S]*?status:\s*'APPROVED'/,
      "approveRequest() must update registrationRequest.status to 'APPROVED' inside the transaction",
    );
  });
});

// ── spec file integrity ───────────────────────────────────────────────────────

describe('auth.service.spec.ts — spec integrity', () => {

  it("imports MailService", () => {
    assert.match(
      authSpec(),
      /import.*MailService.*from/,
      "auth spec must import MailService so DI can be mocked",
    );
  });

  it("provides MailService mock in the test module", () => {
    assert.match(
      authSpec(),
      /provide\s*:\s*MailService/,
      "auth spec must provide MailService mock (otherwise NestJS DI throws at compile time)",
    );
  });

  it("defines a mockMail object with the three required methods", () => {
    const src = authSpec();
    assert.match(src, /mockMail/,                    "auth spec must define mockMail");
    assert.match(src, /notifyOwnerNewRequest/,        "mockMail must stub notifyOwnerNewRequest");
    assert.match(src, /sendApprovalEmail/,            "mockMail must stub sendApprovalEmail");
    assert.match(src, /sendRejectionEmail/,           "mockMail must stub sendRejectionEmail");
  });

  it("baseUser.memberships[0] has status: 'ACTIVE'  (critical — login filters by this)", () => {
    assert.match(
      authSpec(),
      /status\s*:\s*'ACTIVE'[\s\S]*?\/\/.*required.*login.*filter|status\s*:\s*'ACTIVE'\s*,?\s*\/\/.*login/i,
      "baseUser.memberships must include status: 'ACTIVE' so the login m.status filter returns it",
    );
  });
});

describe('admin-users.service.spec.ts — spec integrity', () => {

  it("imports MailService", () => {
    assert.match(
      adminSpec(),
      /import.*MailService.*from/,
      "admin spec must import MailService so DI can be mocked",
    );
  });

  it("provides MailService mock in the test module", () => {
    assert.match(
      adminSpec(),
      /provide\s*:\s*MailService/,
      "admin spec must provide MailService mock (otherwise NestJS DI throws at compile time)",
    );
  });

  it("defines a mockMail object with the three required methods", () => {
    const src = adminSpec();
    assert.match(src, /mockMail/,                    "admin spec must define mockMail");
    assert.match(src, /notifyOwnerNewRequest/,        "mockMail must stub notifyOwnerNewRequest");
    assert.match(src, /sendApprovalEmail/,            "mockMail must stub sendApprovalEmail");
    assert.match(src, /sendRejectionEmail/,           "mockMail must stub sendRejectionEmail");
  });
});
