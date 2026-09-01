import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

function listFiles(relativePath) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(webRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath);
    }

    return [childPath];
  });
}

function readMany(paths) {
  return paths.map((path) => readWeb(path)).join('\n');
}

describe('Sprint 11 MVP frontend hardening regression', () => {
  it('keeps internal navigation role boundaries intact', () => {
    const navigation = readWeb('src/navigation/navigation.ts');
    const financeBlock = navigation.match(/id: 'finance'[\s\S]*?clientSafe: false,/)?.[0] ?? '';
    const reportsBlock = navigation.match(/id: 'reports'[\s\S]*?clientSafe: false,/)?.[0] ?? '';
    const voiceBlock = navigation.match(/id: 'voice'[\s\S]*?clientSafe: false,/)?.[0] ?? '';

    assert.match(financeBlock, /allowedRoles: \['OWNER'\]/);
    assert.doesNotMatch(financeBlock, /MANAGER|EMPLOYEE|CLIENT/);
    assert.match(reportsBlock, /allowedRoles: \['OWNER', 'MANAGER'\]/);
    assert.doesNotMatch(reportsBlock, /EMPLOYEE|CLIENT/);
    assert.match(voiceBlock, /allowedRoles: \['OWNER', 'MANAGER', 'EMPLOYEE'\]/);
    assert.doesNotMatch(voiceBlock, /CLIENT/);
  });

  it('keeps client navigation client-safe and separate from internal modules', () => {
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(clientNavigation, /href: '\/client'/);
    assert.match(clientNavigation, /href: '\/client\/projects'/);
    assert.match(clientNavigation, /href: '\/client\/tasks'/);
    assert.match(clientNavigation, /href: '\/client\/invoices'/);
    assert.match(clientNavigation, /href: '\/client\/payments'/);
    assert.doesNotMatch(clientNavigation, /\/finance|\/crm|\/chat|\/voice|\/reports|\/files|\/approvals|\/collaboration/);
  });

  it('keeps client dashboard and client finance views free of internal finance data', () => {
    const clientFiles = readMany([
      'app/(client)/client/page.tsx',
      'app/(client)/client/invoices/page.tsx',
      'app/(client)/client/invoices/[id]/page.tsx',
      'app/(client)/client/payments/page.tsx',
      'src/components/client-portal/client-dashboard.tsx',
      'src/components/dashboard/client-dashboard-summary.tsx',
      'src/components/finance/client-invoice-list.tsx',
      'src/components/finance/client-invoice-detail.tsx',
      'src/components/finance/client-payment-list.tsx',
    ]);

    assert.match(clientFiles, /ClientSafeNotice|ClientDashboardSummary/);
    assert.doesNotMatch(clientFiles, /OwnerOnlyFinanceNotice|FinanceSummaryOwnerOnly|CostList|ProfitabilitySummaryCard/);
    assert.doesNotMatch(clientFiles, /payroll|employee cost|audit log|internal note|internal chat/i);
  });

  it('keeps report and dashboard hidden-data safety visible', () => {
    const reportAndDashboardFiles = readMany([
      'app/(workspace)/dashboard/page.tsx',
      'app/(workspace)/reports/page.tsx',
      'app/(workspace)/reports/[id]/page.tsx',
      'src/components/dashboard/hidden-data-notice.tsx',
      'src/components/reports/report-run-panel.tsx',
      'src/components/dashboard/finance-summary-owner-only.tsx',
    ]);

    assert.match(reportAndDashboardFiles, /HiddenDataNotice/);
    assert.match(reportAndDashboardFiles, /suppressed/);
    assert.match(reportAndDashboardFiles, /Owner-only finance|Owner only/);
    assert.doesNotMatch(reportAndDashboardFiles, /forecast|anomaly|scheduled reports|custom report builder|AI reporting|report export/i);
  });

  it('keeps voice and AI surfaces placeholder-only with human confirmation', () => {
    const voiceFiles = readMany([
      'app/(workspace)/voice/page.tsx',
      'app/(workspace)/voice/[id]/page.tsx',
      'app/(workspace)/voice/task-drafts/page.tsx',
      'app/(workspace)/voice/task-drafts/[id]/page.tsx',
      'src/components/voice/ai-placeholder-notice.tsx',
      'src/components/voice/human-confirmation-notice.tsx',
      'src/components/voice/voice-recorder-placeholder.tsx',
      'src/components/voice/voice-note-detail.tsx',
      'src/components/voice/voice-to-task-draft-detail.tsx',
    ]);

    assert.match(voiceFiles, /External provider calls are not active/);
    assert.match(voiceFiles, /human confirmation is required|Human confirmation required/i);
    assert.match(voiceFiles, /Drafts remain review-only|draft only/i);
    assert.doesNotMatch(voiceFiles, /automatic task creation|production audio processing|mobile recording|real transcription/i);
  });

  // Phase 6 superseded the original form of this test. It asserted that object
  // storage was still deferred and that no file input existed anywhere; both
  // became false once uploads were implemented against the Phase 3 API. The
  // protective intent is kept: file access must stay permission-checked, the
  // browser must never see storage internals, and no capability may be claimed
  // that does not exist.
  it('keeps file and approval views permission-checked without exposing storage internals', () => {
    const fileAndApprovalFiles = readMany([
      'app/(workspace)/files/page.tsx',
      'app/(workspace)/files/[id]/page.tsx',
      'app/(workspace)/approvals/page.tsx',
      'app/(workspace)/approvals/[id]/page.tsx',
      'src/components/files/signed-url-notice.tsx',
      'src/components/files/file-uploader.tsx',
      'src/components/files/file-version-list.tsx',
      'src/components/approvals/approval-decision-panel.tsx',
    ]);

    // Access is still described as permission-checked, and now accurately.
    assert.match(fileAndApprovalFiles, /permission-checked/i);
    assert.match(fileAndApprovalFiles, /Advanced workflows are deferred/);

    // Uploads and downloads go through the API's own routes only.
    assert.match(fileAndApprovalFiles, /\/files\/\$\{fileAssetId\}\/versions/);
    assert.match(fileAndApprovalFiles, /versions\/\$\{versionId\}\/content/);

    // Storage internals must never reach the browser, and no unimplemented
    // capability may be advertised.
    // Precise, not word-level: the notice legitimately *mentions* storage keys
    // and buckets to say they are never exposed. What must not appear is code
    // that reads one or builds a pre-signed URL.
    assert.doesNotMatch(fileAndApprovalFiles, /\.storageKey|getSignedUrl|presign|s3\.amazonaws/i);
    assert.match(
      fileAndApprovalFiles,
      /Storage keys and bucket details are never exposed to the\s+browser/,
    );
    assert.doesNotMatch(fileAndApprovalFiles, /malware scan implementation/i);
  });

  it('confirms MVP frontend routes and key safety components exist', () => {
    const requiredPaths = [
      'app/(workspace)/dashboard/page.tsx',
      'app/(workspace)/projects/page.tsx',
      'app/(workspace)/tasks/page.tsx',
      'app/(client)/client/page.tsx',
      'app/(workspace)/crm/page.tsx',
      'app/(workspace)/collaboration/page.tsx',
      'app/(workspace)/files/page.tsx',
      'app/(workspace)/approvals/page.tsx',
      'app/(workspace)/chat/page.tsx',
      'app/(workspace)/notifications/page.tsx',
      'app/(workspace)/voice/page.tsx',
      'app/(workspace)/finance/page.tsx',
      'app/(workspace)/reports/page.tsx',
      'src/components/states/denied-state.tsx',
      'src/components/states/unauthorized-state.tsx',
      'src/components/dashboard/hidden-data-notice.tsx',
      'src/components/voice/human-confirmation-notice.tsx',
    ];

    for (const path of requiredPaths) {
      assert.equal(existsWeb(path), true, `${path} should exist`);
    }
  });

  it('confirms deferred post-MVP frontend feature routes remain absent', () => {
    const sourcePaths = listFiles('app').concat(listFiles('src'));
    const routeAndComponentNames = sourcePaths.join('\n');

    assert.doesNotMatch(routeAndComponentNames, /advanced-bi|forecast|anomaly|report-export|scheduled-reports|custom-report-builder/i);
    assert.doesNotMatch(routeAndComponentNames, /automation-builder|payroll|wallet|marketplace|mobile/i);
  });
});
