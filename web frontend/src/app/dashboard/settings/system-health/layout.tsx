import { ReactNode } from 'react';
import ProtectedPage from '@/components/permissions/ProtectedPage';

export default function SystemHealthLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedPage
      requiredPermission={{
        resource: 'dashboard.settings',
        action: 'view',
      }}
    >
      {children}
    </ProtectedPage>
  );
}

