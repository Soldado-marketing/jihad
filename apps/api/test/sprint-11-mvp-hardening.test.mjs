import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
      'src/modules/notifications/notifications.controller.ts',
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

    for (const controllerPath of protectedControllers) {
      const controller = readApi(controllerPath);
      assert.match(controller, /@UseGuards\(PermissionGuard\)/, `${controllerPath} should use PermissionGuard`);
      assert.match(controller, /@RequirePermission\(/, `${controllerPath} should declare permission requirements`);
      assert.match(controller, /tenantContextFromHeaders/, `${controllerPath} should propagate tenant context`);
    }
  });

  it('keeps tenant-aware repository access for MVP business modules', () => {
    const repositoryFiles = listFiles('src/modules').filter(
      (file) => file.endsWith('repository.ts') && !file.includes('/tenants/'),
    );

    for (const repositoryPath of repositoryFiles) {
      const repository = readApi(repositoryPath);
      assert.match(repository, /extends TenantAwareRepository/, `${repositoryPath} should extend TenantAwareRepository`);
      assert.match(repository, /requireTenantContext/, `${repositoryPath} should require tenant context`);
      assert.doesNotMatch(repository, /prisma\./, `${repositoryPath} should not use direct Prisma access`);
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

    assert.match(financeController, /sensitive: true/);
    assert.match(invoicesController, /sensitive: true/);
    assert.match(paymentsController, /sensitive: true/);
    assert.match(invoicesService, /assertOwnerOnlyFinanceAccess/);
    assert.match(paymentsService, /assertOwnerOnlyFinanceAccess/);
    assert.match(clientInvoicesController, /scope: 'client-portal'/);
    assert.match(clientPaymentsController, /scope: 'client-portal'/);
    assert.match(invoicesService, /toClientInvoice/);
    assert.match(paymentsService, /toClientPayment/);
    assert.doesNotMatch(`${clientInvoicesController}\n${clientPaymentsController}`, /COST_RECORD|FINANCE|REVENUE_RECORD/);
    assert.doesNotMatch(`${invoicesService}\n${paymentsService}`, /payroll|employeeCost|costRecord/i);
  });

  it('preserves client portal, signed URL, chat/realtime, and report leakage controls', () => {
    const clientPortalService = readApi('src/modules/client-portal/client-portal.service.ts');
    const signedUrlService = readApi('src/modules/files/signed-url.service.ts');
    const realtimeGateway = readApi('src/modules/realtime/realtime-gateway.placeholder.ts');
    const chatRepository = readApi('src/modules/chat/chat.repository.ts');
    const reportsService = readApi('src/modules/reports/reports.service.ts');
    const dashboardsRepository = readApi('src/modules/dashboards/dashboards.repository.ts');

    assert.match(clientPortalService, /requireClientActor/);
    assert.match(clientPortalService, /validateClientVisibleResource/);
    assert.match(clientPortalService, /client_visible_scope_required/);
    assert.doesNotMatch(clientPortalService, /internalNotes|auditLogs|payroll|employeeCost/i);
    assert.match(signedUrlService, /validateActorScope/);
    assert.match(signedUrlService, /expiresInSeconds: 300/);
    assert.match(signedUrlService, /signedUrlPayload: 'redacted-placeholder'/);
    assert.match(realtimeGateway, /payloadPolicy: 'minimal-reference-only'/);
    assert.match(realtimeGateway, /handleSessionRevocationPlaceholder/);
    assert.match(chatRepository, /type: 'INTERNAL'/);
    assert.match(chatRepository, /type: 'CLIENT'/);
    assert.match(reportsService, /applyHiddenCountTotalSuppression/);
    assert.match(reportsService, /report\.hidden_total\.suppressed/);
    assert.match(dashboardsRepository, /hiddenCountTotalSuppression: true/);
  });

  it('preserves AI and voice safety placeholders without external provider calls or automatic task creation', () => {
    const transcriptionProvider = readApi('src/modules/transcription/transcription-provider.placeholder.ts');
    const aiExtraction = readApi('src/modules/ai-provider/ai-extraction.placeholder.ts');
    const voiceToTaskService = readApi('src/modules/voice-to-task/voice-to-task.service.ts');
    const voiceNotesService = readApi('src/modules/voice-notes/voice-notes.service.ts');

    assert.match(transcriptionProvider, /externalProviderCalled: false/);
    assert.match(transcriptionProvider, /unauthorizedTrainingAllowed: false/);
    assert.match(transcriptionProvider, /supportedLanguages: \['ar', 'en', 'de', 'mixed'\]/);
    assert.match(aiExtraction, /externalProviderCalled: false/);
    assert.match(aiExtraction, /taskCreatedAutomatically: false/);
    assert.match(aiExtraction, /humanConfirmationRequired: true/);
    assert.match(voiceToTaskService, /taskCreated: false/);
    assert.match(voiceToTaskService, /placeholder-only-no-automatic-task/);
    assert.match(voiceNotesService, /placeholder-no-external-provider/);
    assert.doesNotMatch(voiceToTaskService, /TasksService|tasksService|createTask\(/);
  });

  it('keeps audit redaction markers for sensitive MVP events', () => {
    const auditRedactor = readApi('src/modules/audit/audit-redactor.ts');
    const auditService = readApi('src/modules/audit/audit.service.ts');
    const sensitiveServices = [
      readApi('src/modules/files/signed-url.service.ts'),
      readApi('src/modules/chat/chat.service.ts'),
      readApi('src/modules/voice-notes/voice-notes.service.ts'),
      readApi('src/modules/voice-to-task/voice-to-task.service.ts'),
      readApi('src/modules/payments/payments.service.ts'),
      readApi('src/modules/reports/reports.service.ts'),
    ].join('\n');

    assert.match(auditRedactor, /password|token|secret|privateKey/);
    assert.match(auditService, /createAuditEventPlaceholder/);
    assert.match(sensitiveServices, /redacted|suppressed|placeholder/);
    assert.doesNotMatch(sensitiveServices, /rawSecret|cardNumber|fullTranscript|messageBodyRaw/);
  });

  it('confirms deferred external integrations and post-MVP modules remain absent', () => {
    const source = listFiles('src')
      .map((file) => readApi(file))
      .join('\n');
    const appModule = readApi('src/app.module.ts');

    assert.doesNotMatch(source, /from ['"]openai|from ['"]stripe|from ['"]@aws-sdk|from ['"]nodemailer|from ['"]axios/i);
    assert.doesNotMatch(source, /\bfetch\(/);
    assert.doesNotMatch(appModule, /AdvancedBiModule|ForecastingModule|AnomalyDetectionModule|AutomationsModule|PayrollModule|ReportExportModule|ScheduledReportsModule/);
  });
});
