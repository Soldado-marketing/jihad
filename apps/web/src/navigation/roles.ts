export type WorkspaceRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';

export const roleLabels: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
};
