import { format } from "date-fns";
import { Mail, Phone, Calendar, Shield, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_active: boolean;
  avatar_url: string | null;
}

interface UserProfileTabProps {
  user: UserProfile;
  userRole: string;
  onUpdate: () => void;
}

export function UserProfileTab({ user, userRole, onUpdate }: UserProfileTabProps) {
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Basic user details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{user.full_name || "No name set"}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user.phone || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Join Date</p>
                <p className="font-medium">
                  {format(new Date(user.created_at), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Role and account status information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role */}
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <Shield className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Role</p>
              <div className="flex items-center gap-2">
                <Badge variant={userRole === "admin" ? "default" : "secondary"} className="capitalize">
                  {userRole}
                </Badge>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            {user.is_active ? (
              <UserCheck className="h-6 w-6 text-green-500" />
            ) : (
              <UserX className="h-6 w-6 text-destructive" />
            )}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Account Status</p>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_active ? "outline" : "destructive"}>
                  {user.is_active ? "Active" : "Suspended"}
                </Badge>
              </div>
            </div>
          </div>

          {/* User ID */}
          <div className="p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">User ID</p>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">
              {user.id}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
