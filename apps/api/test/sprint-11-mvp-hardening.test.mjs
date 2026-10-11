import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

function listFiles(relativePath) {
  const absolutePath = join(apiRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(apiRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath);
    }

    return [childPath];
  });
}

function modelBlock(schema, modelName) {
  return schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
}

describe('Sprint 11 MVP API hardening regression', () => {
  it('keeps all tenant-owned MVP models tenant-scoped', () => {
    const schema = readApi('prisma/schema.prisma');
    const tenantOwnedModels = [
      'TenantMembership',
      'Invite',
      'Session',
      'Device',
      'LoginHistory',
      'AuditEvent',
      'Project',
      'ProjectMember',
      'Task',
      'Subtask',
      'Lead',
      'Opportunity',
      'Meeting',
      'FollowUp',
      'ProposalDraft',
      'InternalNote',
      'FileAsset',
      'FileVersion',
      'FileShare',
      'ApprovalRequest',
      'ApprovalDecision',
      'ChatChannel',
      'ChatMembership',
      'ChatMessage',
      'Notification',
      'VoiceNote',
      'VoiceTranscript',
      'VoiceToTaskDraft',
      'RevenueRecord',
      'CostRecord',
      'Invoice',
      'InvoiceLine',
      'Payment',
      'ReportDefinition',
      'ReportRun',
      'DashboardWidget',
    ];

    for (const model of tenantOwnedModels) {
      const block = modelBlock(schema, model);
      assert.notEqual(block, '', `${model} should exist`);
      assert.match(block, /tenantId\s+String/, `${model} should include tenantId`);
      assert.match(block, /@@index\(\[tenantId/, `${model} should include tenant indexes`);
    }
  });

  it('keeps protected MVP controllers guarded with permission requirements', () => {
    const protectedControllers = [
      'src/modules/projects/projects.controller.ts',
      'src/modules/tasks/tasks.controller.ts',
      'src/modules/subtasks/subtasks.controller.ts',
      'src/modules/client-portal/client-portal.controller.ts',
      'src/modules/leads/leads.controller.ts',
      'src/modules/opportunities/opportunities.controller.ts',
      'src/modules/meetings/meetings.controller.ts',
      'src/modules/follow-ups/follow-ups.controller.ts',
      'src/modules/collaboration/collaboration.controller.ts',
      'src/modules/files/files.controller.ts',
      'src/modules/approvals/approvals.controller.ts',
      'src/modules/chat/chat.controller.ts',
      'src/modules/voice-notes/voice-notes.controller.ts',
      'src/modules/voice-to-task/voice-to-task.controller.ts',
      'src/modules/finance/finance.controller.ts',
      'src/modules/invoices/invoices.controller.ts',
      'src/modules/invoices/client-invoices.controller.ts',
      'src/modules/payments/payments.controller.ts',
      'src/modules/payments/client-payments.controller.ts',
      'src/modules/dashboards/dashboards.controller.ts',
      'src/modules/reports/reports.controller.ts',
    ];

    // MAOS-T39: the tenant now comes from the authenticated session
    // (@CurrentUser), never from request headers, and authentication runs
    // before the permission check.
    for (const controllerPath of protectedControllers) {
      assertGuardedController(assert, readApi(controllerPath), controllerPath);
    }

    // SELF-scoped: the caller's own notifications. Authentication is the whole
    // gate and every call is keyed on the caller's own user id.
    const notifications = readApi('src/modules/notifications/notifications.controller.ts');
    assert.match(notifications, /@UseGuards\(JwtAuthGuard\)/);
    for (const call of notifications.match(/this\.svc\.\w+\([^)]*\)/g) ?? []) {
      assert.match(call, /user\.tenantId, user\.sub/, `notifications must stay self-scoped: ${call}`);
    }
  });

  it('keeps tenant-aware repository access for MVP business modules', () => {
    const repositoryFiles = listFiles('src/modules').filter(
      (file) => file.endsWith('repository.ts') && !file.includes('/tenants/'),
    );

    // MAOS-T39: repositories use Prisma directly; the invariant is that every
    // query carries a tenantId boundary. Reviewed exception: the dashboard
    // portal counts pass a prebuilt `visible` filter that contains tenantId.
    const reviewedExceptions = {
      'src/modules/dashboards/dashboards.repository.ts': ['project.count', 'task.count', 'invoice.count'],
    };
    assert.ok(repositoryFiles.length >= 20, 'repository discovery found too few files');
    for (const repositoryPath of repositoryFiles) {
      assertTenantScopedRepository(assert, readApi(repositoryPath), repositoryPath, reviewedExceptions[repositoryPath]);
    }
  });

  it('preserves owner-only finance and client-safe invoice/payment boundaries', () => {
    const financeController = readApi('src/modules/finance/finance.controller.ts');
    const invoicesController = readApi('src/modules/invoices/invoices.controller.ts');
    const paymentsController = readApi('src/modules/payments/payments.controller.ts');
    const clientInvoicesController = readApi('src/modules/invoices/client-invoices.controller.ts');
    const clientPaymentsController = readApi('src/modules/payments/client-payments.controller.ts');
    const invoicesService = readApi('src/modules/invoices/invoices.service.ts');
    const paymentsService = readApi('src/modules/payments/payments.service.ts');
    const invoicesRepository = readApi('src/modules/invoices/invoices.repository.ts');
    const paymentsRepository = readApi('src/modules/payments/payments.repository.ts');
    const permissionService = readApi('src/modules/permissions/permission.service.ts');

    // MAOS-T39: owner-only finance is enforced by `sensitive: true`, which
    // PermissionService denies to every non-owner. Every finance route and the
    // payment list carry it. Invoices are deliberately manageable by MANAGER
    // (Blueprint §2.1), so they are permission-controlled, not owner-only.
    const financeRoutes = financeController.match(/@RequirePermission\([^)]*\)/g) ?? [];
    assert.ok(financeRoutes.length >= 4);
    for (const route of financeRoutes) assert.match(route, /sensitive: true/);
    assert.match(paymentsController, /resource: PermissionResource\.PAYMENT, sensitive: true/);
    assert.match(invoicesController, /resource: PermissionResource\.INVOICE/);
    assert.match(permissionService, /if \(sensitive\) \{\s*return \{ allowed: false, reason: 'sensitive_non_owner_deny'/);
    assert.match(clientInvoicesController, /scope: 'client-portal'/);
    assert.match(clientPaymentsController, /scope: 'client-portal'/);
    // Client portals read through dedicated client-safe selects.
    assert.match(invoicesRepository, /select: CLIENT_INVOICE_SELECT/);
    assert.match(paymentsRepository, /select: CLIENT_PAYMENT_SELECT/);
    assert.doesNotMatch(`${clientInvoicesController}\n${clientPaymentsController}`, /COST_RECORD|FINANCE|REVENUE_RECORD/);
    assert.doesNotMatch(`${invoicesService}\n${paymentsService}`, /payroll|employeeCost|costRecord/i);
  });

  it('preserves client portal, file and chat leakage controls', () => {
    const clientPortalService = readApi('src/modules/client-portal/client-portal.service.ts');
    const chatRepository = readApi('src/modules/chat/chat.repository.ts');

    // MAOS-T39: the portal resolves the client scope from the caller's own
    // membership (fail closed) and reads client-visible rows only.
    assert.match(clientPortalService, /this\.clientScope\.resolve\(tenantId, actorId, role\)/);
    assert.match(clientPortalService, /clientVisible: true/);
    assert.doesNotMatch(clientPortalService, /internalNotes|auditLogs|payroll|employeeCost/i);
    // MAOS-T38 removed the signed-URL and realtime placeholders: neither may
    // come back as a fake-success surface. File content is served only by the
    // authorised content route (security-gate suites).
    assert.equal(existsApi('src/modules/files/signed-url.service.ts'), false);
    assert.equal(existsApi('src/modules/realtime'), false);
    assert.match(chatRepository, /ChatChannelType\.INTERNAL/);
  });

  it.todo('reports suppress hidden counts and totals (specified in Sprint 10, never built; backlog F-4)');

  it('keeps AI and transcription providers out until they are built for real', () => {
    const voiceToTaskService = readApi('src/modules/voice-to-task/voice-to-task.service.ts');
    const voiceToTaskRepository = readApi('src/modules/voice-to-task/voice-to-task.repository.ts');

    // MAOS-T38 removed the AI and transcription placeholder modules. Confirming
    // a voice-to-task draft only marks it CONFIRMED: no task is created
    // automatically and no external provider is called.
    assert.equal(existsApi('src/modules/ai-provider'), false);
    assert.equal(existsApi('src/modules/transcription'), false);
    assert.match(voiceToTaskRepository, /data: \{ status: 'CONFIRMED' \}/);
    assert.doesNotMatch(`${voiceToTaskService}\n${voiceToTaskRepository}`, /TasksService|tasksService|task\.create\(|createTask\(/);
  });

  it('keeps audit redaction markers for sensitive MVP events', () => {
    const auditRedactor = readApi('src/modules/audit/audit-redactor.ts');
    const auditService = readApi('src/modules/audit/audit.service.ts');
    const sensitiveServices = [
      readApi('src/modules/chat/chat.service.ts'),
      readApi('src/modules/voice-notes/voice-notes.service.ts'),
      readApi('src/modules/voice-to-task/voice-to-task.service.ts'),
      readApi('src/modules/payments/payments.service.ts'),
      readApi('src/modules/reports/reports.service.ts'),
    ].join('\n');

    assert.match(auditRedactor, /password|token|secret|privateKey/);
    assert.match(auditService, /createAuditEventPlaceholder/);
    // MAOS-T38: a "redacted|suppressed|placeholder" marker was only ever found in
    // the dead signed-url placeholder (removed). Redaction itself is asserted by
    // the redactor patterns above and the raw-field check below.
    assert.doesNotMatch(sensitiveServices, /rawSecret|cardNumber|fullTranscript|messageBodyRaw/);
  });

  it('confirms deferred external integrations and post-MVP modules remain absent', () => {
    const source = listFiles('src')
      .map((file) => readApi(file))
      .join('\n');
    const appModule = readApi('src/app.module.ts');

    // MAOS-T39: two integrations are approved and built - object storage
    // (S3 SDK, storage module only) and email (Resend over fetch, mail module
    // only). Everything else stays out, and no other module calls out.
    const files = listFiles('src').filter((f) => f.endsWith('.ts'));
    const outside = (allowed) => files.filter((f) => !f.startsWith(allowed)).map((f) => readApi(f)).join('\n');
    assert.doesNotMatch(source, /from ['"]openai|from ['"]stripe|from ['"]nodemailer|from ['"]axios/i);
    assert.doesNotMatch(outside('src/modules/storage/'), /from ['"]@aws-sdk/);
    assert.doesNotMatch(outside('src/modules/mail/'), /\bfetch\(/);
    assert.doesNotMatch(appModule, /AdvancedBiModule|ForecastingModule|AnomalyDetectionModule|AutomationsModule|PayrollModule|ReportExportModule|ScheduledReportsModule/);
  });
});
