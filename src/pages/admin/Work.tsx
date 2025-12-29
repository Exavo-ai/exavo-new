import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Search,
  Filter,
  Pencil,
  Trash2,
  FolderOpen,
  Calendar,
  Clock,
  Mail,
  User,
  Plus,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EditBookingDialog } from "@/components/admin/EditBookingDialog";
import { ViewBookingDialog } from "@/components/admin/ViewBookingDialog";
import { CreateProjectDialog } from "@/components/admin/CreateProjectDialog";

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

interface Project {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  user_id: string;
  client?: {
    full_name: string | null;
    email: string;
  };
  service?: {
    name: string;
  };
}

export default function Work() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
    loadProjects();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, appointment_id")
        .not("appointment_id", "is", null);

      if (projectsData) {
        const map: Record<string, string> = {};
        projectsData.forEach((p) => {
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
      setLoadingBookings(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, service:services(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projectsWithClients = await Promise.all(
        (data || []).map(async (project) => {
          let clientInfo = null;
          if (project.user_id) {
            const { data: clientData } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", project.user_id)
              .single();
            clientInfo = clientData;
          }
          return { ...project, client: clientInfo };
        })
      );

      setProjects(projectsWithClients);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
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

      toast({ title: "Success", description: "Booking deleted successfully" });
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

  const handleBookingStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;
      
      // If status changed to "confirmed", UPDATE the existing project (don't create new one)
      // The project was already created at purchase time by verify-payment/stripe-webhook
      if (newStatus === "confirmed" && projectMap[bookingId]) {
        const { error: projectError } = await supabase
          .from("projects")
          .update({ status: "active" })
          .eq("appointment_id", bookingId);

        if (projectError) {
          console.error("Error updating project:", projectError);
          toast({
            title: "Warning",
            description: "Booking confirmed but failed to update project status",
            variant: "destructive",
          });
        } else {
          toast({ title: "Success", description: "Booking confirmed and project activated" });
          loadProjects();
        }
      } else {
        toast({ title: "Success", description: "Booking status updated" });
      }
      
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
      toast({ title: "Success", description: "Project status updated" });
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
      case "pending": return 25;
      case "confirmed": return 50;
      case "completed": return 100;
      case "cancelled": return 0;
      default: return 0;
    }
  };

  const getBookingStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status.toLowerCase()) {
      case "confirmed": return "default";
      case "pending": return "secondary";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getProjectStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status.toLowerCase()) {
      case "in_progress":
      case "active": return "default";
      case "pending": return "secondary";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Filter out confirmed bookings that have projects (they've been converted)
  // Only show pending bookings or confirmed bookings without projects in Admin Work/Bookings
  const filteredBookings = bookings.filter((booking) => {
    // Hide confirmed bookings that have been converted to projects
    const isConvertedToProject = booking.status.toLowerCase() === "confirmed" && projectMap[booking.id];
    if (isConvertedToProject) return false;
    
    const matchesSearch =
      booking.full_name.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.phone.includes(bookingSearchTerm);
    const matchesStatus = bookingStatusFilter === "all" || booking.status.toLowerCase() === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      (project.title || project.name).toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      project.client?.full_name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      project.client?.email?.toLowerCase().includes(projectSearchTerm.toLowerCase());
    const matchesStatus = projectStatusFilter === "all" || project.status.toLowerCase() === projectStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Work</h2>
        <p className="text-muted-foreground">Manage bookings and projects</p>
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, email, or phone..."
                value={bookingSearchTerm}
                onChange={(e) => setBookingSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
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

          {loadingBookings ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {bookings.length === 0 ? "No bookings found" : "No bookings match your filters"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    {/* Client Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold truncate">{booking.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{booking.email}</span>
                        </div>
                      </div>
                      <Badge variant={getBookingStatusVariant(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(booking.appointment_date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.appointment_time}</span>
                      </div>
                    </div>

                    {/* Booking Status Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Booking Status</label>
                      <Select
                        value={booking.status}
                        onValueChange={(value) => handleBookingStatusChange(booking.id, value)}
                      >
                        <SelectTrigger className="w-full h-9">
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
                    </div>


                    {/* Project Status Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Project Status</label>
                      <Select
                        value={booking.project_status || "not_started"}
                        onValueChange={(value) => handleProjectStatusChange(booking.id, value)}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 pt-2 border-t">
                      {projectMap[booking.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/projects/${projectMap[booking.id]}`)}
                          title="Open Project"
                          className="text-primary"
                        >
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Project
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name, client..."
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>

          {loadingProjects ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {projects.length === 0 ? "No projects found" : "No projects match your filters"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    {/* Project Title & Service */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{project.title || project.name}</h3>
                        {project.service?.name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {project.service.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={getProjectStatusVariant(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>

                    {/* Client Info */}
                    {project.client && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{project.client.full_name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{project.client.email}</span>
                        </div>
                      </div>
                    )}


                    {/* Due Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Due: {project.due_date
                          ? format(new Date(project.due_date), "MMM d, yyyy")
                          : "Not set"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end pt-2 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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

      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        onSuccess={loadProjects}
      />
    </div>
  );
}
