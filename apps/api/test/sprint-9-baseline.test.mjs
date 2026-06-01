import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
    assert.match(controllers, /@Get\('revenue'\)/);
    assert.match(controllers, /@Post\('revenue'\)/);
    assert.match(controllers, /@Get\('costs'\)/);
    assert.match(controllers, /@Post\('costs'\)/);
    assert.match(controllers, /@Get\('profitability-summary'\)/);
    assert.match(controllers, /@Controller\('invoices'\)/);
    assert.match(controllers, /@Get\(\)/);
    assert.match(controllers, /@Post\(\)/);
    assert.match(controllers, /@Get\(':id'\)/);
    assert.match(controllers, /@Patch\(':id'\)/);
    assert.match(controllers, /@Controller\('payments'\)/);
    assert.match(controllers, /@Controller\('client\/invoices'\)/);
    assert.match(controllers, /@Controller\('client\/payments'\)/);
  });

  it('uses owner-only finance controls and permission resources on protected routes', () => {
    const controllers = [
      readApi('src/modules/finance/finance.controller.ts'),
      readApi('src/modules/invoices/invoices.controller.ts'),
      readApi('src/modules/payments/payments.controller.ts'),
    ].join('\n');
    const financeService = readApi('src/modules/finance/finance.service.ts');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(controllers, /sensitive: true/);
    assert.match(financeService, /assertOwnerOnlyFinanceAccess/);
    assert.match(financeService, /MembershipRole\.OWNER/);
    assert.match(financeService, /owner_only_finance_access_required/);
    assert.match(permissionTypes, /FINANCE/);
    assert.match(permissionTypes, /REVENUE_RECORD/);
    assert.match(permissionTypes, /COST_RECORD/);
    assert.match(permissionTypes, /INVOICE/);
    assert.match(permissionTypes, /PAYMENT/);
  });

  it('keeps finance repositories tenant-aware without direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/finance/finance.repository.ts'),
      readApi('src/modules/invoices/invoices.repository.ts'),
      readApi('src/modules/payments/payments.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('adds client-safe invoice and payment placeholders without cost or payroll exposure', () => {
    const clientControllers = [
      readApi('src/modules/invoices/client-invoices.controller.ts'),
      readApi('src/modules/payments/client-payments.controller.ts'),
    ].join('\n');
    const clientServices = [
      readApi('src/modules/invoices/invoices.service.ts'),
      readApi('src/modules/payments/payments.service.ts'),
    ].join('\n');

    assert.match(clientControllers, /scope: 'client-portal'/);
    assert.match(clientServices, /toClientInvoice/);
    assert.match(clientServices, /toClientPayment/);
    assert.doesNotMatch(clientControllers, /cost/i);
    assert.doesNotMatch(clientControllers, /payroll/i);
    assert.doesNotMatch(clientControllers, /audit/i);
  });

  it('adds finance audit placeholders and keeps provider integration deferred', () => {
    const services = [
      readApi('src/modules/finance/finance.service.ts'),
      readApi('src/modules/invoices/invoices.service.ts'),
      readApi('src/modules/payments/payments.service.ts'),
    ].join('\n');
    const paymentRepository = readApi('src/modules/payments/payments.repository.ts');

    assert.match(services, /revenue\.created/);
    assert.match(services, /cost\.created/);
    assert.match(services, /invoice\.created/);
    assert.match(services, /invoice\.updated/);
    assert.match(services, /payment\.recorded/);
    assert.match(services, /finance\.access\.denied/);
    assert.match(services, /client\.invoice\.viewed/);
    assert.match(paymentRepository, /externalPaymentProviderIntegrated: false/);
  });

  it('keeps post-Sprint-9 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /FinanceModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
    assert.doesNotMatch(appModule, /PayrollModule/);
    assert.doesNotMatch(appModule, /WalletModule/);
  });
});
