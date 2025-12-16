import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  MessageSquare,
  Package,
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
} from "lucide-react";
import { useProject } from "@/hooks/useProjects";
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
import ProjectFileUploadDialog from "@/components/portal/ProjectFileUploadDialog";
import { CreateTicketDialog } from "@/components/portal/CreateTicketDialog";

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

export default function ProjectDetailPage() {
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
    requestRevision,
    deleteFile,
  } = useProject(projectId);

  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; deliveryId: string | null }>({
    open: false,
    deliveryId: null,
  });
  const [revisionNotes, setRevisionNotes] = useState("");
  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const isCompleted = project?.status === "completed";

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    const success = await addComment(newComment.trim(), "client");
    if (success) {
      setNewComment("");
    }
    setSubmittingComment(false);
  };

  const handleRequestRevision = async () => {
    if (!revisionDialog.deliveryId || !revisionNotes.trim()) return;
    const success = await requestRevision(revisionDialog.deliveryId, revisionNotes.trim());
    if (success) {
      setRevisionDialog({ open: false, deliveryId: null });
      setRevisionNotes("");
    }
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
          <Button onClick={() => navigate("/client/projects")}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.title || project.name}</h1>
              <Badge variant={getStatusVariant(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            {project.service?.name && (
              <p className="text-muted-foreground">{project.service.name}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/client/tickets")}>
          <LifeBuoy className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Progress</p>
              <div className="flex items-center gap-3">
                <Progress value={project.progress || 0} className="flex-1 h-3" />
                <span className="font-semibold">{project.progress || 0}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Start Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {project.start_date
                    ? format(new Date(project.start_date), "MMM d, yyyy")
                    : "Not set"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Due Date</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {project.due_date
                    ? format(new Date(project.due_date), "MMM d, yyyy")
                    : "Not set"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <span className="font-medium">
                {format(new Date(project.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
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
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Project Milestones</CardTitle>
              <CardDescription>Track the progress of your project</CardDescription>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No milestones have been added yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
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
            <CardHeader>
              <CardTitle>Deliveries</CardTitle>
              <CardDescription>Review and approve project deliveries</CardDescription>
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
                        {!isCompleted && !delivery.revision_requested && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRevisionDialog({ open: true, deliveryId: delivery.id })
                            }
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Request Revision
                          </Button>
                        )}
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
                            <span className={file.uploader_role === "client" ? "text-primary" : "text-secondary-foreground"}>
                              {file.uploader_role === "client" ? "Client" : "Team"}
                            </span>
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
                        {file.uploader_id === user?.id && !isCompleted && (
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
                  : "Communicate with the team"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Comment Form */}
              {!isCompleted && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write a comment..."
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
                          Post Comment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Start the conversation!
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {comment.author_role === "client" ? "C" : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.author_role === "client" ? "You" : "Team"}
                          </span>
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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No invoices yet.</p>
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
                          {invoice.pdf_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {invoice.hosted_invoice_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={invoice.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
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

            {/* Tickets */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5" />
                  Support Tickets
                </CardTitle>
                {!isCompleted && projectId && (
                  <CreateTicketDialog
                    projectId={projectId}
                    projectName={project?.name}
                    onTicketCreated={refetch}
                    trigger={
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                      </Button>
                    }
                  />
                )}
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No tickets for this project.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        to={`/client/tickets/${ticket.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge>{ticket.status}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Revision Request Dialog */}
      <Dialog
        open={revisionDialog.open}
        onOpenChange={(open) => setRevisionDialog({ open, deliveryId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Please describe what changes you'd like to see in this delivery.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the changes needed..."
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevisionDialog({ open: false, deliveryId: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestRevision} disabled={!revisionNotes.trim()}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      {projectId && (
        <ProjectFileUploadDialog
          open={fileUploadOpen}
          onOpenChange={setFileUploadOpen}
          projectId={projectId}
          onUploadSuccess={refetch}
        />
      )}
    </div>
  );
}
