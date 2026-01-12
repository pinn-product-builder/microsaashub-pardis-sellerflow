import { ReactNode, useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  const hasAccess = useMemo(() => {
    if (permission) {
      return hasPermission(permission);
    }
    if (permissions) {
      return requireAll 
        ? hasAllPermissions(permissions) 
        : hasAnyPermission(permissions);
    }
    return true;
  }, [permission, permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  if (isLoading) {
    if (showLoading) {
      return <Skeleton className="h-8 w-full" />;
    }
    return null;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
