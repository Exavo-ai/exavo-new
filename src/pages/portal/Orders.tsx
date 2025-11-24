import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle, MessageSquare, Filter, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  full_name: string;
  service_id: string | null;
  status: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
  email: string;
  phone: string;
  notes: string | null;
  project_progress: number;
  project_status: string;
}

const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function OrdersPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; appointment: Appointment | null }>({
    open: false,
    appointment: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { permissions } = useTeam();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadAppointments();
    }

    // Set up real-time subscription for appointments
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Appointment updated:', payload);
          toast({
            title: "Order Updated",
            description: "Your order has been updated by the admin.",
          });
          loadAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAppointments = async () => {
    try {
      setError(null);
      
      // Load appointments (service requests)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      setAppointments(appointmentsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message || "Failed to load data");
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!deleteDialog.appointment) return;

    try {
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', deleteDialog.appointment.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Order removed successfully",
      });

      setDeleteDialog({ open: false, appointment: null });
      loadAppointments();
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Error",
        description: "Failed to remove order",
        variant: "destructive",
      });
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = appointment.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || appointment.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-semibold">Error Loading Data</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadAppointments}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">View and manage your service requests</p>
        </div>
        <Button onClick={() => navigate("/client/services/browse")}>
          Browse Services
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven't placed any orders yet. Browse our services to get started.
              </p>
              <Button onClick={() => navigate("/client/services/browse")}>
                Browse Services
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Client Name</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Project Status</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Project Progress</TableHead>
                    <TableHead className="font-semibold">Appointment Date</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Time</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment, index) => (
                      <TableRow 
                        key={appointment.id}
                        className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <TableCell className="font-medium">{appointment.full_name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {appointment.project_status?.replace("_", " ") || "Not Started"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress 
                              value={appointment.project_progress || 0} 
                              className="h-2"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {appointment.project_progress || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{appointment.appointment_time}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate("/client/tickets")}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Contact Support
                            </Button>
                            {permissions.manage_orders && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, appointment })}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, appointment: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this order? This action cannot be undone.
              {deleteDialog.appointment && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">{deleteDialog.appointment.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(deleteDialog.appointment.appointment_date).toLocaleDateString()} at {deleteDialog.appointment.appointment_time}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAppointment}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
