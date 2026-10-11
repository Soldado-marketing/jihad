import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 9 finance basic API baseline', () => {
  it('adds finance, invoice, and payment models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = ['RevenueRecord', 'CostRecord', 'Invoice', 'InvoiceLine', 'Payment'];
    const enums = ['InvoiceStatus', 'PaymentStatus', 'PaymentMethod'];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }

    for (const prismaEnum of enums) {
      assert.match(schema, new RegExp(`enum ${prismaEnum} \\{`));
    }

    assert.match(schema, /PARTIALLY_PAID/);
    assert.match(schema, /PARTIAL/);
    assert.match(schema, /MANUAL/);
  });

  it('adds finance, invoice, and payment modules with REST-first endpoint skeletons', () => {
    const requiredFiles = [
      'src/modules/finance/finance.controller.ts',
      'src/modules/finance/finance.service.ts',
      'src/modules/finance/finance.repository.ts',
      'src/modules/finance/finance.module.ts',
      'src/modules/invoices/invoices.controller.ts',
      'src/modules/invoices/client-invoices.controller.ts',
      'src/modules/invoices/invoices.service.ts',
      'src/modules/invoices/invoices.repository.ts',
      'src/modules/invoices/invoices.module.ts',
      'src/modules/payments/payments.controller.ts',
      'src/modules/payments/client-payments.controller.ts',
      'src/modules/payments/payments.service.ts',
      'src/modules/payments/payments.repository.ts',
      'src/modules/payments/payments.module.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const appModule = readApi('src/app.module.ts');
    assert.match(appModule, /FinanceModule/);
    assert.match(appModule, /InvoicesModule/);
    assert.match(appModule, /PaymentsModule/);
  });

  it('adds the required Sprint 9 endpoint skeletons', () => {
    const controllers = [
      readApi('src/modules/finance/finance.controller.ts'),
      readApi('src/modules/invoices/invoices.controller.ts'),
      readApi('src/modules/invoices/client-invoices.controller.ts'),
      readApi('src/modules/payments/payments.controller.ts'),
      readApi('src/modules/payments/client-payments.controller.ts'),
    ].join('\n');

    assert.match(controllers, /@Controller\('finance'\)/);
    // MAOS-T39: finance is read-only over HTTP. Revenue is posted by the
    // system when an invoice is settled (never typed in), and profitability
    // replaced the profitability-summary skeleton.
    assert.match(controllers, /@Get\('summary'\)/);
    assert.match(controllers, /@Get\('revenue'\)/);
    assert.match(controllers, /@Get\('costs'\)/);
    assert.match(controllers, /@Get\('profitability'\)/);
    assert.doesNotMatch(controllers, /@Post\('revenue'\)/);
    assert.match(controllers, /@Controller\('invoices'\)/);
    assert.match(controllers, /@Get\(\)/);
    assert.match(controllers, /@Post\(\)/);
    assert.match(controllers, /@Get\(':id'\)/);
    assert.match(controllers, /@Patch\(':id\/status'\)/);
    assert.match(controllers, /@Post\(':id\/send'\)/);
    assert.match(controllers, /@Controller\('payments'\)/);
    assert.match(controllers, /@Controller\('client\/invoices'\)/);
    assert.match(controllers, /@Controller\('client\/payments'\)/);
  });

  it('uses owner-only finance controls and permission resources on protected routes', () => {
    const paths = [
      'src/modules/finance/finance.controller.ts',
      'src/modules/invoices/invoices.controller.ts',
      'src/modules/payments/payments.controller.ts',
    ];
    for (const path of paths) assertGuardedController(assert, readApi(path), path);
    const financeController = readApi(paths[0]);
    const permissionService = readApi('src/modules/permissions/permission.service.ts');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    // MAOS-T39: owner-only finance is `sensitive: true` on every finance
    // route, which PermissionService denies to every non-owner.
    const financeRoutes = financeController.match(/@RequirePermission\([^)]*\)/g) ?? [];
    assert.ok(financeRoutes.length >= 4);
    for (const route of financeRoutes) assert.match(route, /sensitive: true/);
    assert.match(permissionService, /sensitive_non_owner_deny/);
    assert.match(permissionTypes, /FINANCE/);
    assert.match(permissionTypes, /REVENUE_RECORD/);
    assert.match(permissionTypes, /COST_RECORD/);
    assert.match(permissionTypes, /INVOICE/);
    assert.match(permissionTypes, /PAYMENT/);
  });

  it('keeps finance repositories tenant-aware without direct unscoped access', () => {
    // MAOS-T39: every query carries a tenantId boundary (see support helper).
    for (const path of [
      'src/modules/finance/finance.repository.ts',
      'src/modules/invoices/invoices.repository.ts',
      'src/modules/payments/payments.repository.ts',
    ]) {
      assertTenantScopedRepository(assert, readApi(path), path);
    }
  });

  it('adds client-safe invoice and payment placeholders without cost or payroll exposure', () => {
    const clientControllers = [
      readApi('src/modules/invoices/client-invoices.controller.ts'),
      readApi('src/modules/payments/client-payments.controller.ts'),
    ].join('\n');
    const clientRepositories = [
      readApi('src/modules/invoices/invoices.repository.ts'),
      readApi('src/modules/payments/payments.repository.ts'),
    ].join('\n');

    // MAOS-T39: client reads go through dedicated client-safe selects.
    assert.match(clientControllers, /scope: 'client-portal'/);
    assert.match(clientRepositories, /select: CLIENT_INVOICE_SELECT/);
    assert.match(clientRepositories, /select: CLIENT_PAYMENT_SELECT/);
    assert.doesNotMatch(clientControllers, /cost/i);
    assert.doesNotMatch(clientControllers, /payroll/i);
    assert.doesNotMatch(clientControllers, /audit/i);
  });

  it('audits invoice sending and revenue posting, and keeps payment providers out', () => {
    const invoicesService = readApi('src/modules/invoices/invoices.service.ts');
    assert.match(invoicesService, /recordAudit\(actor, 'invoice\.sent'/);
    assert.match(invoicesService, /recordAudit\(actor, 'revenue\.created'/);
    const payments = [
      readApi('src/modules/payments/payments.service.ts'),
      readApi('src/modules/payments/payments.repository.ts'),
    ].join('\n');
    assert.doesNotMatch(payments, /stripe|paypal|fetch\(/i);
  });

  it.todo('writes audit events for invoice creation/updates, payments and finance denials (specified in Sprint 9, never built; backlog F-4)');

  it('keeps post-Sprint-9 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /FinanceModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
    assert.doesNotMatch(appModule, /PayrollModule/);
    assert.doesNotMatch(appModule, /WalletModule/);
  });
});
