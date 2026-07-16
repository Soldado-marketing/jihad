export type WorkspaceRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CONTRACTOR' | 'CLIENT';

export const roleLabels: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  CLIENT: 'Client',
};
