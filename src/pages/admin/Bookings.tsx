import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, Filter, Pencil, Trash2, TrendingUp, FolderOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EditBookingDialog } from "@/components/admin/EditBookingDialog";
import { ViewBookingDialog } from "@/components/admin/ViewBookingDialog";

interface Booking {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_id: string | null;
  notes: string | null;
  project_progress: number;
  project_status: string;
  created_at: string;
  project_id?: string | null;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);

      // Fetch linked projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, appointment_id")
        .not("appointment_id", "is", null);

      if (projects) {
        const map: Record<string, string> = {};
        projects.forEach((p) => {
          if (p.appointment_id) map[p.appointment_id] = p.id;
        });
        setProjectMap(map);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (booking: Booking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const handleEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setDeletingId(booking.id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      loadBookings();
      setDeleteDialogOpen(false);
      setDeletingId(null);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });

      loadBookings();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const handleProjectStatusChange = async (bookingId: string, newProjectStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ project_status: newProjectStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project status updated successfully",
      });

      loadBookings();
    } catch (error) {
      console.error("Error updating project status:", error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const getProgressValue = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return 25;
      case "confirmed":
        return 50;
      case "completed":
        return 100;
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "hsl(45, 93%, 47%)"; // yellow
      case "confirmed":
        return "hsl(217, 91%, 60%)"; // blue
      case "completed":
        return "hsl(142, 76%, 36%)"; // green
      case "cancelled":
        return "hsl(0, 84%, 60%)"; // red
      default:
        return "hsl(var(--muted))";
    }
  };

  const getProjectStatusColor = (projectStatus: string) => {
    switch (projectStatus) {
      case "not_started":
        return "hsl(var(--muted))";
      case "in_progress":
        return "hsl(217, 91%, 60%)"; // blue
      case "review":
        return "hsl(45, 93%, 47%)"; // yellow
      case "completed":
        return "hsl(142, 76%, 36%)"; // green
      case "on_hold":
        return "hsl(0, 84%, 60%)"; // red
      default:
        return "hsl(var(--muted))";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || booking.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Bookings Management</h2>
        <p className="text-muted-foreground">View and manage all bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
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

      <Card>
        <CardHeader>
          <CardTitle>
            All Bookings ({filteredBookings.length}
            {filteredBookings.length !== bookings.length && ` of ${bookings.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Time</TableHead>
                  <TableHead>Booking Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Booking Progress</TableHead>
                  <TableHead>Project Status</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Project Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {bookings.length === 0 ? "No bookings found" : "No bookings match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {booking.email}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.appointment_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.appointment_time}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.status}
                          onValueChange={(value) => handleStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                Pending
                              </div>
                            </SelectItem>
                            <SelectItem value="confirmed">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Confirmed
                              </div>
                            </SelectItem>
                            <SelectItem value="completed">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                Completed
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                Cancelled
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress 
                            value={getProgressValue(booking.status)} 
                            className="h-2"
                            style={{ '--progress-background': getProgressColor(booking.status) } as any}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {getProgressValue(booking.status)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.project_status || "not_started"}
                          onValueChange={(value) => handleProjectStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-muted" />
                                Not Started
                              </div>
                            </SelectItem>
                            <SelectItem value="in_progress">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                In Progress
                              </div>
                            </SelectItem>
                            <SelectItem value="review">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                Review
                              </div>
                            </SelectItem>
                            <SelectItem value="completed">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                Completed
                              </div>
                            </SelectItem>
                            <SelectItem value="on_hold">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                On Hold
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress 
                            value={booking.project_progress || 0} 
                            className="h-2"
                            style={{ '--progress-background': getProjectStatusColor(booking.project_status) } as any}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {booking.project_progress || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {projectMap[booking.id] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/projects/${projectMap[booking.id]}`)}
                              title="Open Project"
                              className="text-primary"
                            >
                              <FolderOpen className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(booking)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(booking)}
                            title="Edit booking"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(booking)}
                            title="Delete booking"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ViewBookingDialog
        booking={selectedBooking}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <EditBookingDialog
        booking={selectedBooking}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadBookings}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking for{" "}
              <strong>{selectedBooking?.full_name}</strong>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
