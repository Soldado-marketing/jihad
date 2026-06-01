import { CollaborationSummary } from './collaboration-summary';
import { CRMSummary } from './crm-summary';
import { FileApprovalSummary } from './file-approval-summary';
import { FinanceSummaryOwnerOnly } from './finance-summary-owner-only';
import { ProjectTaskSummary } from './project-task-summary';
import { VoiceSummary } from './voice-summary';

export function WorkspaceSummaryGrid() {
  return (
    <section aria-label="Workspace summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ProjectTaskSummary />
      <CRMSummary />
      <CollaborationSummary />
      <FileApprovalSummary />
      <VoiceSummary />
      <FinanceSummaryOwnerOnly />
    </section>
  );
}
