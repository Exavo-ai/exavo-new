import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Globe, Bot, Workflow, FileText, Puzzle, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCaseStudyModules,
  useDeleteCaseStudyModule,
  type CaseStudyProject,
  type CaseStudyModule,
} from "@/hooks/useCaseStudies";
import { CaseStudyModuleForm } from "@/components/admin/CaseStudyModuleForm";
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

const moduleTypeIcons: Record<string, React.ElementType> = {
  website: Globe,
  automation: Workflow,
  ai_agent: Bot,
  ai_content: FileText,
  integration: Puzzle,
  other: Building2,
};

const moduleTypeLabels: Record<string, string> = {
  website: "Website",
  automation: "Automation",
  ai_agent: "AI Agent",
  ai_content: "AI Content",
  integration: "Integration",
  other: "Other",
};

const deliveryTypeLabels: Record<string, string> = {
  live_ui: "Live UI",
  background_automation: "Background Automation",
  api: "API",
  internal_tool: "Internal Tool",
};

const statusColors: Record<string, string> = {
  live: "bg-green-500/10 text-green-600",
  testing: "bg-yellow-500/10 text-yellow-600",
  disabled: "bg-gray-500/10 text-gray-600",
};

interface CaseStudyModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CaseStudyProject;
}

export function CaseStudyModulesDialog({
  open,
  onOpenChange,
  project,
}: CaseStudyModulesDialogProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CaseStudyModule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);

  const { data: modules = [], isLoading } = useCaseStudyModules(project.id);
  const deleteModule = useDeleteCaseStudyModule();

  const handleAddModule = () => {
    setSelectedModule(null);
    setFormOpen(true);
  };

  const handleEditModule = (module: CaseStudyModule) => {
    setSelectedModule(module);
    setFormOpen(true);
  };

  const handleDeleteClick = (moduleId: string) => {
    setModuleToDelete(moduleId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (moduleToDelete) {
      deleteModule.mutate(
        { moduleId: moduleToDelete, projectId: project.id },
        {
          onSuccess: () => {
            toast.success("Module deleted");
            setDeleteDialogOpen(false);
            setModuleToDelete(null);
          },
          onError: () => toast.error("Failed to delete module"),
        }
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modules for "{project.client_name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddModule} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add modules to describe what was built
                </p>
                <Button onClick={handleAddModule} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Module
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module) => {
                  const Icon = moduleTypeIcons[module.module_type] || Building2;
                  return (
                    <Card key={module.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{module.title}</h4>
                              <Badge variant="outline" className={statusColors[module.status]}>
                                {module.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {module.description || "No description"}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="secondary">
                                {moduleTypeLabels[module.module_type]}
                              </Badge>
                              <Badge variant="outline">
                                {deliveryTypeLabels[module.delivery_type]}
                              </Badge>
                              {module.tech_stack?.slice(0, 3).map((tech) => (
                                <Badge key={tech} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                              {module.tech_stack?.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{module.tech_stack.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditModule(module)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(module.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Form Dialog */}
      <CaseStudyModuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={project.id}
        module={selectedModule}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this module? This action cannot be undone.
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
    </>
  );
}
