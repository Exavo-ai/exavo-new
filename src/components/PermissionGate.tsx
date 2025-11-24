import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTeam } from "@/contexts/TeamContext";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface PermissionGateProps {
  children: ReactNode;
  permission?: keyof typeof import("@/contexts/TeamContext")["useTeam"] extends () => infer R ? R extends { permissions: infer P } ? P : never : never;
  fallback?: ReactNode;
  redirect?: string;
}

export function PermissionGate({ 
  children, 
  permission, 
  fallback,
  redirect
}: PermissionGateProps) {
  const { permissions, loading, isWorkspaceOwner } = useTeam();

  if (loading) {
    return null;
  }

  // Workspace owners bypass all permission checks
  if (isWorkspaceOwner) {
    return <>{children}</>;
  }

  // If no permission specified, allow access
  if (!permission) {
    return <>{children}</>;
  }

  // Check if user has the required permission
  const hasPermission = permissions[permission as keyof typeof permissions];

  if (!hasPermission) {
    if (redirect) {
      return <Navigate to={redirect} replace />;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="py-8 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Permission Required</h3>
          <p className="text-muted-foreground">
            You don't have permission to access this feature. Contact your workspace owner to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
