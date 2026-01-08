import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  MessageSquare,
  Receipt,
  LifeBuoy,
  Download,
  ExternalLink,
  Send,
  RotateCcw,
  AlertCircle,
  Upload,
  Trash2,
  Plus,
  User,
  Pencil,
} from "lucide-react";
import { useAdminProject } from "@/hooks/useAdminProjects";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminProjectFileUploadDialog from "@/components/admin/AdminProjectFileUploadDialog";
import AdminDeliveryDialog from "@/components/admin/AdminDeliveryDialog";
import AdminMilestoneDialog from "@/components/admin/AdminMilestoneDialog";
import { CreateTicketDialog } from "@/components/portal/CreateTicketDialog";
import type { Milestone } from "@/hooks/useAdminProjects";
import { cn } from "@/lib/utils";

const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (status.toLowerCase()) {
    case "in_progress":
    case "active":
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

const getStatusLabel = (status: string): string => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function AdminProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    project,
    milestones,
    comments,
    files,
    deliveries,
    invoices,
    tickets,
    loading,
    error,
    refetch,
    addComment,
    deleteFile,
    updateTicketStatus,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateProject,
  } = useAdminProject(projectId);

  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const isCompleted = project?.status === "completed";

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    const success = await addComment(newComment.trim(), "team");
    if (success) {
      setNewComment("");
    }
    setSubmittingComment(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-semibold">Project Not Found</p>
            <p className="text-muted-foreground">{error || "Unable to load project"}</p>
          </div>
          <Button onClick={() => navigate("/admin/work")}>Back to Work</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/work")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.title || project.name}</h1>
              <Badge variant={getStatusVariant(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                <User className="w-3 h-3 mr-1" />
                Admin View
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
              {project.service?.name && <span>{project.service.name}</span>}
              {project.client && (
                <>
                  <span>•</span>
                  <span>Client: {project.client.full_name || project.client.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Dates */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Start Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !project.start_date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {project.start_date
                      ? format(new Date(project.start_date), "MMM d, yyyy")
                      : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={project.start_date ? new Date(project.start_date) : undefined}
                    onSelect={(date) =>
                      updateProject({ start_date: date ? format(date, "yyyy-MM-dd") : null })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Due Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !project.due_date && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {project.due_date
                      ? format(new Date(project.due_date), "MMM d, yyyy")
                      : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={project.due_date ? new Date(project.due_date) : undefined}
                    onSelect={(date) =>
                      updateProject({ due_date: date ? format(date, "yyyy-MM-dd") : null })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Created</p>
              <div className="h-10 flex items-center">
                <span className="font-medium">
                  {format(new Date(project.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {project.description || "No description provided."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Milestones</span>
                  <span className="font-medium">
                    {milestones.filter((m) => m.status === "completed").length} / {milestones.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deliveries</span>
                  <span className="font-medium">{deliveries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Files</span>
                  <span className="font-medium">{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comments</span>
                  <span className="font-medium">{comments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Notes Card - Read only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Client Notes
              </CardTitle>
              <CardDescription>Requirements submitted during checkout</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {project.client_notes || "No notes provided."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Project Milestones</CardTitle>
                <CardDescription>Track and manage project progress</CardDescription>
              </div>
              {!isCompleted && (
                <Button onClick={() => {
                  setEditingMilestone(null);
                  setMilestoneDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No milestones have been added yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="mt-1">
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{milestone.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                milestone.status === "completed"
                                  ? "default"
                                  : milestone.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {getStatusLabel(milestone.status)}
                            </Badge>
                            {!isCompleted && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMilestone(milestone);
                                    setMilestoneDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteMilestone(milestone.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.description}
                          </p>
                        )}
                        {milestone.due_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {format(new Date(milestone.due_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Deliveries</CardTitle>
                <CardDescription>Submit and manage project deliveries</CardDescription>
              </div>
              {!isCompleted && (
                <Button onClick={() => setDeliveryDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Delivery
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No deliveries have been submitted yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {deliveries.map((delivery) => (
                    <div key={delivery.id} className="p-4 rounded-lg border space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(delivery.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {delivery.revision_requested && (
                            <Badge variant="destructive" className="mt-1">
                              Revision Requested
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p>{delivery.message}</p>
                      {delivery.revision_notes && (
                        <div className="p-3 bg-destructive/10 rounded-md">
                          <p className="text-sm font-medium text-destructive">Revision Notes:</p>
                          <p className="text-sm">{delivery.revision_notes}</p>
                        </div>
                      )}
                      {delivery.files && delivery.files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {delivery.files.map((file: any, i: number) => (
                            <Button key={i} variant="outline" size="sm" asChild>
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                {file.name || `File ${i + 1}`}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Project Files</CardTitle>
                <CardDescription>All files associated with this project</CardDescription>
              </div>
              {!isCompleted && (
                <Button onClick={() => setFileUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No files have been uploaded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">
                              {file.uploader?.full_name || file.uploader?.email || "Unknown"}
                            </span>
                            {" • "}
                            <Badge variant={file.uploader_role === "client" ? "secondary" : "default"} className="text-xs py-0 px-1">
                              {file.uploader_role === "client" ? "Client" : "Team"}
                            </Badge>
                            {" • "}
                            {format(new Date(file.created_at), "MMM d, yyyy")}
                            {file.file_size && ` • ${(file.file_size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.file_path} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        {!isCompleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteFile(file.id, file.file_path)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>
                {isCompleted
                  ? "This project is completed. Comments are view-only."
                  : "Communicate with the client"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Comment Form */}
              {!isCompleted && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write a comment as Team..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePostComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        "Posting..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Post as Team
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={comment.author_role === "team" ? "bg-primary text-primary-foreground" : ""}>
                          {comment.author_role === "client" ? "C" : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.author_role === "client" ? "Client" : "Team"}
                          </span>
                          <Badge variant={comment.author_role === "team" ? "default" : "secondary"} className="text-xs py-0 px-1">
                            {comment.author_role === "team" ? "Team" : "Client"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>Manage tickets for this project</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tickets for this project.
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <Link
                          to={`/admin/tickets`}
                          className="font-medium hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{ticket.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Invoices
              </CardTitle>
              <CardDescription>Payment history for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices yet.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">
                          {invoice.currency} {invoice.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {invoice.status}
                        </Badge>
                        {(invoice.pdf_url || invoice.hosted_invoice_url || (invoice as any).stripe_receipt_url) && (
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={(invoice as any).stripe_receipt_url || invoice.pdf_url || invoice.hosted_invoice_url || "#"} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View Receipt
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Upload Dialog */}
      {projectId && (
        <AdminProjectFileUploadDialog
          open={fileUploadOpen}
          onOpenChange={setFileUploadOpen}
          projectId={projectId}
          onUploadSuccess={refetch}
        />
      )}

      {/* Delivery Dialog */}
      {projectId && (
        <AdminDeliveryDialog
          open={deliveryDialogOpen}
          onOpenChange={setDeliveryDialogOpen}
          projectId={projectId}
          onSuccess={refetch}
        />
      )}

      {/* Milestone Dialog */}
      {projectId && (
        <AdminMilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={(open) => {
            setMilestoneDialogOpen(open);
            if (!open) setEditingMilestone(null);
          }}
          projectId={projectId}
          milestone={editingMilestone}
          onSave={async (data) => {
            if (editingMilestone) {
              return updateMilestone(editingMilestone.id, data);
            }
            return createMilestone(data);
          }}
          nextOrderIndex={milestones.length}
        />
      )}
    </div>
  );
}
