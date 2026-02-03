import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Plus, Eye, EyeOff, GripVertical, Pencil, Trash2, 
  Building2, Globe, Bot, Workflow, FileText, Puzzle, Loader2
} from "lucide-react";
import { 
  useAdminCaseStudyProjects,
  useDeleteCaseStudyProject,
  useUpdateCaseStudyProject,
  useReorderCaseStudyProjects,
  useCaseStudiesSectionVisibility,
  useToggleCaseStudiesSection,
  type CaseStudyProject
} from "@/hooks/useCaseStudies";
import { CaseStudyProjectDialog } from "@/components/admin/CaseStudyProjectDialog";
import { CaseStudyModulesDialog } from "@/components/admin/CaseStudyModulesDialog";
import { toast } from "sonner";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const moduleTypeIcons: Record<string, React.ElementType> = {
  website: Globe,
  automation: Workflow,
  ai_agent: Bot,
  ai_content: FileText,
  integration: Puzzle,
  other: Building2,
};

const statusColors: Record<string, string> = {
  real_client: "bg-green-500/10 text-green-600 border-green-500/20",
  demo: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  internal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function SortableProjectRow({ 
  project, 
  onEdit, 
  onManageModules,
  onToggleVisibility,
  onToggleLanding,
  onDelete 
}: {
  project: CaseStudyProject;
  onEdit: () => void;
  onManageModules: () => void;
  onToggleVisibility: () => void;
  onToggleLanding: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium truncate">{project.client_name}</h3>
          <Badge variant="outline" className={statusColors[project.project_status]}>
            {project.project_status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{project.summary}</p>
        <p className="text-xs text-muted-foreground mt-1">Industry: {project.industry}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={project.visibility}
            onCheckedChange={onToggleVisibility}
            id={`visibility-${project.id}`}
          />
          <Label htmlFor={`visibility-${project.id}`} className="text-xs">
            {project.visibility ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={project.show_on_landing}
            onCheckedChange={onToggleLanding}
            id={`landing-${project.id}`}
            disabled={!project.visibility}
          />
          <Label htmlFor={`landing-${project.id}`} className="text-xs whitespace-nowrap">
            Landing
          </Label>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onManageModules}>
            <Puzzle className="h-4 w-4 mr-1" />
            Modules
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCaseStudies() {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CaseStudyProject | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useAdminCaseStudyProjects();
  const { data: sectionVisible = true } = useCaseStudiesSectionVisibility();
  const deleteProject = useDeleteCaseStudyProject();
  const updateProject = useUpdateCaseStudyProject();
  const reorderProjects = useReorderCaseStudyProjects();
  const toggleSection = useToggleCaseStudiesSection();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(projects, oldIndex, newIndex);
      
      reorderProjects.mutate(newOrder.map((p) => p.id), {
        onSuccess: () => toast.success("Order updated"),
        onError: () => toast.error("Failed to update order"),
      });
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setProjectDialogOpen(true);
  };

  const handleEditProject = (project: CaseStudyProject) => {
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const handleManageModules = (project: CaseStudyProject) => {
    setSelectedProject(project);
    setModulesDialogOpen(true);
  };

  const handleToggleVisibility = (project: CaseStudyProject) => {
    updateProject.mutate(
      { id: project.id, visibility: !project.visibility },
      {
        onSuccess: () => toast.success(`Project ${!project.visibility ? 'visible' : 'hidden'}`),
        onError: () => toast.error("Failed to update visibility"),
      }
    );
  };

  const handleToggleLanding = (project: CaseStudyProject) => {
    updateProject.mutate(
      { id: project.id, show_on_landing: !project.show_on_landing },
      {
        onSuccess: () => toast.success(`${!project.show_on_landing ? 'Added to' : 'Removed from'} landing page`),
        onError: () => toast.error("Failed to update"),
      }
    );
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      deleteProject.mutate(projectToDelete, {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        },
        onError: () => toast.error("Failed to delete project"),
      });
    }
  };

  const handleToggleSection = (checked: boolean) => {
    toggleSection.mutate(checked, {
      onSuccess: () => toast.success(`Case studies section ${checked ? 'enabled' : 'disabled'}`),
      onError: () => toast.error("Failed to update setting"),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects & Case Studies</h1>
            <p className="text-muted-foreground">
              Manage case studies shown on the landing page
            </p>
          </div>
          <Button onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Section Toggle */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="section-toggle" className="font-medium">
                  Show "Real Work & Case Studies" Section
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle visibility of the entire section on the landing page
                </p>
              </div>
              <Switch
                id="section-toggle"
                checked={sectionVisible}
                onCheckedChange={handleToggleSection}
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first case study project
                </p>
                <Button onClick={handleCreateProject}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projects.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <SortableProjectRow
                        key={project.id}
                        project={project}
                        onEdit={() => handleEditProject(project)}
                        onManageModules={() => handleManageModules(project)}
                        onToggleVisibility={() => handleToggleVisibility(project)}
                        onToggleLanding={() => handleToggleLanding(project)}
                        onDelete={() => handleDeleteClick(project.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Dialog */}
      <CaseStudyProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={selectedProject}
      />

      {/* Modules Dialog */}
      {selectedProject && (
        <CaseStudyModulesDialog
          open={modulesDialogOpen}
          onOpenChange={setModulesDialogOpen}
          project={selectedProject}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone
              and will also delete all associated modules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
