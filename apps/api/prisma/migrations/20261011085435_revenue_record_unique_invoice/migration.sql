-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_tenantId_invoiceId_key" ON "RevenueRecord"("tenantId", "invoiceId");

